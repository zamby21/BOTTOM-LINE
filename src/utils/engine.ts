import {
  CandidateLocation,
  BusinessCategory,
  FinancialMetrics,
  RiskEvaluation,
  RiskRuleResult,
  ScoreBreakdown,
  DecisionVerdict,
  RegionConversionType,
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

/**
 * 01 TOP-LINE & 02 BOTTOM-LINE 재무 지표 계산 함수
 */
export function calculateFinancialMetrics(candidate: CandidateLocation): FinancialMetrics {
  // 1. 월 매출 S (공급가액 기준, 부가세 포함 시 / 1.1)
  const monthlyRevenue = candidate.isVatIncluded
    ? candidate.grossRevenue / 1.1
    : candidate.grossRevenue;

  // 2. 변동비율 v
  const cogRate = (candidate.costOfGoodsRate || 0) / 100;
  const otherVarRate = (candidate.otherVariableRate || 0) / 100;
  const cardFeeComponent = ((candidate.cardRatio || 0) / 100) * ((candidate.cardFeeRate || 0) / 100);
  const deliveryFeeComponent = ((candidate.deliveryRatio || 0) / 100) * ((candidate.deliveryFeeRate || 0) / 100);

  const variableCostRate = cogRate + otherVarRate + cardFeeComponent + deliveryFeeComponent;
  const totalVariableCost = monthlyRevenue * variableCostRate;

  // 3. 인건비 (월 기준)
  // 인원(풀타임 환산) × 시급 × 209시간 × (1 + 4대보험 부담률)
  const socialIns = 1 + (candidate.socialInsuranceRate || 10.5) / 100;
  const monthlyStaffLaborWon = candidate.fullTimeStaff * (candidate.hourlyWage || 10030) * 209 * socialIns;
  const laborCost = monthlyStaffLaborWon / 10000; // 만원 단위

  // 4. 감가상각비
  // (인테리어 + 설비·집기) ÷ 60개월
  const depreciationMonths = candidate.depreciationMonths || 60;
  const totalCapex = (candidate.interiorCost || 0) + (candidate.equipmentCost || 0);
  const monthlyDepreciation = totalCapex > 0 ? totalCapex / depreciationMonths : 0;

  // 5. 임대료 + 관리비
  const monthlyRentAndMaintenance = (candidate.monthlyRent || 0) + (candidate.maintenanceFee || 0);

  // 6. 고정비 F
  // 인건비 + 임대료 + 관리비 + 감가상각 + 대표 인건비
  const totalFixedCost = laborCost + monthlyRentAndMaintenance + monthlyDepreciation + (candidate.ownerSalary || 0);

  // 7. 월 영업이익
  // S - S * v - F
  const monthlyOperatingProfit = monthlyRevenue - totalVariableCost - totalFixedCost;
  const operatingProfitMargin = monthlyRevenue > 0 ? monthlyOperatingProfit / monthlyRevenue : 0;

  // 8. 손익분기(BEP) 매출
  // F ÷ (1 - v)
  const contributionMarginRate = 1 - variableCostRate;
  const breakEvenRevenue = contributionMarginRate > 0 ? totalFixedCost / contributionMarginRate : 0;

  // 9. 안전여유율
  // (S - 손익분기 매출) ÷ S
  const marginOfSafety = monthlyRevenue > 0 ? (monthlyRevenue - breakEvenRevenue) / monthlyRevenue : 0;

  // 10. 임대료 부담률
  // (임대료 + 관리비) ÷ S
  const rentBurdenRate = monthlyRevenue > 0 ? monthlyRentAndMaintenance / monthlyRevenue : 0;

  // 11. 중개보수
  // (보증금 + 월세 × 100) × 0.9% (합계가 5천만원 미만이면 월세 × 70으로 계산)
  const baseRentSum = (candidate.deposit || 0) + (candidate.monthlyRent || 0) * 100;
  const effectiveBase = baseRentSum < 5000
    ? (candidate.deposit || 0) + (candidate.monthlyRent || 0) * 70
    : baseRentSum;
  const brokerageFee = effectiveBase * 0.009; // 법정 상한 0.9%

  // 12. 초기 투자금
  // 권리금 + 인테리어 + 설비·집기 + 중개보수 (보증금은 반환자산이므로 별도)
  const initialInvestment = (candidate.premium || 0) + totalCapex + brokerageFee;
  const totalCashRequired = initialInvestment + (candidate.deposit || 0);

  // 13. 회수기간 (초기 투자 ÷ (월 영업이익 + 감가상각)) [현금흐름 기준]
  const monthlyCashFlow = monthlyOperatingProfit + monthlyDepreciation;
  let paybackPeriodMonths = 999;
  if (monthlyCashFlow > 0 && initialInvestment > 0) {
    paybackPeriodMonths = initialInvestment / monthlyCashFlow;
  } else if (initialInvestment <= 0) {
    paybackPeriodMonths = 0;
  }

  // 14. 연 투자수익률 (ROI)
  // 월 영업이익 × 12 ÷ 초기 투자
  const annualRoi = initialInvestment > 0 ? (monthlyOperatingProfit * 12) / initialInvestment : 0;

  return {
    monthlyRevenue,
    variableCostRate,
    totalVariableCost,
    laborCost,
    monthlyDepreciation,
    monthlyRentAndMaintenance,
    totalFixedCost,
    monthlyOperatingProfit,
    operatingProfitMargin,
    breakEvenRevenue,
    marginOfSafety,
    rentBurdenRate,
    brokerageFee,
    initialInvestment,
    totalCashRequired,
    paybackPeriodMonths,
    annualRoi,
  };
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
    dataSource: '교육환경정보시스템 GIS (eeis.schoolkeepa.or.kr) 및 토지e음',
    actionGuide: candidate.schoolZone === 'relative'
      ? '임대차 계약서 작성 시 "교육지원청 심의 부결 시 계약금 전액 반환 및 위약금 없이 해제" 특약을 반드시 명시하십시오.'
      : '학교 및 유치원 경계 반경을 실측 지도에서 확인하십시오.',
    penaltyPoints: r4Penalty,
  };

  // R5: 다중이용업소
  // 바닥면적이 100㎡ (지하층 66㎡) 이상인 음식점/휴게음식점/제과점 등
  let r5Status: RiskRuleResult['status'] = 'PASS';
  let r5StatusText = '통과: 다중이용업소 비해당';
  let r5Detail = '영업장 면적 기준 미만으로 다중이용업소 소방완비증명 대상에서 제외됩니다.';
  let r5Penalty = 0;

  const isHospitality = ['restaurant', 'cafe', 'pub', 'bakery', 'snack'].includes(candidate.businessType);
  const isBasement = candidate.floor < 0;
  const isFloorAbove1 = candidate.floor > 1;
  const threshold = isBasement ? 66 : 100;

  // 1층에 위치하고 지상과 직접 연결된 출입구가 있는 경우는 보통 완화되나, 2층 이상이거나 지하층이고 기준면적 초과시 다중이용업소 대상
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
  // 보증금 + 월세 × 100
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
    r6Penalty = 5; // proposal says -5 penalty
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
  // 1. 수익성 (영업이익률): 35점 만점. 15% 이상 = 35점, 0% 이하 = 0점.
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

  // 2. 회수기간 (초기 투자 회수기간): 20점 만점. 24개월 이하 = 20점, 84개월 이상 = 0점.
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

  // 3. 안정성 (손익분기 대비 안전여유율): 20점 만점. 30% 이상 = 20점, 0% 이하 = 0점.
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

  // 4. 임대료 부담 ((임대료 + 관리비) ÷ 매출): 10점 만점. 10% 이하 = 10점, 25% 이상 = 0점.
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

  // 5. 규제·임대차: 15점 만점.
  // 6개 룰의 감점 반영 (차단 룰 발생 시 0점)
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

  // 판정 규칙 (Page 3 of Proposal):
  // • 진입: 70점 이상이고 차단·조건부 룰이 없을 때
  // • 조건부 진입: 50~69점, 또는 조건부 룰이 있을 때 (점수가 높아도 최고 조건부)
  // • 보류: 차단 룰이 하나라도 있거나 50점 미만일 때
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
    // GO
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
