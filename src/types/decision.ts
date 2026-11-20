export type BusinessCategory =
  | 'cafe' // 카페·디저트
  | 'restaurant' // 일반음식점 (한식/일식/양식)
  | 'pub' // 주점·호프·이자카야
  | 'snack' // 분식·패스트푸드
  | 'bakery' // 제과점
  | 'retail' // 판매점 (편의점/의류/소품)
  | 'beauty' // 미용·뷰티 (헤어/네일/피부)
  | 'entertainment' // 엔터테인먼트 (PC방/노래방/당구장)
  | 'fitness'; // 운동·체육시설 (헬스/필라테스)

export type BuildingUseType =
  | '제1종근린생활시설'
  | '제2종근린생활시설'
  | '일반음식점'
  | '휴게음식점'
  | '판매시설'
  | '업무시설'
  | '위락시설'
  | '기타';

export type ZoningType =
  | '중심상업지역'
  | '일반상업지역'
  | '근린상업지역'
  | '유통상업지역'
  | '준주거지역'
  | '제1종일반주거지역'
  | '제2종일반주거지역'
  | '제3종일반주거지역'
  | '전용주거지역'
  | '자연녹지지역';

export type SchoolZoneType =
  | 'none' // 비해당
  | 'absolute' // 절대보호구역 (50m 이내)
  | 'relative'; // 상대보호구역 (200m 이내)

export type RegionConversionType =
  | 'seoul' // 서울특별시 (9억원)
  | 'overcrowded_busan' // 수도권 과밀억제권역 및 부산광역시 (6.9억원)
  | 'metropolitan' // 광역시, 세종, 안산, 용인, 화성, 김포 등 (5.4억원)
  | 'other'; // 그 밖의 지역 (3.7억원)

export type RiskStatus = 'PASS' | 'CONDITIONAL' | 'RECOMMEND_CHECK' | 'BLOCK';

export type DueDiligenceStatus = 'unverified' | 'verified' | 'conditional' | 'critical';

export type DueDiligenceKey = 'building' | 'zoning' | 'permit' | 'facility' | 'lease';

export interface DueDiligenceItem {
  key: DueDiligenceKey;
  label: string;
  description: string;
  status: DueDiligenceStatus;
  sourceNote: string; // 확인한 문서·기관·일자
  memo: string; // 확인 결과 요약
}

export interface RiskRuleResult {
  code: 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6';
  name: string;
  status: RiskStatus;
  statusText: string;
  detail: string;
  legalBasis: string;
  dataSource: string;
  actionGuide: string;
  penaltyPoints: number;
}

export interface RiskEvaluation {
  r1: RiskRuleResult; // 건축물 용도
  r2: RiskRuleResult; // 위반건축물
  r3: RiskRuleResult; // 용도지역
  r4: RiskRuleResult; // 교육환경보호구역
  r5: RiskRuleResult; // 다중이용업소
  r6: RiskRuleResult; // 환산보증금
  hasBlockingRisk: boolean;
  hasConditionalRisk: boolean;
  totalPenalty: number;
}

export interface CandidateLocation {
  id: string;
  name: string; // 매물명 / 상호
  address: string;
  detailAddress?: string;
  regionCode: RegionConversionType;
  businessType: BusinessCategory;
  businessName: string; // 표시용 업종명
  taxIndustryCode?: string; // 국세청 세무서 업종코드 (예: 552301)
  taxIndustryMajor?: string; // 세무서 업종 대분류
  taxIndustryMedium?: string; // 세무서 업종 중분류
  buildingUse: BuildingUseType;
  zoning: ZoningType;
  areaSqm: number; // 전용면적 (㎡)
  floor: number; // 층수 (-1 = 지하 1층, 1 = 1층, 2 = 2층 ...)
  hasViolation: boolean; // 건축물대장상 위반건축물 여부
  schoolZone: SchoolZoneType; // 교육환경보호구역 여부

  // 임대 조건 (만원 단위)
  deposit: number; // 보증금
  monthlyRent: number; // 월세
  maintenanceFee: number; // 관리비
  premium: number; // 권리금

  // 매출 (Top-line, 만원 단위)
  revenueSource: 'openup' | 'ai_estimate' | 'unit_calc' | 'custom';
  grossRevenue: number; // 결제액 (월 기준)
  isVatIncluded: boolean; // 부가세 포함 여부 (포함 시 공급가액 = grossRevenue / 1.1)

  // 객단가 × 고객수 매출 계산기 보조 필드
  unitPrice?: number; // 평균 객단가 (원)
  dailyCustomers?: number; // 일평균 결제/고객 수 (명)
  operatingDaysPerMonth?: number; // 월 영업일수 (일)

  // 오픈업 또는 AI 참고 데이터
  openupData?: {
    storeName?: string;
    cardVolumeRatio?: number; // 카드 결제 비중 (%)
    peakTime?: string;
    avgTicket?: number; // 평균 결제액 (원)
    monthlyTxCount?: number; // 월 결제 건수
    genderRatio?: { male: number; female: number };
    ageRatio?: Record<string, number>;
  };

  // 비용 구조 (Bottom-line)
  costOfGoodsRate: number; // 원가율 (%)
  otherVariableRate: number; // 포장용기, 배달대행수수료, 기타 변동비율 (%)
  cardRatio: number; // 카드 결제 비중 (%)
  cardFeeRate: number; // 카드 수수료율 (%, 기본 1.5%)
  deliveryRatio: number; // 배달 매출 비중 (%)
  deliveryFeeRate: number; // 배달 수수료율 (%, 기본 15%)

  // 인건비
  fullTimeStaff: number; // 풀타임 환산 직원 수
  hourlyWage: number; // 적용 시급 (원)
  socialInsuranceRate: number; // 4대보험 사업주 부담률 (%, 기본 10.5%)
  ownerSalary: number; // 대표자 목표 인건비 (만원)

  // 추가 고정비 (만원 단위, PropScope 보완 항목)
  utilityCost?: number; // 월 공과금 (전기·수도·가스·인터넷)
  marketingCost?: number; // 월 광고·마케팅비
  otherFixedCost?: number; // 기타 월 고정비 (세무기장·보험 등)

  // 투자 및 감가상각
  interiorCost: number; // 인테리어 비용 (만원)
  equipmentCost: number; // 설비 및 집기 비용 (만원)
  depreciationMonths: number; // 감가상각 기간 (개월, 기본 60개월)
  otherInitialCost?: number; // 기타 초기 비용 (가맹비·초도물량 등, 만원)
  workingCapital?: number; // 초기 운전자금 (예비 운영자금, 만원)
  costChecked?: boolean; // 비용 누락 여부 자가 점검 확인

  // 03 입점 확인사항 (실사 근거 기록장)
  dueDiligence?: DueDiligenceItem[];

  // 저장된 AI 해설 리포트 (옵션)
  aiReport?: string;
  aiReportDate?: string;

  // 06 종합판정 및 비교함 관리
  addedToCompare?: boolean; // 종합판정 후 비교함에 추가 여부
  evaluatedAt?: string; // 종합판정 완료 일시
  isStarred?: boolean; // 중요 후보지 별표 표시
  isLocked?: boolean; // 삭제 방지 잠금 여부

  // 입지 경쟁력 현장 보정 점수 (0~100, 선택 입력)
  locationRatings?: {
    hinterlandPopulation?: number;
    transitAccess?: number;
    visibility?: number;
    commercialVitality?: number;
  };

  // 주소 기반 필지 정보 및 건축물대장 연동 호실 데이터
  parcelInfo?: {
    bcode?: string;
    jibunAddress?: string;
    buildingCode?: string;
    buildingName?: string;
    zoning?: ZoningType;
    jijiguZones?: string[];
  };
  selectedUnitId?: string;
  manualUnits?: BuildingUnitOption[];
}

export interface BuildingUnitOption {
  id: string;
  kind: 'unit' | 'floor' | 'manual';
  dongNm?: string;
  hoNm: string;
  floorNumber: number;
  floorLabel: string;
  exclusiveAreaSqm: number;
  commonAreaSqm?: number;
  mainPurpose: string;
  etcPurpose?: string;
  mappedBuildingUse: BuildingUseType;
  zoning?: ZoningType;
  source: 'api' | 'manual';
}

export interface FinancialMetrics {
  monthlyRevenue: number; // S (공급가액, 만원)
  variableCostRate: number; // v (0~1)
  totalVariableCost: number; // S * v (만원)

  laborCost: number; // 월 인건비 (만원)
  monthlyDepreciation: number; // 감가상각비 (만원)
  monthlyRentAndMaintenance: number; // 임대료 + 관리비 (만원)
  utilityAndOtherFixedCost: number; // 공과금 + 광고비 + 기타 고정비 (만원)
  totalFixedCost: number; // F (인건비 + 임대료 + 관리비 + 공과금·기타 + 감가상각 + 대표인건비, 만원)

  monthlyOperatingProfit: number; // 월 영업이익 (S - S*v - F, 만원)
  monthlyCashFlow: number; // 월 영업현금흐름 (영업이익 + 감가상각, 만원)
  operatingProfitMargin: number; // 영업이익률 (영업이익 / S)

  breakEvenRevenue: number; // 손익분기 매출 (F / (1 - v), 만원)
  marginOfSafety: number; // 안전여유율 ((S - BEP) / S)
  rentBurdenRate: number; // 임대료 부담률 ((임대료 + 관리비) / S)

  brokerageFee: number; // 법정 중개보수 (만원)
  initialInvestment: number; // 초기 투자금 (권리금 + 인테리어 + 설비 + 중개보수 + 기타초기비용, 만원)
  totalCashRequired: number; // 총 필요자금 (초기투자금 + 보증금 + 운전자금, 만원)

  paybackPeriodMonths: number; // 기본 투자 회수기간 (초기투자 / (영업이익 + 감가상각), 개월)
  totalPaybackPeriodMonths: number; // 보증금·운전자금 포함 총 필요현금 회수기간 (개월)
  annualRoi: number; // 연 투자수익률 (월영업이익 * 12 / 초기투자)

  areaPyeong: number; // 전용 평수
  rentPerPyeong: number; // 평당 월 임대+관리비 (만원)
  annualRentTotal: number; // 연간 임대료+관리비 합계 (만원)
}

export interface ScoreBreakdown {
  profitScore: number; // 35점 만점 (영업이익률: 15% 이상 35점, 0% 이하 0점)
  paybackScore: number; // 20점 만점 (회수기간: 24개월 이하 20점, 84개월 이상 0점)
  safetyScore: number; // 20점 만점 (안전여유율: 30% 이상 20점, 0% 이하 0점)
  rentScore: number; // 10점 만점 (임대료 부담률: 10% 이하 10점, 25% 이상 0점)
  riskScore: number; // 15점 만점 (6개 룰 감점 반영)
  totalScore: number; // 100점 만점 정량 총점
}

export type DecisionVerdictCode = 'GO' | 'CONDITIONAL' | 'HOLD';

export interface DecisionVerdict {
  code: DecisionVerdictCode;
  title: string;
  badgeClass: string;
  bgLightClass: string;
  textClass: string;
  borderClass: string;
  summary: string;
  rationale: string[];
}

export interface AnalysisHistoryRecord {
  id: string;
  savedAt: string;
  candidate: CandidateLocation;
  totalScore: number;
  verdictCode: DecisionVerdictCode;
  verdictTitle: string;
  monthlyRevenue: number;
  monthlyOperatingProfit: number;
}

export type StepId =
  | 'S1_START'
  | 'S2_INPUT'
  | 'S3_TOPLINE'
  | 'S4_BOTTOMLINE'
  | 'S5_RISK'
  | 'S6_DECISION'
  | 'S7_COMPARE'
  | 'S8_REPORT';
