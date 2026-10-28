import { CandidateLocation, BusinessCategory } from '../types/decision';

export interface IndustryBenchmark {
  category: BusinessCategory;
  name: string;
  defaultBuildingUse: string;
  costOfGoodsRate: number; // 평균 원가율 (%)
  cardRatio: number; // 카드 결제 비중 (%)
  deliveryRatio: number; // 배달 비중 (%)
  deliveryFeeRate: number; // 배달 수수료율 (%)
  interiorPerPyeong: number; // 평당 인테리어 비용 (만원)
  equipmentCostAvg: number; // 평균 설비·집기 비용 (만원)
  standardStaffCount: number; // 권장 풀타임 인원
  openupAvgTicket: number; // 평균 객단가 (원)
}

export const INDUSTRY_BENCHMARKS: Record<BusinessCategory, IndustryBenchmark> = {
  cafe: {
    category: 'cafe',
    name: '카페·디저트',
    defaultBuildingUse: '휴게음식점',
    costOfGoodsRate: 28, // 원두, 우유, 디저트 생지 등 28%
    cardRatio: 95,
    deliveryRatio: 10,
    deliveryFeeRate: 15,
    interiorPerPyeong: 220,
    equipmentCostAvg: 2500,
    standardStaffCount: 2,
    openupAvgTicket: 8500,
  },
  restaurant: {
    category: 'restaurant',
    name: '일반음식점 (한식/일식/양식)',
    defaultBuildingUse: '일반음식점',
    costOfGoodsRate: 35, // 식자재 원가 약 35%
    cardRatio: 92,
    deliveryRatio: 25,
    deliveryFeeRate: 16,
    interiorPerPyeong: 260,
    equipmentCostAvg: 3800,
    standardStaffCount: 3.5,
    openupAvgTicket: 24000,
  },
  pub: {
    category: 'pub',
    name: '주점·호프·이자카야',
    defaultBuildingUse: '제2종근린생활시설',
    costOfGoodsRate: 32, // 주류 및 안주 32%
    cardRatio: 94,
    deliveryRatio: 5,
    deliveryFeeRate: 14,
    interiorPerPyeong: 250,
    equipmentCostAvg: 2800,
    standardStaffCount: 2.5,
    openupAvgTicket: 38000,
  },
  snack: {
    category: 'snack',
    name: '분식·패스트푸드',
    defaultBuildingUse: '제1종근린생활시설',
    costOfGoodsRate: 33,
    cardRatio: 90,
    deliveryRatio: 45,
    deliveryFeeRate: 18,
    interiorPerPyeong: 200,
    equipmentCostAvg: 2200,
    standardStaffCount: 2,
    openupAvgTicket: 13000,
  },
  bakery: {
    category: 'bakery',
    name: '제과·베이커리',
    defaultBuildingUse: '제2종근린생활시설',
    costOfGoodsRate: 30,
    cardRatio: 93,
    deliveryRatio: 12,
    deliveryFeeRate: 15,
    interiorPerPyeong: 240,
    equipmentCostAvg: 4500,
    standardStaffCount: 2.5,
    openupAvgTicket: 16000,
  },
  retail: {
    category: 'retail',
    name: '판매·소매점',
    defaultBuildingUse: '제1종근린생활시설',
    costOfGoodsRate: 50,
    cardRatio: 90,
    deliveryRatio: 0,
    deliveryFeeRate: 0,
    interiorPerPyeong: 180,
    equipmentCostAvg: 1200,
    standardStaffCount: 1.5,
    openupAvgTicket: 22000,
  },
  beauty: {
    category: 'beauty',
    name: '미용·뷰티샵',
    defaultBuildingUse: '제1종근린생활시설',
    costOfGoodsRate: 12, // 제품 재료비 12%
    cardRatio: 90,
    deliveryRatio: 0,
    deliveryFeeRate: 0,
    interiorPerPyeong: 280,
    equipmentCostAvg: 2000,
    standardStaffCount: 2,
    openupAvgTicket: 55000,
  },
  entertainment: {
    category: 'entertainment',
    name: 'PC방·오락시설',
    defaultBuildingUse: '제2종근린생활시설',
    costOfGoodsRate: 20,
    cardRatio: 90,
    deliveryRatio: 0,
    deliveryFeeRate: 0,
    interiorPerPyeong: 210,
    equipmentCostAvg: 7000,
    standardStaffCount: 2,
    openupAvgTicket: 12000,
  },
  fitness: {
    category: 'fitness',
    name: '피트니스·필라테스',
    defaultBuildingUse: '제2종근린생활시설',
    costOfGoodsRate: 8,
    cardRatio: 95,
    deliveryRatio: 0,
    deliveryFeeRate: 0,
    interiorPerPyeong: 240,
    equipmentCostAvg: 5500,
    standardStaffCount: 2.5,
    openupAvgTicket: 180000,
  },
};

export const INITIAL_PRESET_CANDIDATES: CandidateLocation[] = [
  {
    id: 'candidate-1-seongsu',
    name: '후보지 A: 성수동 연무장길 스페셜티 카페',
    address: '서울특별시 성동구 연무장길 42',
    detailAddress: '지상 1층 101호',
    regionCode: 'seoul',
    businessType: 'cafe',
    businessName: '스페셜티 카페 & 디저트',
    buildingUse: '휴게음식점',
    zoning: '준주거지역',
    areaSqm: 56.2, // 약 17평
    floor: 1,
    hasViolation: false,
    schoolZone: 'none',
    
    deposit: 5000, // 5천만원
    monthlyRent: 350, // 350만원
    maintenanceFee: 30, // 30만원
    premium: 3000, // 권리금 3천만원
    
    revenueSource: 'openup',
    grossRevenue: 3850, // 부가세 포함 3,850만원 -> 공급가액 3,500만원
    isVatIncluded: true,
    openupData: {
      storeName: '연무장길 카페 상권 데이터 (오픈업 핀다)',
      cardVolumeRatio: 96,
      peakTime: '13:00 ~ 15:00 / 토·일 주말 집중',
      avgTicket: 8900,
      monthlyTxCount: 4320,
      genderRatio: { male: 38, female: 62 },
      ageRatio: { '20대': 48, '30대': 39, '기타': 13 },
    },
    
    costOfGoodsRate: 28,
    otherVariableRate: 3.5,
    cardRatio: 95,
    cardFeeRate: 1.5,
    deliveryRatio: 5,
    deliveryFeeRate: 15,
    
    fullTimeStaff: 2,
    hourlyWage: 10030,
    socialInsuranceRate: 10.5,
    ownerSalary: 300, // 대표 급여 300만원
    
    interiorCost: 3800, // 인테리어 3,800만원
    equipmentCost: 2600, // 에스프레소 머신 등 2,600만원
    depreciationMonths: 60,
    addedToCompare: true,
    evaluatedAt: '2026-04-10 09:30',
  },
  {
    id: 'candidate-2-gangnam',
    name: '후보지 B: 강남역 테헤란로 일식 캐주얼 다이닝',
    address: '서울특별시 강남구 테헤란로4길 19',
    detailAddress: '지상 2층 201호',
    regionCode: 'seoul',
    businessType: 'restaurant',
    businessName: '프리미엄 일식 다이닝',
    buildingUse: '일반음식점',
    zoning: '일반상업지역',
    areaSqm: 138.8, // 약 42평 (다중이용업소 대상!)
    floor: 2,
    hasViolation: false,
    schoolZone: 'none',
    
    deposit: 12000, // 1억 2,000만원
    monthlyRent: 820, // 820만원 (고임대료!)
    maintenanceFee: 90, // 90만원
    premium: 8500, // 권리금 8,500만원
    
    revenueSource: 'openup',
    grossRevenue: 7150, // 부가세 포함 7,150만원 -> 공급가액 6,500만원 (매출 1위!)
    isVatIncluded: true,
    openupData: {
      storeName: '강남역 오피스 밀집 상권 (오픈업 핀다)',
      cardVolumeRatio: 98,
      peakTime: '11:30 ~ 13:30 / 18:30 ~ 21:00 직장인 회식',
      avgTicket: 26500,
      monthlyTxCount: 2700,
      genderRatio: { male: 54, female: 46 },
      ageRatio: { '20대': 25, '30대': 52, '40대': 18, '기타': 5 },
    },
    
    costOfGoodsRate: 36,
    otherVariableRate: 4.0,
    cardRatio: 96,
    cardFeeRate: 1.5,
    deliveryRatio: 12,
    deliveryFeeRate: 16,
    
    fullTimeStaff: 4.5,
    hourlyWage: 10030,
    socialInsuranceRate: 10.5,
    ownerSalary: 450, // 대표 급여 450만원
    
    interiorCost: 9500, // 인테리어 9,500만원
    equipmentCost: 4800, // 주방 설비 4,800만원
    depreciationMonths: 60,
    addedToCompare: true,
    evaluatedAt: '2026-04-10 10:15',
  },
  {
    id: 'candidate-3-hongdae',
    name: '후보지 C: 홍대입구 어울마당로 루프탑 펍',
    address: '서울특별시 마포구 어울마당로 78',
    detailAddress: '지상 5층 루프탑',
    regionCode: 'seoul',
    businessType: 'pub',
    businessName: '루프탑 수제 맥주 펍',
    buildingUse: '제2종근린생활시설',
    zoning: '일반상업지역',
    areaSqm: 88.5, // 약 26.8평
    floor: 5,
    hasViolation: true, // ⚠️ 위반건축물 등재! (차단 룰 R2 트리거!)
    schoolZone: 'relative', // 상대보호구역 심의 대상
    
    deposit: 4500,
    monthlyRent: 360,
    maintenanceFee: 45,
    premium: 4000,
    
    revenueSource: 'ai_estimate',
    grossRevenue: 3520, // 공급가액 3,200만원
    isVatIncluded: true,
    openupData: {
      storeName: '홍대 걷고싶은거리 상권 추정치',
      cardVolumeRatio: 95,
      peakTime: '20:00 ~ 24:00 주말 피크',
      avgTicket: 34000,
      monthlyTxCount: 1030,
      genderRatio: { male: 45, female: 55 },
      ageRatio: { '20대': 68, '30대': 26, '기타': 6 },
    },
    
    costOfGoodsRate: 33,
    otherVariableRate: 3.0,
    cardRatio: 94,
    cardFeeRate: 1.5,
    deliveryRatio: 2,
    deliveryFeeRate: 14,
    
    fullTimeStaff: 2.5,
    hourlyWage: 10030,
    socialInsuranceRate: 10.5,
    ownerSalary: 300,
    
    interiorCost: 4800,
    equipmentCost: 2200,
    depreciationMonths: 60,
    addedToCompare: false,
  },
];
