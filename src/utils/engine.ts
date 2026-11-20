import {
  CandidateLocation,
  BusinessCategory,
  FinancialMetrics,
  RiskEvaluation,
  RiskRuleResult,
  ScoreBreakdown,
  DecisionVerdict,
  RegionConversionType,
  DueDiligenceItem,
} from '../types/decision';

// 상가임대차보호법 지역별 환산보증금 기준 (만원 단위)
export const CONVERSION_DEPOSIT_LIMITS: Record<RegionConversionType, { limit: number; label: string }> = {
  seoul: { limit: 90000, label: '서울특별시 (9억원 이하)' },
  overcrowded_busan: { limit: 69000, label: '과밀억제권역 및 부산광역시 (6.9억원 이하)' },
  metropolitan: { limit: 54000, label: '광역시·세종·수도권 주요도시 (5.4억원 이하)' },
  other: { limit: 37000, label: '그 밖의 지역 (3.7억원 이하)' },
};

// 업종별 법정 필요 건축물 용도 매핑
export const BUSINESS_REQUIRED_BUILDING_USE: Record<string, string> = {
  cafe: '휴게음식점 (제1종 또는 제2종 근린생활시설)',
  bakery: '제과점영업 (제1종 또는 제2종 근린생활시설)',
  snack: '휴게음식점 또는 일반음식점 (제1·2종 근생)',
  restaurant: '일반음식점 (제2종 근린생활시설)',
  pub: '일반음식점 또는 단란/유흥주점 (제2종 근생/위락시설)',
  retail: '소매점 (제1종 근린생활시설 또는 판매시설)',
  beauty: '이용원·미용원 (제1종 근린생활시설)',
  entertainment: '컴퓨터게임제공업·노래연습장 (제2종 근린생활시설)',
  fitness: '체력단련장 (제2종 근린생활시설 또는 운동시설)',
};

export const DEFAULT_DUE_DILIGENCE_ITEMS: Omit<DueDiligenceItem, 'status' | 'sourceNote' | 'memo'>[] = [
  {
    key: 'building',
    label: '건축물 용도·위반 여부',
    description: '건축물대장 원본(표제부·전유부)의 용도와 위반건축물 표기, 업종 적합성을 확인합니다.',
  },
  {
    key: 'zoning',
    label: '토지이용계획·입지 제한',
    description: '토지이용계획확인서(토지e음)와 해당 지자체 도시계획조례상 입지 제한을 확인합니다.',
  },
  {
    key: 'permit',
    label: '업종 인허가·소방·위생·정화구역',
    description: '관할 구청 위생·건축과, 소방서 완비증명, 교육환경보호구역(GIS) 심의 여부를 확인합니다.',
  },
  {
    key: 'facility',
    label: '층수·면적·설비 조건',
    description: '실제 사용 호실의 전용면적, 승강기·주차, 전력용량·급배수·덕트·정화조 용량을 확인합니다.',
  },
  {
    key: 'lease',
    label: '임대차·보증금·권리관계',
    description: '등기사항전부증명서(근저당/압류), 임대인 권한, 환산보증금, 특약사항을 확인합니다.',
  },
];

export function getCandidateDueDiligence(candidate: CandidateLocation): DueDiligenceItem[] {
  const existingMap = new Map(
    (candidate.dueDiligence || []).map((item) => [item.key, item])
  );
  return DEFAULT_DUE_DILIGENCE_ITEMS.map((base) => {
    const existing = existingMap.get(base.key);
    return {
      key: base.key,
      label: base.label,
      description: base.description,
      status: existing?.status || 'unverified',
      sourceNote: existing?.sourceNote || '',
      memo: existing?.memo || '',
    };
  });
}

/**
 * 01 TOP-LINE & 02 BOTTOM-LINE 재무 지표 계산 함수
 */
export function calculateFinancialMetrics(candidate: CandidateLocation): FinancialMetrics {
  // 1. 월 매출 S (공급가액 기준, 부가세 포함 시 / 1.1)
  const monthlyRevenue = candidate.isVatIncluded
    ? candidate.grossRevenue / 1.1
    : candidate.grossRevenue;

  // 2. 변동비율 v (사용자 커스텀 변동비율 포함)
  const customCosts = candidate.customCosts || [];
  const customFixedCostTotal = customCosts
    .filter((item) => item.costType === 'fixed')
    .reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0);
  const customVariableRateTotal = customCosts
    .filter((item) => item.costType === 'variable_rate')
    .reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0) / 100, 0);

  const cogRate = (candidate.costOfGoodsRate || 0) / 100;
  const otherVarRate = (candidate.otherVariableRate || 0) / 100;
  const cardFeeComponent = ((candidate.cardRatio || 0) / 100) * ((candidate.cardFeeRate || 0) / 100);
  const deliveryFeeComponent = ((candidate.deliveryRatio || 0) / 100) * ((candidate.deliveryFeeRate || 0) / 100);

  const variableCostRate = Math.min(
    0.95,
    cogRate + otherVarRate + cardFeeComponent + deliveryFeeComponent + customVariableRateTotal
  );
  const customVariableCostTotal = monthlyRevenue * customVariableRateTotal;
  const totalVariableCost = monthlyRevenue * variableCostRate;

  // 3. 인건비 (월 기준)
  // 인원(풀타임 환산) × 시급 × 209시간 × (1 + 4대보험 부담률)
  const socialIns = 1 + (candidate.socialInsuranceRate || 10.5) / 100;
  const monthlyStaffLaborWon = candidate.fullTimeStaff * (candidate.hourlyWage || 10030) * 209 * socialIns;
  const laborCost = monthlyStaffLaborWon / 10000; // 만원 단위

  // 4. 감가상각비 (인테리어 + 설비·집기) ÷ 배분기간
  const depreciationMonths = candidate.depreciationMonths || 60;
  const totalCapex = (candidate.interiorCost || 0) + (candidate.equipmentCost || 0);
  const monthlyDepreciation = totalCapex > 0 ? totalCapex / depreciationMonths : 0;

  // 5. 임대료 + 관리비 & 세분화 운영 고정비 (공과금, 세무비용, 홍보·마케팅, 기타)
  const monthlyRentAndMaintenance = (candidate.monthlyRent || 0) + (candidate.maintenanceFee || 0);

  const utilityCostTotal = candidate.utilityBreakdown
    ? (candidate.utilityBreakdown.electricity || 0) +
      (candidate.utilityBreakdown.water || 0) +
      (candidate.utilityBreakdown.gas || 0) +
      (candidate.utilityBreakdown.internetPos || 0)
    : candidate.utilityCost || 0;

  const taxCostTotal = candidate.taxBreakdown
    ? (candidate.taxBreakdown.bookkeepingFee || 0) +
      (candidate.taxBreakdown.taxFilingReserve || 0) +
      (candidate.taxBreakdown.localTaxAndInsurance || 0)
    : candidate.taxCost || 0;

  const marketingCostTotal = candidate.marketingBreakdown
    ? (candidate.marketingBreakdown.onlineAds || 0) +
      (candidate.marketingBreakdown.deliveryPromotion || 0) +
      (candidate.marketingBreakdown.offlineEvent || 0)
    : candidate.marketingCost || 0;

  const otherFixedCostTotal = candidate.otherFixedCost || 0;

  const utilityAndOtherFixedCost =
    utilityCostTotal + taxCostTotal + marketingCostTotal + otherFixedCostTotal;

  // 6. 고정비 F & 월 총비용
  const totalFixedCost =
    laborCost +
    monthlyRentAndMaintenance +
    utilityAndOtherFixedCost +
    customFixedCostTotal +
    monthlyDepreciation +
    (candidate.ownerSalary || 0);
  const totalMonthlyCost = totalVariableCost + totalFixedCost;

  // 7. 월 영업이익 & 현금흐름
  const monthlyOperatingProfit = monthlyRevenue - totalMonthlyCost;
  const monthlyCashFlow = monthlyOperatingProfit + monthlyDepreciation;
  const operatingProfitMargin = monthlyRevenue > 0 ? monthlyOperatingProfit / monthlyRevenue : 0;

  // 8. 손익분기(BEP) 매출
  const contributionMarginRate = 1 - variableCostRate;
  const breakEvenRevenue = contributionMarginRate > 0 ? totalFixedCost / contributionMarginRate : 0;

  // 9. 안전여유율
  const marginOfSafety = monthlyRevenue > 0 ? (monthlyRevenue - breakEvenRevenue) / monthlyRevenue : 0;

  // 10. 임대료 부담률
  const rentBurdenRate = monthlyRevenue > 0 ? monthlyRentAndMaintenance / monthlyRevenue : 0;

  // 11. 중개보수 (상가 0.9% 상한)
  const baseRentSum = (candidate.deposit || 0) + (candidate.monthlyRent || 0) * 100;
  const effectiveBase = baseRentSum < 5000
    ? (candidate.deposit || 0) + (candidate.monthlyRent || 0) * 70
    : baseRentSum;
  const brokerageFee = effectiveBase * 0.009;

  // 12. 초기 투자금 & 총 필요자금
  const initialInvestment =
    (candidate.premium || 0) +
    totalCapex +
    brokerageFee +
    (candidate.otherInitialCost || 0);
  const totalCashRequired =
    initialInvestment +
    (candidate.deposit || 0) +
    (candidate.workingCapital || 0);

  // 13. 회수기간 (기본 순투자 회수 vs 보증금·운전자금 포함 총현금 회수)
  let paybackPeriodMonths = 999;
  if (monthlyCashFlow > 0 && initialInvestment > 0) {
    paybackPeriodMonths = initialInvestment / monthlyCashFlow;
  } else if (initialInvestment <= 0) {
    paybackPeriodMonths = 0;
  }

  let totalPaybackPeriodMonths = 999;
  if (monthlyCashFlow > 0 && totalCashRequired > 0) {
    totalPaybackPeriodMonths = totalCashRequired / monthlyCashFlow;
  } else if (totalCashRequired <= 0) {
    totalPaybackPeriodMonths = 0;
  }

  // 14. 연 투자수익률 (ROI)
  const annualRoi = initialInvestment > 0 ? (monthlyOperatingProfit * 12) / initialInvestment : 0;

  // 15. 단위면적 지표
  const areaPyeong = candidate.areaSqm > 0 ? candidate.areaSqm * 0.3025 : 0;
  const rentPerPyeong = areaPyeong > 0 ? monthlyRentAndMaintenance / areaPyeong : 0;
  const annualRentTotal = monthlyRentAndMaintenance * 12;

  return {
    monthlyRevenue,
    variableCostRate,
    totalVariableCost,
    laborCost,
    monthlyDepreciation,
    monthlyRentAndMaintenance,
    utilityCostTotal,
    taxCostTotal,
    marketingCostTotal,
    otherFixedCostTotal,
    customFixedCostTotal,
    customVariableCostTotal,
    customVariableRateTotal,
    utilityAndOtherFixedCost,
    totalFixedCost,
    totalMonthlyCost,
    monthlyOperatingProfit,
    monthlyCashFlow,
    operatingProfitMargin,
    breakEvenRevenue,
    marginOfSafety,
    rentBurdenRate,
    brokerageFee,
    initialInvestment,
    totalCashRequired,
    paybackPeriodMonths,
    totalPaybackPeriodMonths,
    annualRoi,
    areaPyeong,
    rentPerPyeong,
    annualRentTotal,
  };
}

export interface RevenueScenarioRow {
  label: string;
  deltaPercent: number;
  grossRevenue: number;
  monthlyRevenue: number;
  monthlyOperatingProfit: number;
  monthlyCashFlow: number;
  operatingProfitMargin: number;
  paybackPeriodMonths: number;
}

/**
 * 매출 가정 변화에 따른 손익·회수기간 민감도 시뮬레이션 (PropScope 비교 시나리오 보완)
 */
export function simulateRevenueSensitivity(candidate: CandidateLocation): RevenueScenarioRow[] {
  const scenarios = [
    { label: '보수적 (-30%)', deltaPercent: -30 },
    { label: '하락 (-15%)', deltaPercent: -15 },
    { label: '현재 가정 (기준)', deltaPercent: 0 },
    { label: '성장 (+15%)', deltaPercent: 15 },
    { label: '호황 (+30%)', deltaPercent: 30 },
  ];

  return scenarios.map((sc) => {
    const adjustedGross = Math.round(candidate.grossRevenue * (1 + sc.deltaPercent / 100));
    const m = calculateFinancialMetrics({
      ...candidate,
      grossRevenue: adjustedGross,
    });
    return {
      label: sc.label,
      deltaPercent: sc.deltaPercent,
      grossRevenue: adjustedGross,
      monthlyRevenue: m.monthlyRevenue,
      monthlyOperatingProfit: m.monthlyOperatingProfit,
      monthlyCashFlow: m.monthlyCashFlow,
      operatingProfitMargin: m.operatingProfitMargin,
      paybackPeriodMonths: m.paybackPeriodMonths,
    };
  });
}

export interface CostSensitivityRow {
  id: string;
  factor: 'base' | 'rent' | 'labor' | 'both';
  label: string;
  deltaPercent: number;
  costDeltaAmount: number; // 기준 대비 비용 증감액 (+면 비용 증가, -면 비용 절감)
  monthlyOperatingProfit: number;
  profitDelta: number; // 기준 대비 영업이익 증감액
  operatingProfitMargin: number;
  paybackPeriodMonths: number;
}

/**
 * 임대료(월세) · 인건비 ±10% 변동에 따른 영업이익 민감도 분석
 */
export function simulateCostSensitivity(
  candidate: CandidateLocation,
  stepPercent: number = 10
): CostSensitivityRow[] {
  const base = calculateFinancialMetrics(candidate);
  const up = 1 + stepPercent / 100;
  const down = 1 - stepPercent / 100;

  const configs: Array<{
    id: string;
    factor: CostSensitivityRow['factor'];
    label: string;
    deltaPercent: number;
    override: Partial<CandidateLocation>;
  }> = [
    {
      id: 'rent_down',
      factor: 'rent',
      label: `임대료 -${stepPercent}%`,
      deltaPercent: -stepPercent,
      override: { monthlyRent: candidate.monthlyRent * down },
    },
    {
      id: 'rent_up',
      factor: 'rent',
      label: `임대료 +${stepPercent}%`,
      deltaPercent: stepPercent,
      override: { monthlyRent: candidate.monthlyRent * up },
    },
    {
      id: 'labor_down',
      factor: 'labor',
      label: `인건비 -${stepPercent}%`,
      deltaPercent: -stepPercent,
      override: { fullTimeStaff: candidate.fullTimeStaff * down },
    },
    {
      id: 'labor_up',
      factor: 'labor',
      label: `인건비 +${stepPercent}%`,
      deltaPercent: stepPercent,
      override: { fullTimeStaff: candidate.fullTimeStaff * up },
    },
    {
      id: 'both_down',
      factor: 'both',
      label: `동시 -${stepPercent}%`,
      deltaPercent: -stepPercent,
      override: {
        monthlyRent: candidate.monthlyRent * down,
        fullTimeStaff: candidate.fullTimeStaff * down,
      },
    },
    {
      id: 'both_up',
      factor: 'both',
      label: `동시 +${stepPercent}%`,
      deltaPercent: stepPercent,
      override: {
        monthlyRent: candidate.monthlyRent * up,
        fullTimeStaff: candidate.fullTimeStaff * up,
      },
    },
  ];

  return configs.map((cfg) => {
    const m = calculateFinancialMetrics({
      ...candidate,
      ...cfg.override,
    });
    const profitDelta = m.monthlyOperatingProfit - base.monthlyOperatingProfit;
    return {
      id: cfg.id,
      factor: cfg.factor,
      label: cfg.label,
      deltaPercent: cfg.deltaPercent,
      costDeltaAmount: -profitDelta,
      monthlyOperatingProfit: m.monthlyOperatingProfit,
      profitDelta,
      operatingProfitMargin: m.operatingProfitMargin,
      paybackPeriodMonths: m.paybackPeriodMonths,
    };
  });
}

export interface SpecialContractClause {
  id: string;
  priority: '필수' | '권고';
  category: string;
  title: string;
  clauseText: string;
  reason: string;
}

/**
 * 후보지 리스크 및 임대조건 기반 계약 시 필수 특약 자동 생성기
 */
export function generateSpecialContractClauses(
  candidate: CandidateLocation,
  riskEval: RiskEvaluation,
  metrics: FinancialMetrics
): SpecialContractClause[] {
  const clauses: SpecialContractClause[] = [];

  if (riskEval.r2.status === 'BLOCK' || candidate.hasViolation) {
    clauses.push({
      id: 'clause-r2',
      priority: '필수',
      category: '위반건축물 해소',
      title: '위반건축물 시정 및 인허가 불발 시 계약 무효 특약',
      clauseText:
        '임대인은 잔금 지급일 전까지 건축물대장상 위반건축물 등재 사항을 적법하게 원상복구 및 말소 처리하기로 하며, 이를 이행하지 못하거나 관할 관청의 영업신고(허가)가 반려될 경우 본 계약은 별도의 위약금 없이 즉시 해지되고 임대인은 기지급 계약금 전액을 즉시 반환한다.',
      reason: '위반건축물 등재 상태에서 계약 진행 시 영업신고 거부 및 이행강제금 분쟁 위험 차단',
    });
  }

  if (riskEval.r1.status === 'CONDITIONAL' || riskEval.r1.status === 'RECOMMEND_CHECK') {
    clauses.push({
      id: 'clause-r1',
      priority: '필수',
      category: '건축물 용도변경',
      title: '근린생활시설 용도변경 및 정화조 협조 특약',
      clauseText: `본 점포의 건축물대장상 용도를 임차인의 영위 업종(${candidate.businessName})에 적합한 근린생활시설로 변경(기재변경 포함)하는 데 임대인은 제반 서류 제공 등 적극 협조하며, 용도변경 및 영업인허가 불허 시 본 계약은 위약금 없이 해제한다.`,
      reason: `대장상 현재 용도(${candidate.buildingUse})와 희망 업종 간 인허가 불일치 리스크 해소`,
    });
  }

  if (riskEval.r4.status === 'CONDITIONAL' || riskEval.r4.status === 'BLOCK') {
    clauses.push({
      id: 'clause-r4',
      priority: '필수',
      category: '교육환경보호구역',
      title: '교육환경보호위원회 심의 통과 조건부 효력 특약',
      clauseText:
        '본 임대차 계약은 관할 교육지원청 교육환경보호위원회의 금지행위 및 시설 제외(해제) 심의 승인을 정지조건으로 하며, 심의 불승인 확정 시 임차인은 위약금 없이 계약을 해제하고 임대인은 수령한 계약금·보증금 전액을 지체 없이 반환한다.',
      reason: '학교·유치원 상대보호구역 내 업종 제한 심의 부결 시 계약금 매몰 방지',
    });
  }

  if (riskEval.r5.status === 'CONDITIONAL') {
    clauses.push({
      id: 'clause-r5',
      priority: '필수',
      category: '다중이용업소 소방',
      title: '소방안전시설 완비증명서 발급 요건 확인 특약',
      clauseText:
        '임대인은 다중이용업소 안전시설등 완비증명서 발급에 필요한 건물 공용부 피난·방화시설(직통계단, 방화문, 주출입구 등) 유지에 협조하며, 건물 구조적 결함으로 소방 완비증명 발급이 불가한 경우 계약을 해제하고 보증금을 전액 반환한다.',
      reason: `${candidate.floor}층 ${candidate.areaSqm}㎡ 규모 영업장의 다중이용업소법 적용 대비`,
    });
  }

  if (riskEval.r6.status === 'CONDITIONAL') {
    clauses.push({
      id: 'clause-r6',
      priority: '필수',
      category: '환산보증금 초과 방어',
      title: '임대료 증액 상한(연 5%) 약정 특약',
      clauseText:
        '본 계약은 상가건물 임대차보호법상 환산보증금 기준을 초과하나, 당사자 합의에 의해 계약 갱신 시 보증금 및 차임(월세) 인상률은 상가임대차보호법 시행령 기준(연 5% 이내)을 초과할 수 없기로 약정한다.',
      reason: '환산보증금 초과로 배제되는 법정 차임증액 상한 보호장치를 당사자 약정으로 복원',
    });
  }

  // 기본 핵심 특약 (렌트프리 / 원상복구 범위 / 시설권리)
  if (metrics.rentBurdenRate > 0.14 || clauses.length < 3) {
    clauses.push({
      id: 'clause-rentfree',
      priority: '권고',
      category: '공사기간 렌트프리',
      title: '인테리어 공사기간 차임 면제(Rent-Free) 특약',
      clauseText:
        '인테리어 및 설비 공사 기간(계약 개시일로부터 OO일간) 동안의 월 차임은 면제(관리비 실비만 정산)하며, 임대차 계약기간 기산일은 실제 영업 개시일 또는 공사 종료 익일로 정한다.',
      reason: '초기 인테리어 공사 중 고정 임대료 지출을 절감하여 초기 자금 압박 완화',
    });
  }

  if (clauses.length < 3) {
    clauses.push({
      id: 'clause-restoration',
      priority: '권고',
      category: '원상복구 범위 명확화',
      title: '임대차 종료 시 원상복구 범위 특정 특약',
      clauseText:
        '계약 체결 당시의 현황 사진 및 시설 목록을 계약서에 첨부하며, 계약 종료 시 임차인의 원상복구 의무는 임차인이 신규 설치한 시설물에 한하며 현 상태(인수 당시 기존 시설물) 기준의 통상적 마모·노후는 원상복구 대상에서 제외한다.',
      reason: '퇴거 시 과도한 철거 비용 청구 및 보증금 반환 지연 분쟁 예방',
    });
  }

  if (clauses.length < 3) {
    clauses.push({
      id: 'clause-mortgage',
      priority: '권고',
      category: '권리관계 유지',
      title: '잔금일 익일까지 권리변동 금지 및 등기 유지 특약',
      clauseText:
        '임대인은 계약일로부터 임차인의 사업자등록·확정일자 부여 및 점유 개시 다음 날까지 본 목적물에 추가 근저당권, 가압류 등 일체의 제한물권을 설정하지 않기로 하며, 위반 시 임차인은 즉시 계약을 해지하고 손해배상을 청구할 수 있다.',
      reason: '잔금 납부 및 대항력 취득 공백기 동안 임대인의 추가 담보 설정 위험 차단',
    });
  }

  return clauses;
}

/**
 * 03 RISK 6대 리스크 룰 평가 함수
 */
export function evaluateRiskRules(candidate: CandidateLocation): RiskEvaluation {
  let hasBlockingRisk = false;
  let hasConditionalRisk = false;
  let totalPenalty = 0;

  // R1: 건축물 용도
  let r1Status: RiskRuleResult['status'] = 'PASS';
  let r1StatusText = '통과: 건축물 용도 일치';
  let r1Detail = `선택 업종(${candidate.businessName})의 필요 용도와 대장상 용도(${candidate.buildingUse})가 부합합니다.`;
  let r1Penalty = 0;

  if (candidate.buildingUse === '기타' || candidate.buildingUse === '업무시설') {
    r1Status = 'CONDITIONAL';
    r1StatusText = '조건부: 시설군 상이 (용도변경 필요)';
    r1Detail = `대장상 '${candidate.buildingUse}'은 상업 영업을 위해 근린생활시설로의 건축물 용도변경(허가/신고) 절차가 선행되어야 합니다.`;
    r1Penalty = 4;
    hasConditionalRisk = true;
  } else if (
    (candidate.businessType === 'restaurant' || candidate.businessType === 'pub') &&
    candidate.buildingUse === '제1종근린생활시설'
  ) {
    r1Status = 'RECOMMEND_CHECK';
    r1StatusText = '확인 권장: 1종→2종 근생 기재변경';
    r1Detail = '일반음식점 및 주점은 제2종 근린생활시설이어야 합니다. 동일 시설군 내 기재내용 변경신고 가능 여부를 확인하세요.';
    r1Penalty = 2;
  } else if (candidate.businessType === 'pub' && candidate.buildingUse !== '제2종근린생활시설' && candidate.buildingUse !== '위락시설') {
    r1Status = 'CONDITIONAL';
    r1StatusText = '조건부: 용도 확인 필요';
    r1Detail = '주류 위주의 주점업은 제2종 근린생활시설(일반음식점) 또는 위락시설 규정을 충족해야 합니다.';
    r1Penalty = 3;
    hasConditionalRisk = true;
  }

  const r1: RiskRuleResult = {
    code: 'R1',
    name: '건축물 용도 적합성',
    status: r1Status,
    statusText: r1StatusText,
    detail: r1Detail,
    legalBasis: '건축법 제19조(용도변경), 건축법 시행령 제14조 및 별표1',
    dataSource: '건축행정시스템 세움터(건축HUB) 건축물대장',
    actionGuide: '관할 시·군·구청 건축과에 해당 호실의 근린생활시설 용도변경 적법성 및 정화조 용량을 사전 확인하십시오.',
    penaltyPoints: r1Penalty,
  };

  // R2: 위반건축물
  let r2Status: RiskRuleResult['status'] = 'PASS';
  let r2StatusText = '통과: 위반건축물 미등재';
  let r2Detail = '건축물대장상 위반건축물 표기(위법 증축, 무단 용도변경 등)가 없습니다.';
  let r2Penalty = 0;

  if (candidate.hasViolation) {
    r2Status = 'BLOCK';
    r2StatusText = '차단: 위반건축물 등재 매물';
    r2Detail = '건축물대장에 위반건축물 노란색 마크가 등재되어 있어, 지자체 신규 영업신고증 및 사업자등록 발급이 원칙적으로 불가합니다.';
    r2Penalty = 15;
    hasBlockingRisk = true;
  }

  const r2: RiskRuleResult = {
    code: 'R2',
    name: '위반건축물 여부',
    status: r2Status,
    statusText: r2StatusText,
    detail: r2Detail,
    legalBasis: '건축법 제79조(위반건축물에 대한 조치), 제80조(이행강제금), 식품위생법 제37조',
    dataSource: '정부24 건축물대장 갑구 표제부·전유부 발급본',
    actionGuide: candidate.hasViolation
      ? '임대인이 관할 구청에 위반사항을 원상복구하고 대장상 위반 해제 처리를 완료하기 전까지 계약을 전면 보류하십시오.'
      : '계약 전 최종 잔금일 당일에도 정부24에서 건축물대장을 재열람하여 실시간 위반 등재 여부를 재확인하십시오.',
    penaltyPoints: r2Penalty,
  };

  // R3: 용도지역
  let r3Status: RiskRuleResult['status'] = 'PASS';
  let r3StatusText = '통과: 용도지역 내 행위허용';
  let r3Detail = `선택된 용도지역(${candidate.zoning})에서 해당 업종의 입점이 국토계획법상 허용됩니다.`;
  let r3Penalty = 0;

  if (candidate.zoning === '전용주거지역' || candidate.zoning === '자연녹지지역') {
    if (candidate.businessType === 'pub' || candidate.businessType === 'entertainment') {
      r3Status = 'BLOCK';
      r3StatusText = '차단: 주거·녹지지역 내 불허 업종';
      r3Detail = `${candidate.zoning}에서는 주점 및 오락·엔터테인먼트 시설의 입점이 법적으로 금지됩니다.`;
      r3Penalty = 15;
      hasBlockingRisk = true;
    } else if (candidate.businessType === 'restaurant') {
      r3Status = 'CONDITIONAL';
      r3StatusText = '조건부: 조례 제한 확인 필요';
      r3Detail = '전용주거지역 내 일반음식점은 지자체 도시계획조례에 따라 엄격히 제한될 수 있습니다.';
      r3Penalty = 4;
      hasConditionalRisk = true;
    }
  } else if (candidate.zoning === '제1종일반주거지역') {
    if (candidate.businessType === 'pub' || candidate.businessType === 'entertainment') {
      r3Status = 'CONDITIONAL';
      r3StatusText = '조건부: 지자체 조례 위임 검토';
      r3Detail = '제1종 일반주거지역은 지자체 조례에 따라 주점 및 유흥업종 진입이 제한될 수 있습니다.';
      r3Penalty = 3;
      hasConditionalRisk = true;
    }
  }

  const r3: RiskRuleResult = {
    code: 'R3',
    name: '국토계획법 용도지역 적합성',
    status: r3Status,
    statusText: r3StatusText,
    detail: r3Detail,
    legalBasis: '국토의 계획 및 이용에 관한 법률 시행령 제71조 및 별표 2~22',
    dataSource: '토지e음(토지이용계획확인서) 용도지역·지구 행위제한 열람',
    actionGuide: '토지이용계획확인서 열람 후 해당 시·군 도시계획조례의 업종별 건축 제한 조항을 검토하십시오.',
    penaltyPoints: r3Penalty,
  };

  // R4: 교육환경보호구역
  let r4Status: RiskRuleResult['status'] = 'PASS';
  let r4StatusText = '통과: 교육환경 저촉 없음';
  let r4Detail = '교육환경보호구역에 해당하지 않거나, 해당 업종이 학교정화구역 제한 대상이 아닙니다.';
  let r4Penalty = 0;

  const restrictedTypes: BusinessCategory[] = ['pub', 'entertainment'];
  if (restrictedTypes.includes(candidate.businessType)) {
    if (candidate.schoolZone === 'absolute') {
      r4Status = 'BLOCK';
      r4StatusText = '차단: 절대보호구역(50m) 내 금지 업종';
      r4Detail = '학교 출입문 50m 이내 절대보호구역에서는 유흥·단란·노래연습장·PC방 등의 영업이 법률상 절대 불허됩니다.';
      r4Penalty = 15;
      hasBlockingRisk = true;
    } else if (candidate.schoolZone === 'relative') {
      r4Status = 'CONDITIONAL';
      r4StatusText = '조건부: 상대보호구역(200m) 심의 대상';
      r4Detail = '학교 경계 200m 이내 상대보호구역으로, 관할 교육지원청 교육환경보호위원회의 사전 해제 심의를 통과해야 합니다.';
      r4Penalty = 5;
      hasConditionalRisk = true;
    }
  }

  const r4: RiskRuleResult = {
    code: 'R4',
    name: '교육환경보호구역 규제',
    status: r4Status,
    statusText: r4StatusText,
    detail: r4Detail,
    legalBasis: '교육환경 보호에 관한 법률 제8조(교육환경보호구역 설정), 제9조(금지행위)',
    dataSource: '교육환경정보시스템 GIS (smart.schoolkeepa.or.kr) 및 토지e음',
    actionGuide: candidate.schoolZone === 'relative'
      ? '임대차 계약서 작성 시 "교육지원청 심의 부결 시 계약금 전액 반환 및 위약금 없이 해제" 특약을 반드시 명시하십시오.'
      : '학교 및 유치원 경계 반경을 실측 지도에서 확인하십시오.',
    penaltyPoints: r4Penalty,
  };

  // R5: 다중이용업소
  let r5Status: RiskRuleResult['status'] = 'PASS';
  let r5StatusText = '통과: 다중이용업소 비해당';
  let r5Detail = '영업장 면적 기준 미만으로 다중이용업소 소방완비증명 대상에서 제외됩니다.';
  let r5Penalty = 0;

  const isHospitality = ['restaurant', 'cafe', 'pub', 'bakery', 'snack'].includes(candidate.businessType);
  const isBasement = candidate.floor < 0;
  const isFloorAbove1 = candidate.floor > 1;
  const threshold = isBasement ? 66 : 100;

  if (isHospitality && candidate.areaSqm >= threshold && (isBasement || isFloorAbove1)) {
    r5Status = 'CONDITIONAL';
    r5StatusText = '조건부: 다중이용업소 소방완비증명 대상';
    r5Detail = `해당 호실(${candidate.floor}층, ${candidate.areaSqm}㎡)은 다중이용업소법에 따라 비상구 2개 확보, 방염필증, 소방안전시설 완비증명서 발급이 의무화됩니다.`;
    r5Penalty = 3;
    hasConditionalRisk = true;
  }

  const r5: RiskRuleResult = {
    code: 'R5',
    name: '다중이용업소 소방안전 규제',
    status: r5Status,
    statusText: r5StatusText,
    detail: r5Detail,
    legalBasis: '다중이용업소의 안전관리에 관한 특별법 시행령 제2조(다중이용업의 범위)',
    dataSource: '전용면적 및 층수 입력값 대조',
    actionGuide: r5Status === 'CONDITIONAL'
      ? '소방 인테리어 시공비(스프링클러, 완강기, 비상탈출구 등 약 300~800만원 추가 소요)를 예산에 반영하고, 소방서 완비증명 발급 가능 구조인지 도면을 사전 검토하십시오.'
      : '주방 후드 및 가스 누출 차단기 등 기본 소방 설비 기준을 준수하십시오.',
    penaltyPoints: r5Penalty,
  };

  // R6: 환산보증금
  const convertedDeposit = (candidate.deposit || 0) + (candidate.monthlyRent || 0) * 100;
  const regionLimitInfo = CONVERSION_DEPOSIT_LIMITS[candidate.regionCode] || CONVERSION_DEPOSIT_LIMITS.seoul;
  const isDepositExceeded = convertedDeposit > regionLimitInfo.limit;

  let r6Status: RiskRuleResult['status'] = 'PASS';
  let r6StatusText = '통과: 상가임대차보호법 전면 적용';
  let r6Detail = `환산보증금 ${convertedDeposit.toLocaleString()}만원으로 해당 지역 기준(${regionLimitInfo.limit.toLocaleString()}만원) 이내입니다. 차임증액 5% 상한 및 우선변제권이 온전히 보호됩니다.`;
  let r6Penalty = 0;

  if (isDepositExceeded) {
    r6Status = 'CONDITIONAL';
    r6StatusText = '주의: 환산보증금 초과 (일부 법조항 배제)';
    r6Detail = `환산보증금 ${convertedDeposit.toLocaleString()}만원으로 기준(${regionLimitInfo.limit.toLocaleString()}만원)을 초과합니다. 10년 계약갱신요구권은 인정되나, '재계약 시 월세 인상 5% 상한선' 및 '우선변제권'이 적용되지 않습니다.`;
    r6Penalty = 5;
    hasConditionalRisk = true;
  }

  const r6: RiskRuleResult = {
    code: 'R6',
    name: '상가임대차보호법 환산보증금',
    status: r6Status,
    statusText: r6StatusText,
    detail: r6Detail,
    legalBasis: '상가건물 임대차보호법 제2조(적용범위), 동법 시행령 제2조',
    dataSource: '국토교통부 법정 환산보증금 기준표',
    actionGuide: isDepositExceeded
      ? '계약서에 "계약 갱신 시 차임 및 보증금의 인상률은 연 5% 이내로 한다"는 당사자 간 별도 특약 조항을 필수 삽입하여 법적 공백을 방어하십시오.'
      : '사업자등록과 동시에 관할 세무서에서 확정일자를 즉시 부여받으십시오.',
    penaltyPoints: r6Penalty,
  };

  totalPenalty = r1.penaltyPoints + r2.penaltyPoints + r3.penaltyPoints + r4.penaltyPoints + r5.penaltyPoints + r6.penaltyPoints;

  return {
    r1,
    r2,
    r3,
    r4,
    r5,
    r6,
    hasBlockingRisk,
    hasConditionalRisk,
    totalPenalty,
  };
}

/**
 * 04 DECISION 100점 만점 스코어링 및 최종 판정 도출
 */
export function calculateDecisionScore(
  metrics: FinancialMetrics,
  riskEval: RiskEvaluation
): { scoreBreakdown: ScoreBreakdown; verdict: DecisionVerdict } {
  // 1. 수익성 (영업이익률): 35점 만점
  const margin = metrics.operatingProfitMargin;
  let profitScore = 0;
  if (margin >= 0.15) {
    profitScore = 35;
  } else if (margin > 0) {
    profitScore = (margin / 0.15) * 35;
  } else {
    profitScore = 0;
  }
  profitScore = Math.round(profitScore * 10) / 10;

  // 2. 회수기간 (초기 투자 회수기간): 20점 만점
  const payback = metrics.paybackPeriodMonths;
  let paybackScore = 0;
  if (payback <= 24) {
    paybackScore = 20;
  } else if (payback < 84) {
    paybackScore = 20 - ((payback - 24) / (84 - 24)) * 20;
  } else {
    paybackScore = 0;
  }
  paybackScore = Math.round(paybackScore * 10) / 10;

  // 3. 안정성 (손익분기 대비 안전여유율): 20점 만점
  const safety = metrics.marginOfSafety;
  let safetyScore = 0;
  if (safety >= 0.30) {
    safetyScore = 20;
  } else if (safety > 0) {
    safetyScore = (safety / 0.30) * 20;
  } else {
    safetyScore = 0;
  }
  safetyScore = Math.round(safetyScore * 10) / 10;

  // 4. 임대료 부담 ((임대료 + 관리비) ÷ 매출): 10점 만점
  const rentBurden = metrics.rentBurdenRate;
  let rentScore = 0;
  if (rentBurden <= 0.10) {
    rentScore = 10;
  } else if (rentBurden < 0.25) {
    rentScore = 10 - ((rentBurden - 0.10) / (0.25 - 0.10)) * 10;
  } else {
    rentScore = 0;
  }
  rentScore = Math.round(rentScore * 10) / 10;

  // 5. 규제·임대차: 15점 만점
  let riskScore = 15;
  if (riskEval.hasBlockingRisk) {
    riskScore = 0;
  } else {
    riskScore = Math.max(0, 15 - riskEval.totalPenalty);
  }
  riskScore = Math.round(riskScore * 10) / 10;

  // 총점 (100점 만점)
  const rawTotal = profitScore + paybackScore + safetyScore + rentScore + riskScore;
  const totalScore = Math.round(Math.min(100, Math.max(0, rawTotal)));

  const scoreBreakdown: ScoreBreakdown = {
    profitScore,
    paybackScore,
    safetyScore,
    rentScore,
    riskScore,
    totalScore,
  };

  const rationale: string[] = [];

  let verdictCode: DecisionVerdict['code'] = 'GO';
  let title = '진입 추천 (GO)';
  let summary = '비용 구조와 규제 리스크를 모두 충족하는 우량 입점 후보지입니다.';
  let badgeClass = 'bg-emerald-600 text-white';
  let bgLightClass = 'bg-emerald-50 border-emerald-200';
  let textClass = 'text-emerald-700';
  let borderClass = 'border-emerald-500';

  if (riskEval.hasBlockingRisk || totalScore < 50) {
    verdictCode = 'HOLD';
    title = '입점 보류 (HOLD / NO-GO)';
    badgeClass = 'bg-rose-600 text-white';
    bgLightClass = 'bg-rose-50 border-rose-200';
    textClass = 'text-rose-700';
    borderClass = 'border-rose-500';

    if (riskEval.hasBlockingRisk) {
      summary = '치명적인 행정·법률 규제 차단(Block) 요인이 발견되어 즉각적인 계약 체결이 불가합니다.';
      if (riskEval.r2.status === 'BLOCK') rationale.push('건축물대장상 위반건축물 등재로 인한 신규 인허가 불가');
      if (riskEval.r3.status === 'BLOCK') rationale.push('국토계획법상 용도지역 행위제한에 따른 업종 진입 금지');
      if (riskEval.r4.status === 'BLOCK') rationale.push('교육환경보호구역(절대보호구역 50m) 내 유해업종 차단');
    } else {
      summary = `종합 평가 점수(${totalScore}점)가 기준치(50점) 미만으로 사업 손익 및 투자 회수 리스크가 큽니다.`;
      if (metrics.operatingProfitMargin <= 0.05) rationale.push(`영업이익률 ${(metrics.operatingProfitMargin * 100).toFixed(1)}%로 매우 저조`);
      if (metrics.marginOfSafety <= 0.10) rationale.push(`안전여유율 ${(metrics.marginOfSafety * 100).toFixed(1)}%로 매출 소폭 하락 시 적자 전환 위험`);
      if (metrics.rentBurdenRate >= 0.20) rationale.push(`임대료 부담률 ${(metrics.rentBurdenRate * 100).toFixed(1)}%로 과도한 고정비 출혈`);
    }
  } else if (riskEval.hasConditionalRisk || totalScore < 70) {
    verdictCode = 'CONDITIONAL';
    title = '조건부 진입 (CONDITIONAL)';
    badgeClass = 'bg-amber-500 text-white';
    bgLightClass = 'bg-amber-50 border-amber-200';
    textClass = 'text-amber-800';
    borderClass = 'border-amber-500';

    if (riskEval.hasConditionalRisk) {
      summary = totalScore >= 70
        ? `종합 점수(${totalScore}점)는 우수하나, 해결해야 할 법률·행정 조건부 룰이 존재하여 최고 등급이 '조건부'로 제한되었습니다.`
        : `종합 점수(${totalScore}점) 구간이며, 일부 사전 인허가 또는 임대조건 방어가 선행되어야 합니다.`;

      if (riskEval.r1.status === 'CONDITIONAL') rationale.push('건축물 용도변경(허가/신고) 인허가 선행 필수');
      if (riskEval.r4.status === 'CONDITIONAL') rationale.push('교육지원청 상대보호구역 심의 통과 특약 명시 필요');
      if (riskEval.r5.status === 'CONDITIONAL') rationale.push('소방안전시설 완비증명서 및 방염필증 시공 예산 추가 반영');
      if (riskEval.r6.status === 'CONDITIONAL') rationale.push('환산보증금 초과로 인한 5% 임대료 인상 상한 특약 체결 필수');
    } else {
      summary = `점수 구간 50~69점에 해당하며, 임대료 감면 또는 원가 절감을 전제로 한 조건부 협상이 권장됩니다.`;
    }

    if (metrics.rentBurdenRate > 0.15) {
      rationale.push(`임대료 부담률 ${(metrics.rentBurdenRate * 100).toFixed(1)}%로 렌트프리(Rent-free) 또는 임대료 인하 협상 요망`);
    }
  } else {
    summary = `종합 점수 ${totalScore}점으로 탁월하며, 법률·행정 규제 저촉 사항이 없는 최상위 우량 입점 후보지입니다.`;
    rationale.push(`영업이익률 ${(metrics.operatingProfitMargin * 100).toFixed(1)}%로 안정적인 현금 흐름 창출`);
    rationale.push(`초기 투자금 약 ${metrics.paybackPeriodMonths.toFixed(1)}개월 내 신속 회수 가능`);
    rationale.push(`안전여유율 ${(metrics.marginOfSafety * 100).toFixed(1)}%로 매출 변동에 대한 높은 방어력`);
    rationale.push('건축물 용도, 위반건축물, 교육환경 등 6대 리스크 룰 모두 적합 통과');
  }

  const verdict: DecisionVerdict = {
    code: verdictCode,
    title,
    badgeClass,
    bgLightClass,
    textClass,
    borderClass,
    summary,
    rationale,
  };

  return { scoreBreakdown, verdict };
}

export interface LocationCompetitivenessAxis {
  key: 'hinterlandPopulation' | 'transitAccess' | 'visibility' | 'commercialVitality' | 'rentEfficiency' | 'regulatorySafety';
  subject: string;
  score: number;
  benchmark: number;
  editable: boolean;
  basis: string;
}

export interface LocationCompetitivenessResult {
  overallScore: number;
  axes: LocationCompetitivenessAxis[];
  hasCustomOverrides: boolean;
}

/**
 * 후보지 입지 환경(배후 인구, 대중교통 접근성, 가시성, 상권 활력, 임대 효율, 규제 안전성) 종합 평가
 */
export function evaluateLocationCompetitiveness(
  candidate: CandidateLocation,
  metrics: FinancialMetrics,
  riskEval: RiskEvaluation
): LocationCompetitivenessResult {
  const addr = (candidate.address || '').trim();
  const overrides = candidate.locationRatings || {};

  // 1. 배후 인구 (지역 규모 + 용도지역 배후 주거/오피스 밀도 + 거래 규모)
  let basePopulation =
    candidate.regionCode === 'seoul'
      ? 80
      : candidate.regionCode === 'overcrowded_busan'
      ? 72
      : candidate.regionCode === 'metropolitan'
      ? 66
      : 56;
  if (candidate.zoning === '준주거지역' || candidate.zoning === '제3종일반주거지역') {
    basePopulation += 8;
  } else if (candidate.zoning === '중심상업지역' || candidate.zoning === '일반상업지역') {
    basePopulation += 5;
  } else if (candidate.zoning === '자연녹지지역') {
    basePopulation -= 16;
  }
  const txCount = candidate.openupData?.monthlyTxCount || 0;
  if (txCount >= 3500) basePopulation += 6;
  else if (txCount >= 2000) basePopulation += 3;
  basePopulation = Math.max(30, Math.min(96, basePopulation));

  // 2. 대중교통 접근성 (도심/역세권/대로변 키워드 + 상업지역 등급 + 권역)
  let baseTransit =
    candidate.regionCode === 'seoul'
      ? 78
      : candidate.regionCode === 'overcrowded_busan'
      ? 70
      : candidate.regionCode === 'metropolitan'
      ? 65
      : 54;
  if (
    addr.includes('역') ||
    addr.includes('테헤란로') ||
    addr.includes('강남') ||
    addr.includes('홍대') ||
    addr.includes('성수') ||
    addr.includes('연무장') ||
    addr.includes('어울마당') ||
    addr.includes('중앙로')
  ) {
    baseTransit += 12;
  } else if (addr.includes('대로') || addr.includes('로 ')) {
    baseTransit += 5;
  }
  if (candidate.zoning === '중심상업지역' || candidate.zoning === '일반상업지역') {
    baseTransit += 6;
  }
  baseTransit = Math.max(30, Math.min(98, baseTransit));

  // 3. 점포 가시성·층수 (1층 전면 노출 vs 상층/지하)
  let baseVisibility = 58;
  if (candidate.floor === 1) baseVisibility = 88;
  else if (candidate.floor === 2) baseVisibility = 64;
  else if (candidate.floor < 0) baseVisibility = 44;
  else if (candidate.floor >= 3) baseVisibility = 52;
  if (candidate.areaSqm >= 100 && candidate.floor <= 2) baseVisibility += 4;
  baseVisibility = Math.max(25, Math.min(96, baseVisibility));

  // 4. 상권 집객력·활력 (추정 월매출 규모 + 상업용도)
  let baseVitality = 55;
  if (candidate.grossRevenue >= 6000) baseVitality = 90;
  else if (candidate.grossRevenue >= 3500) baseVitality = 80;
  else if (candidate.grossRevenue >= 2000) baseVitality = 68;
  else baseVitality = 52;
  if (candidate.zoning.includes('상업지역')) baseVitality += 5;
  baseVitality = Math.max(30, Math.min(96, baseVitality));

  // 5. 임대 효율성 (매출 대비 임대료+관리비 부담률)
  const burden = metrics.rentBurdenRate;
  let rentEfficiency = 50;
  if (burden <= 0.08) rentEfficiency = 95;
  else if (burden <= 0.12) rentEfficiency = 82;
  else if (burden <= 0.16) rentEfficiency = 64;
  else if (burden <= 0.22) rentEfficiency = 44;
  else rentEfficiency = 28;

  // 6. 규제·입지 안전성 (6대 법률/행정 리스크 반영)
  let regulatorySafety = Math.max(20, 100 - riskEval.totalPenalty * 5);
  if (riskEval.hasBlockingRisk) {
    regulatorySafety = Math.min(regulatorySafety, 25);
  }

  const populationScore = overrides.hinterlandPopulation ?? basePopulation;
  const transitScore = overrides.transitAccess ?? baseTransit;
  const visibilityScore = overrides.visibility ?? baseVisibility;
  const vitalityScore = overrides.commercialVitality ?? baseVitality;

  const axes: LocationCompetitivenessAxis[] = [
    {
      key: 'hinterlandPopulation',
      subject: '배후 인구',
      score: populationScore,
      benchmark: 70,
      editable: true,
      basis: `${candidate.zoning} 배후 수요 기반`,
    },
    {
      key: 'transitAccess',
      subject: '대중교통',
      score: transitScore,
      benchmark: 70,
      editable: true,
      basis: addr.includes('역') || addr.includes('로') ? '주요 간선·역세권 인접' : '권역 평균 접근성 기준',
    },
    {
      key: 'visibility',
      subject: '가시성·층수',
      score: visibilityScore,
      benchmark: 70,
      editable: true,
      basis: `${candidate.floor < 0 ? `지하 ${Math.abs(candidate.floor)}층` : `지상 ${candidate.floor}층`} (${candidate.areaSqm}㎡)`,
    },
    {
      key: 'commercialVitality',
      subject: '상권 활력',
      score: vitalityScore,
      benchmark: 70,
      editable: true,
      basis: `추정 매출 ${candidate.grossRevenue.toLocaleString()}만/월 규모`,
    },
    {
      key: 'rentEfficiency',
      subject: '임대 효율',
      score: rentEfficiency,
      benchmark: 70,
      editable: false,
      basis: `임대부담률 ${(burden * 100).toFixed(1)}%`,
    },
    {
      key: 'regulatorySafety',
      subject: '규제 안전',
      score: regulatorySafety,
      benchmark: 70,
      editable: false,
      basis: riskEval.hasBlockingRisk
        ? '차단 규제 발생'
        : riskEval.hasConditionalRisk
        ? '조건부 인허가 주의'
        : '6대 규제 통과',
    },
  ];

  const overallScore = Math.round(axes.reduce((sum, a) => sum + a.score, 0) / axes.length);
  const hasCustomOverrides = Boolean(
    overrides.hinterlandPopulation !== undefined ||
      overrides.transitAccess !== undefined ||
      overrides.visibility !== undefined ||
      overrides.commercialVitality !== undefined
  );

  return {
    overallScore,
    axes,
    hasCustomOverrides,
  };
}
