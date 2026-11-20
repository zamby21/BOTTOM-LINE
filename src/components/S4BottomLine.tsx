import React, { useState, useEffect } from 'react';
import {
  CandidateLocation,
  FinancialMetrics,
  UtilityCostBreakdown,
  TaxCostBreakdown,
  MarketingCostBreakdown,
  CustomCostItem,
} from '../types/decision';
import {
  calculateFinancialMetrics,
  simulateRevenueSensitivity,
  simulateCostSensitivity,
} from '../utils/engine';
import {
  Calculator,
  ArrowRight,
  DollarSign,
  Users,
  Percent,
  Hammer,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
  Lightbulb,
  Receipt,
  Megaphone,
  Sparkles,
  RotateCcw,
  Wallet,
  PieChart as PieChartIcon,
  Layers,
  Plus,
  Trash2,
  Tag,
  Maximize2,
  X,
  TrendingDown,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CUSTOM_COST_COLORS = ['#ec4899', '#14b8a6', '#84cc16', '#f43f5e', '#0ea5e9', '#a855f7'];

const CUSTOM_COST_PRESETS: { name: string; costType: 'fixed' | 'variable_rate'; amount: number; memo: string }[] = [
  { name: '프랜차이즈 로열티', costType: 'variable_rate', amount: 3, memo: '월 순매출 연동' },
  { name: '주차 지원비', costType: 'fixed', amount: 15, memo: '고객 무료주차 정산' },
  { name: '청소 · 방역 용역', costType: 'fixed', amount: 12, memo: '정기 위생·해충 관리' },
  { name: '장비 · 키오스크 리스', costType: 'fixed', amount: 20, memo: '월 렌탈/리스료' },
  { name: '배달대행 월정액', costType: 'fixed', amount: 25, memo: '배달 프로그램·기본료' },
];

interface CostGuideTip {
  benchmark: string;
  guide: string;
  taxTip: string;
}

const COST_GUIDE_TIPS: Record<string, CostGuideTip> = {
  cogs: {
    benchmark: '권장 비중: 외식 28~35% · 카페 22~30%',
    guide:
      '식자재 로스(폐기)와 주력 메뉴 마진율 점검이 핵심입니다. 원가율이 3%p만 올라도 월 순이익이 크게 줄어드므로 식자재 발주 단가·정량 레시피를 표준화하세요.',
    taxTip:
      '면세 농·축·수산물을 매입하는 음식점은 의제매입세액공제(8/108~9/109)를 받을 수 있습니다. 반드시 계산서 또는 사업자 신용카드·현금영수증 적격증빙을 수취하세요.',
  },
  variable_fees: {
    benchmark: '카드 0.5~1.5% · 배달 12~22%',
    guide:
      '배달 비중이 높다면 홀·포장 객단가를 높이거나 자체 픽업 할인을 유도해 중개·결제 수수료 부담을 낮추는 전략이 효과적입니다.',
    taxTip:
      '배달앱 정산 시 차감되는 중개·결제수수료는 월말 세금계산서 발급 여부를 확인해 부가세 매입공제를 챙기고, 개인사업자는 신용카드 매출세액공제(1.3%, 연 1,000만원 한도)를 활용하세요.',
  },
  labor: {
    benchmark: '권장 비중: 순매출의 20~28% (대표 포함)',
    guide:
      '주휴수당(주 15시간 이상)과 사업주 4대보험 부담분(약 10.5%)을 포함한 실질 인건비로 관리하고, 피크타임 중심 탄력 근무표를 운영하세요.',
    taxTip:
      '10인 미만 소규모 사업장은 두루누리 사회보험료 지원(최대 80%) 및 일자리·고용증대 세액공제를 검토하세요. 가족 근무 시에도 실제 근태 기록과 원천세 신고를 해야 경비로 인정됩니다.',
  },
  rent: {
    benchmark: '권장 비중: 순매출의 8~12% 이내',
    guide:
      '임대료는 비수기에도 줄지 않는 대표 고정비입니다. 계약 전 렌트프리(인테리어 기간 무상임대)와 관리비 내역(공용전기·청소비)을 특약으로 명확히 확정하세요.',
    taxTip:
      '임대인이 일반과세자라면 매월 전자세금계산서를 수취해 부가세 10%를 전액 공제받으세요. 간이과세 임대인이라도 임대차계약서와 계좌이체 내역을 보관하면 종합소득세 필요경비로 인정됩니다.',
  },
  utility: {
    benchmark: '권장 비중: 순매출의 2~4%',
    guide:
      '매장 평수와 주방·냉난방 설비 용량에 맞는 계약전력을 선택하면 기본요금과 여름·겨울 피크 요금을 크게 절감할 수 있습니다.',
    taxTip:
      '전기(한전)·도시가스·인터넷·통신 명의에 사업자등록번호를 등록하면 매월 전자세금계산서가 자동 발행되어 부가세 매입공제와 경비 누락을 동시에 막을 수 있습니다.',
  },
  tax: {
    benchmark: '기장료 월 10~20만 · 조정료 별도',
    guide:
      '매출 규모가 커질수록 세무 기장을 통해 부가세·종소세 추징 리스크를 줄이고, 분기별 예상 세액을 미리 적립해 현금흐름 압박을 예방하세요.',
    taxTip:
      '세무 기장료·조정료는 부가세 공제 및 100% 경비 처리됩니다. 홈택스에 사업용 계좌·카드를 사전 등록하고, 노란우산공제(연 최대 500만~600만원 소득공제)로 종합소득세를 절감하세요.',
  },
  marketing: {
    benchmark: '초기 3개월 3~5% → 안정기 1~3%',
    guide:
      '오픈 초기에는 네이버 플레이스·지도 검색과 리뷰 확보에 집중하고, 3개월 이후에는 광고비 대비 매출(ROAS)과 재방문율 기준으로 예산을 조정하세요.',
    taxTip:
      '온라인 광고 충전금(네이버·메타·배달앱)과 현수막·전단지 제작비는 사업자 카드 결제 또는 세금계산서 발급 시 전액 부가세 매입공제 및 광고선전비로 경비 인정됩니다.',
  },
  depreciation_other: {
    benchmark: '인테리어·설비 60개월(5년) 균등 배분',
    guide:
      '초기 인테리어·주방설비 투자금을 월별로 나누어 반영해야 진짜 남는 영업이익을 파악할 수 있습니다. 권리금·보증금 회수 계획과 함께 검토하세요.',
    taxTip:
      '사업자등록 후 인테리어·설비 세금계산서를 수취하면 부가가치세 조기환급(신고 후 15일 내)으로 초기 현금을 확보할 수 있습니다. 권리금은 기타소득 원천징수(8.8%) 신고 시 5년간 경비 처리 가능합니다.',
  },
};

function getCostGuideTip(key: string, category: '고정' | '변동', name: string): CostGuideTip {
  if (COST_GUIDE_TIPS[key]) {
    return COST_GUIDE_TIPS[key];
  }
  return {
    benchmark: category === '변동' ? '매출 연동 변동비 항목' : '월 정액 고정비 항목',
    guide:
      category === '변동'
        ? `'${name}'은(는) 매출이 늘수록 함께 증가하는 변동비입니다. 계약서상 산정 기준(공급가액 vs 결제액)과 최소·최대 한도를 점검하세요.`
        : `'${name}'은(는) 매출과 무관하게 매월 지출되는 고정비입니다. 연간 약정 할인이나 불필요한 중복 옵션을 분기별로 점검해 고정비 부담을 낮추세요.`,
    taxTip:
      '건당 3만원을 초과하는 사업 지출은 반드시 세금계산서·계산서·사업자 신용카드·지출증빙 현금영수증 등 적격증빙을 수취해야 증빙불비 가산세(2%) 없이 전액 경비로 인정됩니다.',
  };
}

interface ExtendedCostSensitivityRow {
  id: string;
  group: string;
  label: string;
  direction: 'down' | 'up';
  totalMonthlyCost: number;
  costDelta: number;
  monthlyOperatingProfit: number;
  profitDelta: number;
  operatingProfitMargin: number;
  breakEvenRevenue: number;
  paybackPeriodMonths: number;
}

interface S4BottomLineProps {
  candidate: CandidateLocation;
  onChange: (updated: CandidateLocation) => void;
  onNext: () => void;
  onPrev: () => void;
}

function getRecommendedOperatingOverheads(candidate: CandidateLocation): {
  utilityBreakdown: UtilityCostBreakdown;
  taxBreakdown: TaxCostBreakdown;
  marketingBreakdown: MarketingCostBreakdown;
  otherFixedCost: number;
} {
  const pyeong = Math.max(8, Math.round((candidate.areaSqm || 50) * 0.3025));
  const areaFactor = Math.min(2.6, Math.max(0.75, pyeong / 20));
  const isFoodOrHospitality = ['cafe', 'restaurant', 'pub', 'snack', 'bakery'].includes(
    candidate.businessType
  );
  const isHeavyKitchen = ['restaurant', 'bakery', 'snack'].includes(candidate.businessType);
  const isHighElectric = ['entertainment', 'bakery', 'cafe', 'fitness'].includes(
    candidate.businessType
  );

  const electricity = Math.round((isHighElectric ? 38 : isFoodOrHospitality ? 32 : 22) * areaFactor);
  const water = Math.round((isFoodOrHospitality ? 10 : 4) * areaFactor);
  const gas = isHeavyKitchen
    ? Math.round(22 * areaFactor)
    : isFoodOrHospitality
    ? Math.round(12 * areaFactor)
    : Math.round(5 * areaFactor);
  const internetPos = isFoodOrHospitality ? 12 : 10;

  const isHighRevenue = (candidate.grossRevenue || 0) >= 5000;
  const bookkeepingFee = isHighRevenue ? 17 : 12;
  const taxFilingReserve = isHighRevenue ? 10 : 6;
  const localTaxAndInsurance = Math.round((isFoodOrHospitality ? 6 : 5) * Math.min(1.6, areaFactor));

  const onlineAds = isHighRevenue ? 30 : 20;
  const deliveryPromotion =
    (candidate.deliveryRatio || 0) >= 10
      ? Math.round(15 + (candidate.deliveryRatio || 0) * 0.4)
      : (candidate.deliveryRatio || 0) > 0
      ? 10
      : 0;
  const offlineEvent = isHighRevenue ? 15 : 10;

  return {
    utilityBreakdown: {
      electricity,
      water,
      gas,
      internetPos,
    },
    taxBreakdown: {
      bookkeepingFee,
      taxFilingReserve,
      localTaxAndInsurance,
    },
    marketingBreakdown: {
      onlineAds,
      deliveryPromotion,
      offlineEvent,
    },
    otherFixedCost: 10,
  };
}

export const S4BottomLine: React.FC<S4BottomLineProps> = ({
  candidate,
  onChange,
  onNext,
  onPrev,
}) => {
  const [showFormula, setShowFormula] = useState(false);
  const [hoveredCostKey, setHoveredCostKey] = useState<string | null>(null);
  const [selectedCostKey, setSelectedCostKey] = useState<string | null>(null);
  const [expandedAnalyticsMode, setExpandedAnalyticsMode] = useState<'none' | 'summary' | 'pie' | 'both'>('none');
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [sensitivityTab, setSensitivityTab] = useState<'both' | 'revenue' | 'cost'>('both');

  useEffect(() => {
    if (!isAnalyticsModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAnalyticsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnalyticsModalOpen]);

  const metrics: FinancialMetrics = calculateFinancialMetrics(candidate);
  const sensitivityRows = simulateRevenueSensitivity(candidate);
  const coreCostSensitivityRows = simulateCostSensitivity(candidate, 10);

  const buildCostScenarioRow = (
    id: string,
    group: string,
    label: string,
    direction: 'down' | 'up',
    override: Partial<CandidateLocation>
  ): ExtendedCostSensitivityRow => {
    const m = calculateFinancialMetrics({
      ...candidate,
      ...override,
    });
    return {
      id,
      group,
      label,
      direction,
      totalMonthlyCost: m.totalMonthlyCost,
      costDelta: m.totalMonthlyCost - metrics.totalMonthlyCost,
      monthlyOperatingProfit: m.monthlyOperatingProfit,
      profitDelta: m.monthlyOperatingProfit - metrics.monthlyOperatingProfit,
      operatingProfitMargin: m.operatingProfitMargin,
      breakEvenRevenue: m.breakEvenRevenue,
      paybackPeriodMonths: m.paybackPeriodMonths,
    };
  };

  const overheadScale = (factor: number): Partial<CandidateLocation> => ({
    utilityCost: (candidate.utilityCost || 0) * factor,
    utilityBreakdown: candidate.utilityBreakdown
      ? {
          electricity: candidate.utilityBreakdown.electricity * factor,
          water: candidate.utilityBreakdown.water * factor,
          gas: candidate.utilityBreakdown.gas * factor,
          internetPos: candidate.utilityBreakdown.internetPos * factor,
        }
      : undefined,
    taxCost: (candidate.taxCost || 0) * factor,
    taxBreakdown: candidate.taxBreakdown
      ? {
          bookkeepingFee: candidate.taxBreakdown.bookkeepingFee * factor,
          taxFilingReserve: candidate.taxBreakdown.taxFilingReserve * factor,
          localTaxAndInsurance: candidate.taxBreakdown.localTaxAndInsurance * factor,
        }
      : undefined,
    marketingCost: (candidate.marketingCost || 0) * factor,
    marketingBreakdown: candidate.marketingBreakdown
      ? {
          onlineAds: candidate.marketingBreakdown.onlineAds * factor,
          deliveryPromotion: candidate.marketingBreakdown.deliveryPromotion * factor,
          offlineEvent: candidate.marketingBreakdown.offlineEvent * factor,
        }
      : undefined,
    otherFixedCost: (candidate.otherFixedCost || 0) * factor,
  });

  const costSensitivityRows: ExtendedCostSensitivityRow[] = [
    buildCostScenarioRow('cogs_down', '원가', '원가율 -3%p', 'down', {
      costOfGoodsRate: Math.max(0, candidate.costOfGoodsRate - 3),
    }),
    buildCostScenarioRow('cogs_up', '원가', '원가율 +3%p', 'up', {
      costOfGoodsRate: Math.min(90, candidate.costOfGoodsRate + 3),
    }),
    buildCostScenarioRow('labor_down', '인건비', '직원 인건비 -10%', 'down', {
      fullTimeStaff: candidate.fullTimeStaff * 0.9,
    }),
    buildCostScenarioRow('labor_up', '인건비', '직원 인건비 +10%', 'up', {
      fullTimeStaff: candidate.fullTimeStaff * 1.1,
    }),
    buildCostScenarioRow('rent_down', '임대료', '임대료 -10%', 'down', {
      monthlyRent: candidate.monthlyRent * 0.9,
    }),
    buildCostScenarioRow('rent_up', '임대료', '임대료 +10%', 'up', {
      monthlyRent: candidate.monthlyRent * 1.1,
    }),
    buildCostScenarioRow('overhead_down', '운영비', '공과·세무·마케팅 -20%', 'down', overheadScale(0.8)),
    buildCostScenarioRow('overhead_up', '운영비', '공과·세무·마케팅 +20%', 'up', overheadScale(1.2)),
    buildCostScenarioRow('both_down', '복합', '임대료+인건비 동시 -10%', 'down', {
      monthlyRent: candidate.monthlyRent * 0.9,
      fullTimeStaff: candidate.fullTimeStaff * 0.9,
    }),
    buildCostScenarioRow('both_up', '복합', '임대료+인건비 동시 +10%', 'up', {
      monthlyRent: candidate.monthlyRent * 1.1,
      fullTimeStaff: candidate.fullTimeStaff * 1.1,
    }),
  ];

  const revMinus15Row = sensitivityRows.find((r) => r.deltaPercent === -15);
  const bothCostPlus10Row =
    coreCostSensitivityRows.find((r) => r.id === 'both_up') ??
    costSensitivityRows.find((r) => r.id === 'both_up');
  const cogsPlus3Row = costSensitivityRows.find((r) => r.id === 'cogs_up');
  const laborPlus10Row = costSensitivityRows.find((r) => r.id === 'labor_up');
  const rentPlus10Row = costSensitivityRows.find((r) => r.id === 'rent_up');

  const utilityBreakdown: UtilityCostBreakdown = candidate.utilityBreakdown ?? {
    electricity: candidate.utilityCost || 0,
    water: 0,
    gas: 0,
    internetPos: 0,
  };

  const taxBreakdown: TaxCostBreakdown = candidate.taxBreakdown ?? {
    bookkeepingFee: candidate.taxCost || 0,
    taxFilingReserve: 0,
    localTaxAndInsurance: 0,
  };

  const marketingBreakdown: MarketingCostBreakdown = candidate.marketingBreakdown ?? {
    onlineAds: candidate.marketingCost || 0,
    deliveryPromotion: 0,
    offlineEvent: 0,
  };

  const updateUtilityField = (field: keyof UtilityCostBreakdown, rawValue: string) => {
    const val = Math.max(0, parseFloat(rawValue) || 0);
    const nextBreakdown: UtilityCostBreakdown = {
      ...utilityBreakdown,
      [field]: val,
    };
    const nextSum =
      nextBreakdown.electricity +
      nextBreakdown.water +
      nextBreakdown.gas +
      nextBreakdown.internetPos;
    onChange({
      ...candidate,
      utilityBreakdown: nextBreakdown,
      utilityCost: Math.round(nextSum * 10) / 10,
    });
  };

  const updateTaxField = (field: keyof TaxCostBreakdown, rawValue: string) => {
    const val = Math.max(0, parseFloat(rawValue) || 0);
    const nextBreakdown: TaxCostBreakdown = {
      ...taxBreakdown,
      [field]: val,
    };
    const nextSum =
      nextBreakdown.bookkeepingFee +
      nextBreakdown.taxFilingReserve +
      nextBreakdown.localTaxAndInsurance;
    onChange({
      ...candidate,
      taxBreakdown: nextBreakdown,
      taxCost: Math.round(nextSum * 10) / 10,
    });
  };

  const updateMarketingField = (field: keyof MarketingCostBreakdown, rawValue: string) => {
    const val = Math.max(0, parseFloat(rawValue) || 0);
    const nextBreakdown: MarketingCostBreakdown = {
      ...marketingBreakdown,
      [field]: val,
    };
    const nextSum =
      nextBreakdown.onlineAds +
      nextBreakdown.deliveryPromotion +
      nextBreakdown.offlineEvent;
    onChange({
      ...candidate,
      marketingBreakdown: nextBreakdown,
      marketingCost: Math.round(nextSum * 10) / 10,
    });
  };

  const handleApplyRecommendedOverheads = () => {
    const rec = getRecommendedOperatingOverheads(candidate);
    const nextUtilitySum =
      rec.utilityBreakdown.electricity +
      rec.utilityBreakdown.water +
      rec.utilityBreakdown.gas +
      rec.utilityBreakdown.internetPos;
    const nextTaxSum =
      rec.taxBreakdown.bookkeepingFee +
      rec.taxBreakdown.taxFilingReserve +
      rec.taxBreakdown.localTaxAndInsurance;
    const nextMarketingSum =
      rec.marketingBreakdown.onlineAds +
      rec.marketingBreakdown.deliveryPromotion +
      rec.marketingBreakdown.offlineEvent;

    onChange({
      ...candidate,
      utilityBreakdown: rec.utilityBreakdown,
      utilityCost: nextUtilitySum,
      taxBreakdown: rec.taxBreakdown,
      taxCost: nextTaxSum,
      marketingBreakdown: rec.marketingBreakdown,
      marketingCost: nextMarketingSum,
      otherFixedCost: rec.otherFixedCost,
    });
  };

  const handleResetOverheads = () => {
    onChange({
      ...candidate,
      utilityBreakdown: { electricity: 0, water: 0, gas: 0, internetPos: 0 },
      utilityCost: 0,
      taxBreakdown: { bookkeepingFee: 0, taxFilingReserve: 0, localTaxAndInsurance: 0 },
      taxCost: 0,
      marketingBreakdown: { onlineAds: 0, deliveryPromotion: 0, offlineEvent: 0 },
      marketingCost: 0,
      otherFixedCost: 0,
    });
  };

  const customCosts: CustomCostItem[] = candidate.customCosts ?? [];

  const handleAddCustomCost = (preset?: {
    name: string;
    costType: 'fixed' | 'variable_rate';
    amount: number;
    memo?: string;
  }) => {
    const newItem: CustomCostItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: preset?.name ?? `추가 비용 항목 ${customCosts.length + 1}`,
      costType: preset?.costType ?? 'fixed',
      amount: preset?.amount ?? 0,
      memo: preset?.memo ?? '',
    };
    onChange({
      ...candidate,
      customCosts: [...customCosts, newItem],
    });
  };

  const handleUpdateCustomCost = (
    id: string,
    patch: Partial<Omit<CustomCostItem, 'id'>>
  ) => {
    onChange({
      ...candidate,
      customCosts: customCosts.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  };

  const handleRemoveCustomCost = (id: string) => {
    onChange({
      ...candidate,
      customCosts: customCosts.filter((item) => item.id !== id),
    });
  };

  const adjustCog = (delta: number) => {
    const nextVal = Math.min(80, Math.max(5, candidate.costOfGoodsRate + delta));
    onChange({ ...candidate, costOfGoodsRate: nextVal });
  };

  const adjustStaff = (delta: number) => {
    const nextVal = Math.min(20, Math.max(0, candidate.fullTimeStaff + delta));
    onChange({ ...candidate, fullTimeStaff: nextVal });
  };

  const revenueShare = (amount: number) =>
    metrics.monthlyRevenue > 0 ? ((amount / metrics.monthlyRevenue) * 100).toFixed(1) : '0.0';

  const totalCostRatio =
    metrics.monthlyRevenue > 0 ? (metrics.totalMonthlyCost / metrics.monthlyRevenue) * 100 : 0;

  const totalCostBase = Math.max(0, metrics.totalMonthlyCost);
  const variableCostOfTotalPct =
    totalCostBase > 0 ? (metrics.totalVariableCost / totalCostBase) * 100 : 0;
  const fixedCostOfTotalPct =
    totalCostBase > 0 ? (metrics.totalFixedCost / totalCostBase) * 100 : 0;

  const costOfGoodsAmount = Math.max(
    0,
    metrics.monthlyRevenue * ((candidate.costOfGoodsRate || 0) / 100)
  );
  const feeAndOtherVariableCost = Math.max(
    0,
    metrics.totalVariableCost - costOfGoodsAmount - metrics.customVariableCostTotal
  );
  const totalLaborWithOwner = metrics.laborCost + (candidate.ownerSalary || 0);
  const depAndOtherFixedCost = metrics.monthlyDepreciation + metrics.otherFixedCostTotal;

  const customPieEntries = customCosts.map((item, idx) => {
    const monthlyConverted =
      item.costType === 'fixed'
        ? Math.max(0, Number(item.amount) || 0)
        : Math.max(0, metrics.monthlyRevenue * ((Number(item.amount) || 0) / 100));
    return {
      key: `custom_${item.id}`,
      name: item.name.trim() || `추가 항목 ${idx + 1}`,
      category: (item.costType === 'fixed' ? '고정' : '변동') as '고정' | '변동',
      amount: monthlyConverted,
      color: CUSTOM_COST_COLORS[idx % CUSTOM_COST_COLORS.length],
    };
  });

  const costBreakdownItems = [
    {
      key: 'cogs',
      name: '원가 (식자재·상품)',
      category: '변동' as const,
      amount: costOfGoodsAmount,
      color: '#f59e0b',
    },
    {
      key: 'variable_fees',
      name: '카드·배달·기타 변동비',
      category: '변동' as const,
      amount: Math.max(0, feeAndOtherVariableCost),
      color: '#f97316',
    },
    {
      key: 'labor',
      name: '인건비 (직원·대표)',
      category: '고정' as const,
      amount: Math.max(0, totalLaborWithOwner),
      color: '#2563eb',
    },
    {
      key: 'rent',
      name: '임대료 · 관리비',
      category: '고정' as const,
      amount: Math.max(0, metrics.monthlyRentAndMaintenance),
      color: '#4f46e5',
    },
    {
      key: 'utility',
      name: '공과금',
      category: '고정' as const,
      amount: Math.max(0, metrics.utilityCostTotal),
      color: '#06b6d4',
    },
    {
      key: 'tax',
      name: '세무 비용',
      category: '고정' as const,
      amount: Math.max(0, metrics.taxCostTotal),
      color: '#10b981',
    },
    {
      key: 'marketing',
      name: '홍보 · 마케팅',
      category: '고정' as const,
      amount: Math.max(0, metrics.marketingCostTotal),
      color: '#9333ea',
    },
    {
      key: 'depreciation_other',
      name: '감가상각 · 기타고정',
      category: '고정' as const,
      amount: Math.max(0, depAndOtherFixedCost),
      color: '#64748b',
    },
    ...customPieEntries,
  ].map((item) => ({
    ...item,
    roundedAmount: Math.round(item.amount),
    sharePct: totalCostBase > 0 ? (item.amount / totalCostBase) * 100 : 0,
  }));

  const pieChartData = costBreakdownItems.filter((item) => item.amount > 0);
  const activeCostKey = hoveredCostKey ?? selectedCostKey;
  const activeCostItem =
    costBreakdownItems.find((item) => item.key === activeCostKey) ?? null;
  const selectedCostItem =
    costBreakdownItems.find((item) => item.key === selectedCostKey) ?? null;
  const selectedCostGuide = selectedCostItem
    ? getCostGuideTip(selectedCostItem.key, selectedCostItem.category, selectedCostItem.name)
    : null;

  const customTotalMonthly = metrics.customFixedCostTotal + metrics.customVariableCostTotal;

  const toggleAnalyticsPanel = (mode: 'summary' | 'pie' | 'both') => {
    setExpandedAnalyticsMode((prev) => (prev === mode ? 'none' : mode));
  };

  const scrollToSensitivity = () => {
    const el = document.getElementById('s4-sensitivity-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderAutoSumCard = (isModalView: boolean) => (
    <div
      className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between gap-4 tabular-nums ${
        isModalView ? '' : 'shadow-xs'
      }`}
    >
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
            <Layers className="w-4 h-4 text-blue-600 flex-shrink-0" />
            월간 고정비 · 변동비 자동 합산
          </h3>
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
            실시간 자동 계산
          </span>
        </div>

        {/* Total Monthly Cost Banner + Variable/Fixed Ratio Bar */}
        <div className="rounded-xl bg-slate-900 text-white p-3.5 space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-300">월 총비용 합계</span>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black text-white">
                {Math.round(metrics.totalMonthlyCost).toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-slate-300 ml-1">만원/월</span>
            </div>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-700 overflow-hidden flex">
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, variableCostOfTotalPct))}%` }}
              title={`월 변동비 비중 ${variableCostOfTotalPct.toFixed(1)}%`}
            />
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, fixedCostOfTotalPct))}%` }}
              title={`월 고정비 비중 ${fixedCostOfTotalPct.toFixed(1)}%`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-amber-400 inline-block" />
              변동비 {variableCostOfTotalPct.toFixed(1)}%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-blue-500 inline-block" />
              고정비 {fixedCostOfTotalPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Variable vs Fixed Auto-Sum Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Variable Cost Card */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-amber-800">월 변동비 합계</span>
              <span className="text-[10px] font-bold text-amber-700">
                v={(metrics.variableCostRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 leading-none">
              {Math.round(metrics.totalVariableCost).toLocaleString()}
              <span className="text-[11px] font-semibold text-slate-500 ml-0.5">만원</span>
            </div>
            <div className="pt-1.5 border-t border-amber-200/60 space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between gap-1">
                <span className="truncate">원가 ({candidate.costOfGoodsRate}%)</span>
                <span className="font-bold text-slate-800 flex-shrink-0">
                  {Math.round(costOfGoodsAmount).toLocaleString()}만
                </span>
              </div>
              <div className="flex justify-between gap-1">
                <span className="truncate">카드·배달·기타{metrics.customVariableCostTotal > 0 ? '·추가' : ''}</span>
                <span className="font-bold text-slate-800 flex-shrink-0">
                  {Math.round(feeAndOtherVariableCost + metrics.customVariableCostTotal).toLocaleString()}만
                </span>
              </div>
            </div>
          </div>

          {/* Fixed Cost Card */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-blue-800">월 고정비 합계</span>
              <span className="text-[10px] font-bold text-blue-700">
                매출 {revenueShare(metrics.totalFixedCost)}%
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 leading-none">
              {Math.round(metrics.totalFixedCost).toLocaleString()}
              <span className="text-[11px] font-semibold text-slate-500 ml-0.5">만원</span>
            </div>
            <div className="pt-1.5 border-t border-blue-200/60 space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between gap-1">
                <span className="truncate">인건·임대료</span>
                <span className="font-bold text-slate-800 flex-shrink-0">
                  {Math.round(totalLaborWithOwner + metrics.monthlyRentAndMaintenance).toLocaleString()}만
                </span>
              </div>
              <div className="flex justify-between gap-1">
                <span className="truncate">공과·세무·마케팅·상각{metrics.customFixedCostTotal > 0 ? '·추가' : ''}</span>
                <span className="font-bold text-slate-800 flex-shrink-0">
                  {Math.round(metrics.utilityAndOtherFixedCost + metrics.customFixedCostTotal + metrics.monthlyDepreciation).toLocaleString()}만
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-[11px] text-slate-600 leading-snug">
        {fixedCostOfTotalPct >= 55 ? (
          <>
            <strong className="text-blue-700">고정비 비중({fixedCostOfTotalPct.toFixed(0)}%)</strong>이 높아 비수기 매출 하락 시 손익 방어가 중요합니다. 임대료·인건비 효율 점검을 권장합니다.
          </>
        ) : (
          <>
            <strong className="text-amber-700">변동비 비중({variableCostOfTotalPct.toFixed(0)}%)</strong>이 높아 원가율·배달 수수료 절감이 순이익 개선에 직결됩니다.
          </>
        )}
      </div>
    </div>
  );

  const renderPieBreakdownCard = (isModalView: boolean) => (
    <div
      className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3.5 tabular-nums ${
        isModalView ? '' : 'shadow-xs'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
          <PieChartIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          총비용 대비 항목별 비중
        </h3>
        <span className="text-[11px] font-semibold text-indigo-600 whitespace-nowrap">
          항목 클릭 시 상세 가이드 · 절세 팁 표시
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Donut Chart with Dynamic Non-Overlapping Center Readout */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          {pieChartData.length > 0 ? (
            <>
              <div className={`relative w-full mx-auto ${isModalView ? 'max-w-[260px] h-[250px]' : 'max-w-[230px] h-[220px]'}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={isModalView ? 66 : 58}
                      outerRadius={isModalView ? 102 : 90}
                      paddingAngle={2}
                      stroke="#ffffff"
                      strokeWidth={2}
                      isAnimationActive={false}
                      onMouseEnter={(_, idx) => {
                        const target = pieChartData[idx];
                        if (target) setHoveredCostKey(target.key);
                      }}
                      onMouseLeave={() => setHoveredCostKey(null)}
                      onClick={(_, idx) => {
                        const target = pieChartData[idx];
                        if (target) {
                          setSelectedCostKey((prev) => (prev === target.key ? null : target.key));
                        }
                      }}
                    >
                      {pieChartData.map((entry) => {
                        const isSelected = selectedCostKey === entry.key;
                        const isHighlighted =
                          activeCostKey === null || activeCostKey === entry.key;
                        return (
                          <Cell
                            key={entry.key}
                            fill={entry.color}
                            fillOpacity={isHighlighted ? 1 : 0.32}
                            stroke={isSelected ? '#0f172a' : '#ffffff'}
                            strokeWidth={isSelected ? 3 : 2}
                            className="cursor-pointer transition-opacity duration-150"
                          />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Readout (Never Covered by Tooltip) */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  {activeCostItem ? (
                    <>
                      <span className="text-[10px] font-bold text-slate-500 truncate max-w-[115px]">
                        {activeCostItem.name}
                      </span>
                      <span className="text-base font-black text-slate-900 leading-tight mt-0.5">
                        {activeCostItem.roundedAmount.toLocaleString()}만
                      </span>
                      <span
                        className="text-[11px] font-extrabold mt-0.5"
                        style={{ color: activeCostItem.color }}
                      >
                        {activeCostItem.sharePct.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-slate-400">월 총비용</span>
                      <span className="text-lg font-black text-slate-900 leading-tight mt-0.5">
                        {Math.round(metrics.totalMonthlyCost).toLocaleString()}만
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                        매출의 {totalCostRatio.toFixed(1)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-[10.5px] text-slate-400 text-center mt-1">
                차트 조각 또는 우측 항목을 클릭해 가이드 확인
              </p>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
              비용 항목을 입력하면 원형 차트가 표시됩니다.
            </div>
          )}
        </div>

        {/* Interactive Tabular Breakdown List */}
        <div className="sm:col-span-7 space-y-1.5">
          {costBreakdownItems.map((item) => {
            const isSelected = selectedCostKey === item.key;
            const isHovered = hoveredCostKey === item.key;
            const isZero = item.amount <= 0;
            return (
              <button
                key={item.key}
                type="button"
                onMouseEnter={() => setHoveredCostKey(item.key)}
                onMouseLeave={() => setHoveredCostKey(null)}
                onClick={() =>
                  setSelectedCostKey((prev) => (prev === item.key ? null : item.key))
                }
                aria-pressed={isSelected}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs'
                    : isHovered
                    ? 'bg-slate-50 border-slate-300'
                    : 'bg-white border-transparent hover:bg-slate-50/70'
                } ${isZero ? 'opacity-55' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-2.5 h-2.5 rounded-xs flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">
                    · {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                  <span className="font-extrabold text-slate-900">
                    {item.roundedAmount.toLocaleString()}만
                  </span>
                  <span className="w-11 text-right font-bold text-slate-500 text-[11px]">
                    {item.sharePct.toFixed(1)}%
                  </span>
                  <Lightbulb
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                      isSelected ? 'text-amber-500' : 'text-slate-300'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Click-Triggered Cost Guide & Tax-Saving Tip Tooltip Card */}
      {selectedCostItem && selectedCostGuide ? (
        <div
          role="region"
          aria-label={`${selectedCostItem.name} 상세 가이드 및 절세 팁`}
          className="relative rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 sm:p-4 space-y-2.5"
        >
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200/80">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-xs flex-shrink-0"
                  style={{ backgroundColor: selectedCostItem.color }}
                />
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {selectedCostItem.name}
                </span>
                <span className="text-xs font-bold text-slate-600 tabular-nums">
                  월 {selectedCostItem.roundedAmount.toLocaleString()}만원 ({selectedCostItem.sharePct.toFixed(1)}%)
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {selectedCostGuide.benchmark}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCostKey(null)}
              aria-label="가이드 툴팁 닫기"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
            <div className="rounded-lg bg-white border border-slate-200/80 p-3 space-y-1">
              <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-[11px]">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                항목별 운영 가이드
              </div>
              <p className="text-slate-600 text-[11.5px]">{selectedCostGuide.guide}</p>
            </div>
            <div className="rounded-lg bg-emerald-50/60 border border-emerald-200/80 p-3 space-y-1">
              <div className="flex items-center gap-1.5 font-extrabold text-emerald-800 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                절세 · 경비처리 팁
              </div>
              <p className="text-emerald-950/85 text-[11.5px]">{selectedCostGuide.taxTip}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-50/70 border border-dashed border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span>
              원형 차트의 각 비용 영역이나 우측 항목을 클릭하면 <strong>상세 운영 가이드와 절세 팁</strong>이 바로 표시됩니다.
            </span>
          </div>
          {pieChartData[0] && (
            <button
              type="button"
              onClick={() => setSelectedCostKey(pieChartData[0].key)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap flex-shrink-0 cursor-pointer"
            >
              {pieChartData[0].name.split(' ')[0]} 팁 보기 →
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold mb-1.5">
            <Calculator className="w-3.5 h-3.5" />
            04 BOTTOM-LINE (그래서 남는가)
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
            비용 구조 · 손익분기점 · 민감도 분석
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            원가·인건비·임대료와 항목별 공과금·세무비용·홍보마케팅 예산, 감가상각까지 모두 반영해 실질 영업이익과 회수기간을 도출합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onPrev}
            className="h-10 min-w-[76px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold inline-flex items-center justify-center transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            이전
          </button>
          <button
            type="button"
            onClick={onNext}
            className="h-10 min-w-[168px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <span>다음: 05 규제 점검</span>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Real-Time Total Monthly Cost Composition Bar + Compact Expandable Analytics Controls */}
      <div className="rounded-2xl bg-slate-900 text-white p-4 sm:p-5 space-y-3 tabular-nums shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-700/80">
          <div>
            <span className="text-[11px] font-bold text-blue-300 tracking-wider">
              월 총비용 반영 내역 (변동비 + 전체 고정비)
            </span>
            <div className="text-xs text-slate-300 mt-0.5">
              월 순매출 <strong className="text-white">{Math.round(metrics.monthlyRevenue).toLocaleString()}만원</strong> 기준 · 공과금·세무·홍보마케팅·기타
              {customTotalMonthly > 0 ? '·커스텀 항목' : ''} 합계{' '}
              <strong className="text-cyan-300">
                {Math.round(metrics.utilityAndOtherFixedCost + customTotalMonthly).toLocaleString()}만원
              </strong>{' '}
              포함
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-lg sm:text-xl font-black text-white">
              월 총비용 {Math.round(metrics.totalMonthlyCost).toLocaleString()}만원
            </div>
            <div className="text-[11px] text-slate-300">
              순매출 대비 {totalCostRatio.toFixed(1)}% · 잔여 영업이익{' '}
              <strong className={metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                {metrics.monthlyOperatingProfit >= 0 ? '+' : ''}
                {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만원
              </strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2">
            <div className="text-[10px] text-slate-400">원가·변동비</div>
            <div className="font-extrabold text-amber-300 mt-0.5">
              {Math.round(metrics.totalVariableCost).toLocaleString()}만
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2">
            <div className="text-[10px] text-slate-400">인건비(대표포함)</div>
            <div className="font-extrabold text-blue-300 mt-0.5">
              {Math.round(metrics.laborCost + candidate.ownerSalary).toLocaleString()}만
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2">
            <div className="text-[10px] text-slate-400">임대료·관리비</div>
            <div className="font-extrabold text-indigo-300 mt-0.5">
              {Math.round(metrics.monthlyRentAndMaintenance).toLocaleString()}만
            </div>
          </div>
          <div className="rounded-xl bg-cyan-500/15 border border-cyan-400/30 px-3 py-2">
            <div className="text-[10px] text-cyan-200">월 공과금</div>
            <div className="font-extrabold text-cyan-300 mt-0.5">
              {Math.round(metrics.utilityCostTotal).toLocaleString()}만
            </div>
          </div>
          <div className="rounded-xl bg-amber-500/15 border border-amber-400/30 px-3 py-2">
            <div className="text-[10px] text-amber-200">
              세무·기타{metrics.customFixedCostTotal > 0 ? '·추가고정' : ''}
            </div>
            <div className="font-extrabold text-amber-300 mt-0.5">
              {Math.round(
                metrics.taxCostTotal + metrics.otherFixedCostTotal + metrics.customFixedCostTotal
              ).toLocaleString()}만
            </div>
          </div>
          <div className="rounded-xl bg-purple-500/15 border border-purple-400/30 px-3 py-2">
            <div className="text-[10px] text-purple-200">홍보·마케팅 / 상각</div>
            <div className="font-extrabold text-purple-300 mt-0.5">
              {Math.round(metrics.marketingCostTotal).toLocaleString()}만
              <span className="text-[10px] text-slate-400 font-normal">
                {' '}/ {Math.round(metrics.monthlyDepreciation).toLocaleString()}만
              </span>
            </div>
          </div>
        </div>

        {/* Compact Expandable Analytics Trigger Bar (Replaces Always-Expanded Heavy Block) */}
        <div className="pt-2.5 border-t border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] text-slate-300 whitespace-nowrap">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-amber-400 inline-block" />
                변동 {variableCostOfTotalPct.toFixed(0)}%
              </span>
              <span className="text-slate-500">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-blue-400 inline-block" />
                고정 {fixedCostOfTotalPct.toFixed(0)}%
              </span>
            </div>
            <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-slate-700 overflow-hidden flex">
              <div
                className="bg-amber-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, variableCostOfTotalPct))}%` }}
              />
              <div
                className="bg-blue-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, fixedCostOfTotalPct))}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => toggleAnalyticsPanel('summary')}
              aria-expanded={expandedAnalyticsMode === 'summary' || expandedAnalyticsMode === 'both'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                expandedAnalyticsMode === 'summary'
                  ? 'bg-blue-500/25 border-blue-400/60 text-white'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
              <span>고정·변동비 합산</span>
              {expandedAnalyticsMode === 'summary' ? (
                <ChevronUp className="w-3 h-3 text-slate-300" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => toggleAnalyticsPanel('pie')}
              aria-expanded={expandedAnalyticsMode === 'pie' || expandedAnalyticsMode === 'both'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                expandedAnalyticsMode === 'pie'
                  ? 'bg-indigo-500/25 border-indigo-400/60 text-white'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-slate-200'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5 text-indigo-300 flex-shrink-0" />
              <span>비중 차트 · 절세팁</span>
              {expandedAnalyticsMode === 'pie' ? (
                <ChevronUp className="w-3 h-3 text-slate-300" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsAnalyticsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="고정·변동비 합산과 항목별 원형 차트를 크게 확대해 확인"
            >
              <Maximize2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>크게 확대</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline Expandable Analytics Drawer (Only shown when user clicks a compact trigger icon above) */}
      {expandedAnalyticsMode !== 'none' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setExpandedAnalyticsMode('summary')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  expandedAnalyticsMode === 'summary'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                고정·변동비 합산
              </button>
              <button
                type="button"
                onClick={() => setExpandedAnalyticsMode('pie')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  expandedAnalyticsMode === 'pie'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                비중 차트 · 절세팁
              </button>
              <button
                type="button"
                onClick={() => setExpandedAnalyticsMode('both')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  expandedAnalyticsMode === 'both'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                함께 보기
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAnalyticsModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                전체 확대
              </button>
              <button
                type="button"
                onClick={() => setExpandedAnalyticsMode('none')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                접기
              </button>
            </div>
          </div>

          {expandedAnalyticsMode === 'both' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5">{renderAutoSumCard(false)}</div>
              <div className="lg:col-span-7">{renderPieBreakdownCard(false)}</div>
            </div>
          ) : expandedAnalyticsMode === 'summary' ? (
            renderAutoSumCard(false)
          ) : (
            renderPieBreakdownCard(false)
          )}
        </div>
      )}

      {/* 5-Card Executive KPI Summary Strip directly below Total Monthly Cost */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 tabular-nums">
        {/* 1. 월 매출 */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col justify-between gap-1.5">
          <div className="text-[11px] font-bold text-slate-500">월 매출 (공급가액 S)</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            {Math.round(metrics.monthlyRevenue).toLocaleString()}
            <span className="text-xs font-bold text-slate-500 ml-0.5">만원</span>
          </div>
          <div className="text-[11px] text-slate-500">
            결제액 {candidate.grossRevenue.toLocaleString()}만
            {candidate.isVatIncluded ? ' · 부가세 제외' : ''}
          </div>
        </div>

        {/* 2. 월 비용 */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col justify-between gap-1.5">
          <div className="text-[11px] font-bold text-slate-500">월 비용 (총비용)</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            {Math.round(metrics.totalMonthlyCost).toLocaleString()}
            <span className="text-xs font-bold text-slate-500 ml-0.5">만원</span>
          </div>
          <div className="text-[11px] text-slate-500">
            매출의 <strong className="text-slate-700">{totalCostRatio.toFixed(1)}%</strong> · 변 {Math.round(metrics.totalVariableCost).toLocaleString()} / 고 {Math.round(metrics.totalFixedCost).toLocaleString()}
          </div>
        </div>

        {/* 3. 영업이익 */}
        <div
          className={`rounded-2xl p-3.5 sm:p-4 border shadow-xs flex flex-col justify-between gap-1.5 ${
            metrics.monthlyOperatingProfit >= 0
              ? 'bg-emerald-50/40 border-emerald-200'
              : 'bg-rose-50/50 border-rose-200'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-600">영업이익 (실시간)</div>
          <div
            className={`text-lg sm:text-xl font-black leading-tight ${
              metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {metrics.monthlyOperatingProfit >= 0 ? '+' : ''}
            {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}
            <span className="text-xs font-bold opacity-80 ml-0.5">만원</span>
          </div>
          <div className="text-[11px] text-slate-600">
            이익률 {(metrics.operatingProfitMargin * 100).toFixed(1)}% · 현금흐름{' '}
            {Math.round(metrics.monthlyCashFlow).toLocaleString()}만
          </div>
        </div>

        {/* 4. 손익분기점 (BEP) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col justify-between gap-1.5">
          <div className="text-[11px] font-bold text-slate-500">손익분기점 (BEP)</div>
          <div className="text-lg sm:text-xl font-black text-blue-700 leading-tight">
            {Math.round(metrics.breakEvenRevenue).toLocaleString()}
            <span className="text-xs font-bold text-blue-600/80 ml-0.5">만원</span>
          </div>
          <div className="text-[11px] text-slate-500">
            안전여유율{' '}
            <strong className={metrics.marginOfSafety >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
              {(metrics.marginOfSafety * 100).toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* 5. 민감도 요약 */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-slate-500">민감도 요약</span>
            <button
              type="button"
              onClick={scrollToSensitivity}
              className="text-[10.5px] font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap cursor-pointer"
            >
              상세 ↓
            </button>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-1">
              <span className="text-slate-500 text-[11px]">매출 -15%</span>
              <strong
                className={`font-extrabold ${
                  (revMinus15Row?.monthlyOperatingProfit ?? 0) >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }`}
              >
                {(revMinus15Row?.monthlyOperatingProfit ?? 0) >= 0 ? '+' : ''}
                {Math.round(revMinus15Row?.monthlyOperatingProfit ?? 0).toLocaleString()}만
              </strong>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-slate-500 text-[11px]">임대·인건 +10%</span>
              <strong
                className={`font-extrabold ${
                  (bothCostPlus10Row?.monthlyOperatingProfit ?? 0) >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }`}
              >
                {(bothCostPlus10Row?.monthlyOperatingProfit ?? 0) >= 0 ? '+' : ''}
                {Math.round(bothCostPlus10Row?.monthlyOperatingProfit ?? 0).toLocaleString()}만
              </strong>
            </div>
          </div>
          <div className="text-[10.5px] text-slate-400">
            원가 +3%p 시{' '}
            <span className="font-bold text-slate-600">
              {Math.round(cogsPlus3Row?.profitDelta ?? 0).toLocaleString()}만
            </span>
          </div>
        </div>
      </div>

      {/* Enlarged Analytics & Pie Chart Zoom Modal */}
      {isAnalyticsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsAnalyticsModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="월간 비용 합산 및 항목별 비중 확대 보기"
        >
          <div
            className="bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-blue-300 flex-shrink-0" />
                  월간 고정비·변동비 자동 합산 및 항목별 비중 (확대 보기)
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5 tabular-nums">
                  월 총비용 {Math.round(metrics.totalMonthlyCost).toLocaleString()}만원 · 원형 차트나 우측 항목을 클릭하면 운영 가이드와 절세 팁이 표시됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAnalyticsModalOpen(false)}
                aria-label="확대 창 닫기"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5">{renderAutoSumCard(true)}</div>
                <div className="lg:col-span-7">{renderPieBreakdownCard(true)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Inputs Row: 1. Variable Costs & 2. Labor/Rent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Variable Costs (v) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Percent className="w-4 h-4 text-emerald-600" />
              1. 변동비 구조 (v = {(metrics.variableCostRate * 100).toFixed(1)}%)
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
              월 {Math.round(metrics.totalVariableCost).toLocaleString()}만원
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                <span>식자재 / 상품 원가율 (%)</span>
                <span className="text-emerald-700 text-sm font-black tabular-nums">{candidate.costOfGoodsRate}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="65"
                step="1"
                value={candidate.costOfGoodsRate}
                onChange={(e) => onChange({ ...candidate, costOfGoodsRate: parseFloat(e.target.value) || 0 })}
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400 tabular-nums">
                  월 {Math.round(metrics.monthlyRevenue * (candidate.costOfGoodsRate / 100)).toLocaleString()}만원
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => adjustCog(-2)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold cursor-pointer"
                  >
                    -2%
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustCog(2)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold cursor-pointer"
                  >
                    +2%
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  카드 결제 비중 (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={candidate.cardRatio}
                    onChange={(e) => onChange({ ...candidate, cardRatio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  카드 수수료율 (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="3.0"
                    value={candidate.cardFeeRate}
                    onChange={(e) => onChange({ ...candidate, cardFeeRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  배달 매출 비중 (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    value={candidate.deliveryRatio}
                    onChange={(e) => onChange({ ...candidate, deliveryRatio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  배달 수수료율 (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="35"
                    value={candidate.deliveryFeeRate}
                    onChange={(e) => onChange({ ...candidate, deliveryFeeRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                기타 변동비율 (포장용기, 소모품 등 %)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={candidate.otherVariableRate}
                  onChange={(e) => onChange({ ...candidate, otherVariableRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Fixed Costs (F): Labor & Rent */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Users className="w-4 h-4 text-blue-600" />
              2. 인건비 · 임대료 핵심 고정비
            </h3>
            <span className="text-[11px] font-semibold text-blue-700 tabular-nums">
              월 {Math.round(metrics.laborCost + candidate.ownerSalary + metrics.monthlyRentAndMaintenance).toLocaleString()}만원
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  풀타임 환산 직원 수
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => adjustStaff(-0.5)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="30"
                    value={candidate.fullTimeStaff}
                    onChange={(e) => onChange({ ...candidate, fullTimeStaff: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-2 py-1.5 text-center text-xs font-bold border border-slate-300 rounded-lg outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => adjustStaff(0.5)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  적용 시급 (209h 기준)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    value={candidate.hourlyWage}
                    onChange={(e) => onChange({ ...candidate, hourlyWage: parseInt(e.target.value, 10) || 10030 })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">원</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600 tabular-nums">
              <div className="flex justify-between">
                <span>직원 순 인건비 (월 209h × {candidate.fullTimeStaff}명):</span>
                <span className="font-bold text-slate-800">
                  {Math.round((candidate.fullTimeStaff * candidate.hourlyWage * 209) / 10000).toLocaleString()}만원
                </span>
              </div>
              <div className="flex justify-between">
                <span>4대보험 사업주 부담 포함 (+{candidate.socialInsuranceRate}%):</span>
                <span className="font-semibold text-slate-800">
                  {Math.round(metrics.laborCost).toLocaleString()}만원
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                대표자 목표 인건비 (월 급여)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={candidate.ownerSalary}
                  onChange={(e) => onChange({ ...candidate, ownerSalary: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10 font-bold tabular-nums"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">만원</span>
              </div>
            </div>

            {/* Monthly Rent + Maintenance Summary & Quick Edit */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  월 임대료 (월세)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={candidate.monthlyRent}
                    onChange={(e) => onChange({ ...candidate, monthlyRent: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-9 font-bold tabular-nums"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                  월 관리비
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={candidate.maintenanceFee}
                    onChange={(e) => onChange({ ...candidate, maintenanceFee: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-9 font-bold tabular-nums"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Itemized Operating Overheads: Utilities, Tax & Admin, Marketing Budget */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Wallet className="w-4 h-4 text-cyan-600" />
              3. 공과금 · 세무 비용 · 홍보 마케팅 예산 (항목별 세분화)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              원가·인건비·임대료 외에 매월 지출되는 운영 고정비를 세부 항목별로 입력하면 월 총비용과 순영업이익에 즉시 합산됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleApplyRecommendedOverheads}
              className="h-9 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span>업종·면적 평균 자동 채우기</span>
            </button>
            <button
              type="button"
              onClick={handleResetOverheads}
              className="h-9 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
              <span>0원 초기화</span>
            </button>
          </div>
        </div>

        {/* 3-Column Itemized Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column A: Utilities */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                      공과금 (Utility)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      전기·수도·가스·통신/POS
                    </div>
                  </div>
                </div>
                <div className="text-right tabular-nums flex-shrink-0">
                  <div className="text-sm font-black text-cyan-700">
                    {Math.round(metrics.utilityCostTotal).toLocaleString()}만원
                  </div>
                  <div className="text-[10px] text-slate-500">
                    매출 대비 {revenueShare(metrics.utilityCostTotal)}%
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>전기요금</span>
                    <span className="font-normal text-slate-400">냉난방·조명·주방장비</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={utilityBreakdown.electricity}
                      onChange={(e) => updateUtilityField('electricity', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>수도요금</span>
                    <span className="font-normal text-slate-400">상하수도·세척</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={utilityBreakdown.water}
                      onChange={(e) => updateUtilityField('water', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>도시가스 · 열요금</span>
                    <span className="font-normal text-slate-400">취사·온수·난방</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={utilityBreakdown.gas}
                      onChange={(e) => updateUtilityField('gas', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>인터넷 · POS · 보안 · 렌탈</span>
                    <span className="font-normal text-slate-400">CCTV·정수기·키오스크</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={utilityBreakdown.internetPos}
                      onChange={(e) => updateUtilityField('internetPos', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column B: Tax & Admin */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                      세무 비용 (Tax &amp; Admin)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      기장·신고조정·보험/지방세
                    </div>
                  </div>
                </div>
                <div className="text-right tabular-nums flex-shrink-0">
                  <div className="text-sm font-black text-amber-700">
                    {Math.round(metrics.taxCostTotal).toLocaleString()}만원
                  </div>
                  <div className="text-[10px] text-slate-500">
                    매출 대비 {revenueShare(metrics.taxCostTotal)}%
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>월 세무 기장료</span>
                    <span className="font-normal text-slate-400">세무사 월 대행 수수료</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={taxBreakdown.bookkeepingFee}
                      onChange={(e) => updateTaxField('bookkeepingFee', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>신고조정 · 결산 월할</span>
                    <span className="font-normal text-slate-400">부가세·종소세 신고비 ÷ 12</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={taxBreakdown.taxFilingReserve}
                      onChange={(e) => updateTaxField('taxFilingReserve', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>지방세 · 화재/배상보험</span>
                    <span className="font-normal text-slate-400">주민세·다중이용배상 등</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={taxBreakdown.localTaxAndInsurance}
                      onChange={(e) => updateTaxField('localTaxAndInsurance', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-200/70">
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>기타 월 고정비 (선택)</span>
                    <span className="font-normal text-slate-400">로열티·방역·예비비</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={candidate.otherFixedCost ?? 0}
                      onChange={(e) =>
                        onChange({
                          ...candidate,
                          otherFixedCost: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column C: Marketing & Promotion Budget */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                      홍보 · 마케팅 예산
                    </div>
                    <div className="text-[11px] text-slate-500">
                      온라인·배달앱·오프라인
                    </div>
                  </div>
                </div>
                <div className="text-right tabular-nums flex-shrink-0">
                  <div className="text-sm font-black text-purple-700">
                    {Math.round(metrics.marketingCostTotal).toLocaleString()}만원
                  </div>
                  <div className="text-[10px] text-slate-500">
                    매출 대비 {revenueShare(metrics.marketingCostTotal)}%
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>온라인 · SNS · 플레이스 광고</span>
                    <span className="font-normal text-slate-400">네이버·인스타·검색</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={marketingBreakdown.onlineAds}
                      onChange={(e) => updateMarketingField('onlineAds', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>배달앱 프로모션 · 쿠폰</span>
                    <span className="font-normal text-slate-400">깃발·상단노출·할인</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={marketingBreakdown.deliveryPromotion}
                      onChange={(e) => updateMarketingField('deliveryPromotion', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                    <span>오프라인 · 체험단 · 이벤트</span>
                    <span className="font-normal text-slate-400">블로그·전단·브랜딩</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={marketingBreakdown.offlineEvent}
                      onChange={(e) => updateMarketingField('offlineEvent', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none pr-10 font-bold tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">만원</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/70 text-[11px] text-purple-900 leading-snug">
                  권장 가이드: 오픈 초기 6개월은 월 순매출의 <strong>2~5%</strong> 수준으로 홍보 예산을 반영하는 것이 안전합니다.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Cost Categories Section (+ 항목 추가) */}
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-pink-600 flex-shrink-0" />
                사용자 직접 추가 비용 항목 (커스텀 카테고리)
                {customCosts.length > 0 && (
                  <span className="text-[10px] font-black text-pink-700 bg-pink-50 border border-pink-200 px-1.5 py-0.5 rounded tabular-nums">
                    {customCosts.length}개 · 월 {Math.round(customTotalMonthly).toLocaleString()}만원
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                프랜차이즈 로열티, 주차 지원비, 방역·청소, 장비 리스 등 업종 특유의 월 고정비 또는 매출 연동 변동비(%)를 자유롭게 추가하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAddCustomCost()}
              className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              <span>항목 추가</span>
            </button>
          </div>

          {/* Quick-Add Preset Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 mr-1">빠른 추가:</span>
            {CUSTOM_COST_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleAddCustomCost(preset)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[11px] font-semibold text-slate-700 hover:text-blue-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-slate-400" />
                <span>{preset.name}</span>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  ({preset.costType === 'fixed' ? `${preset.amount}만` : `${preset.amount}%`})
                </span>
              </button>
            ))}
          </div>

          {/* Added Custom Cost Rows */}
          {customCosts.length > 0 && (
            <div className="space-y-2.5 pt-1">
              {customCosts.map((item, idx) => {
                const monthlyConverted =
                  item.costType === 'fixed'
                    ? Math.max(0, Number(item.amount) || 0)
                    : Math.max(0, metrics.monthlyRevenue * ((Number(item.amount) || 0) / 100));
                const swatchColor = CUSTOM_COST_COLORS[idx % CUSTOM_COST_COLORS.length];

                return (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white border border-slate-200 p-3 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="md:col-span-4">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1">
                        <span
                          className="w-2.5 h-2.5 rounded-xs flex-shrink-0"
                          style={{ backgroundColor: swatchColor }}
                        />
                        <span>비용 카테고리명</span>
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateCustomCost(item.id, { name: e.target.value })}
                        placeholder="예: 로열티, 주차지원비, 방역비"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        비용 구분
                      </label>
                      <select
                        value={item.costType}
                        onChange={(e) =>
                          handleUpdateCustomCost(item.id, {
                            costType: e.target.value === 'variable_rate' ? 'variable_rate' : 'fixed',
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="fixed">월 고정비 (만원)</option>
                        <option value="variable_rate">매출 연동 변동비 (%)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span>{item.costType === 'fixed' ? '월 금액' : '매출 비율'}</span>
                        {item.costType === 'variable_rate' && (
                          <span className="text-[10px] font-semibold text-blue-600 tabular-nums">
                            ≈ {Math.round(monthlyConverted).toLocaleString()}만
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step={item.costType === 'fixed' ? '1' : '0.5'}
                          min="0"
                          max={item.costType === 'fixed' ? undefined : '50'}
                          value={item.amount}
                          onChange={(e) =>
                            handleUpdateCustomCost(item.id, {
                              amount: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10 font-bold tabular-nums"
                        />
                        <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-bold">
                          {item.costType === 'fixed' ? '만원' : '%'}
                        </span>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        메모 (선택)
                      </label>
                      <input
                        type="text"
                        value={item.memo || ''}
                        onChange={(e) => handleUpdateCustomCost(item.id, { memo: e.target.value })}
                        placeholder="산출 근거"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                      />
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomCost(item.id)}
                        title="항목 삭제"
                        aria-label={`${item.name} 항목 삭제`}
                        className="h-8 w-full md:w-8 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Capex & Initial Investment Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 4. Capital Expenditure & Depreciation */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Hammer className="w-4 h-4 text-amber-600" />
              4. 인테리어·설비·초기 운전자금
            </h3>
            <span className="text-[11px] font-semibold text-amber-700 tabular-nums">
              월 {Math.round(metrics.monthlyDepreciation).toLocaleString()}만원 상각
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                인테리어 시공비
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  value={candidate.interiorCost}
                  onChange={(e) => onChange({ ...candidate, interiorCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">만</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                설비·집기·주방기기
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  value={candidate.equipmentCost}
                  onChange={(e) => onChange({ ...candidate, equipmentCost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">만</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                기타 초기 비용 (가맹·초도물량)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={candidate.otherInitialCost ?? 0}
                  onChange={(e) => onChange({ ...candidate, otherInitialCost: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">만</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                초기 운전자금 (예비 운영비)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={candidate.workingCapital ?? 0}
                  onChange={(e) => onChange({ ...candidate, workingCapital: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">만</span>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span>인테리어·설비 비용 배분기간 (감가상각)</span>
              <span className="tabular-nums text-amber-700">{candidate.depreciationMonths || 60}개월</span>
            </div>
            <input
              type="range"
              min="12"
              max="120"
              step="12"
              value={candidate.depreciationMonths || 60}
              onChange={(e) => onChange({ ...candidate, depreciationMonths: parseInt(e.target.value, 10) || 60 })}
              className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 tabular-nums">
              <span>12개월</span>
              <span>36개월</span>
              <span>60개월 (권장)</span>
              <span>120개월</span>
            </div>
          </div>
        </div>

        {/* 5. Initial Total Investment & Cash Requirement Summary */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              5. 초기 투자와 총 필요 현금
            </h3>
            <span className="text-[11px] font-semibold text-indigo-700 tabular-nums">
              총 필요자금 {Math.round(metrics.totalCashRequired).toLocaleString()}만원
            </span>
          </div>

          <div className="space-y-1.5 text-xs tabular-nums">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">바닥/시설 권리금:</span>
              <span className="font-bold text-slate-900">{(candidate.premium || 0).toLocaleString()}만원</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">인테리어 + 설비 집기 + 기타 초기비용:</span>
              <span className="font-bold text-slate-900">
                {((candidate.interiorCost || 0) + (candidate.equipmentCost || 0) + (candidate.otherInitialCost || 0)).toLocaleString()}만원
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">법정 중개보수 (상한 0.9%):</span>
              <span className="font-bold text-slate-900">{metrics.brokerageFee.toFixed(1)}만원</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-slate-900 border-b border-slate-200 bg-slate-50 px-2 rounded">
              <span>회수 대상 순투자금 (보증금·운전자금 제외):</span>
              <span className="text-indigo-700">{Math.round(metrics.initialInvestment).toLocaleString()}만원</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500">
              <span>임차 보증금 + 초기 운전자금 (회수 가능 자산):</span>
              <span className="font-semibold text-slate-800">
                {((candidate.deposit || 0) + (candidate.workingCapital || 0)).toLocaleString()}만원
              </span>
            </div>
            <div className="flex justify-between py-1.5 font-black text-slate-900 text-sm">
              <span>총 필요 현금 (계약 시 전액):</span>
              <span className="text-blue-700">{Math.round(metrics.totalCashRequired).toLocaleString()}만원</span>
            </div>
          </div>

          {/* Cost Omission Self-Check */}
          <label className={`mt-2 p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
            candidate.costChecked
              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}>
            <input
              type="checkbox"
              checked={!!candidate.costChecked}
              onChange={(e) => onChange({ ...candidate, costChecked: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
            <div className="text-xs leading-snug">
              <span className="font-bold block">
                비용 누락 여부 자가 점검 완료
              </span>
              <span className="text-[11px] opacity-85">
                공과금·세무비용·홍보마케팅·배달수수료·초기비용에 누락이 없으며, ‘0원’ 항목은 실제 지출이 없음을 확인했습니다.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Revenue & Cost Sensitivity Simulation Matrix */}
      <div
        id="s4-sensitivity-section"
        className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-5 scroll-mt-24"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
              매출 · 비용 변화에 따른 손익 민감도 분석
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              월 매출(±15%, ±30%) 변화뿐만 아니라 원가율·인건비·임대료·운영비 변동에 따른 영업이익·BEP·회수기간 방어력을 함께 점검합니다.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 self-start lg:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setSensitivityTab('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                sensitivityTab === 'both'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              전체 함께 보기
            </button>
            <button
              type="button"
              onClick={() => setSensitivityTab('revenue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                sensitivityTab === 'revenue'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              매출 변화
            </button>
            <button
              type="button"
              onClick={() => setSensitivityTab('cost')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                sensitivityTab === 'cost'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              비용 변화
            </button>
          </div>
        </div>

        {/* Baseline Profitability & Payback Reference Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 tabular-nums text-xs">
          <div className={`rounded-xl px-3.5 py-2.5 border flex items-center justify-between gap-2 ${
            metrics.monthlyOperatingProfit >= 0
              ? 'bg-emerald-50/50 border-emerald-200'
              : 'bg-rose-50/50 border-rose-200'
          }`}>
            <span className="font-bold text-slate-600">기준 월 영업이익</span>
            <div className="text-right">
              <strong className={`text-sm font-black ${
                metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {metrics.monthlyOperatingProfit >= 0 ? '+' : ''}
                {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만원
              </strong>
              <span className="text-[10px] text-slate-500 block">
                이익률 {(metrics.operatingProfitMargin * 100).toFixed(1)}% · 현금흐름 {Math.round(metrics.monthlyCashFlow).toLocaleString()}만
              </span>
            </div>
          </div>

          <div className="rounded-xl px-3.5 py-2.5 border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
            <span className="font-bold text-slate-600">손익분기점 (BEP)</span>
            <div className="text-right">
              <strong className="text-sm font-black text-blue-700">
                {Math.round(metrics.breakEvenRevenue).toLocaleString()}만원
              </strong>
              <span className="text-[10px] text-slate-500 block">
                안전여유율 {(metrics.marginOfSafety * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="rounded-xl px-3.5 py-2.5 border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
            <span className="font-bold text-slate-600">기본 원금 회수기간</span>
            <div className="text-right">
              <strong className="text-sm font-black text-slate-900">
                {metrics.paybackPeriodMonths === 999 ? '회수 불가' : `${metrics.paybackPeriodMonths.toFixed(1)}개월`}
              </strong>
              <span className="text-[10px] text-slate-500 block">
                총현금 {metrics.totalPaybackPeriodMonths === 999 ? '불가' : `${metrics.totalPaybackPeriodMonths.toFixed(1)}개월`} · 연 ROI {(metrics.annualRoi * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* 1) Revenue Change Sensitivity Table */}
        {(sensitivityTab === 'both' || sensitivityTab === 'revenue') && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                A. 매출 변화 민감도 (동일 비용 구조 · 매출 ±15%, ±30%)
              </h4>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                현재 가정 대비 손익·현금흐름 방어력
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left border-collapse text-xs sm:text-sm tabular-nums min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs">
                    <th className="p-3">매출 시나리오</th>
                    <th className="p-3 text-right">월 결제액 / 공급가</th>
                    <th className="p-3 text-right">월 영업이익</th>
                    <th className="p-3 text-right">영업이익률</th>
                    <th className="p-3 text-right">월 영업현금흐름</th>
                    <th className="p-3 text-right">기본 회수기간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sensitivityRows.map((row) => {
                    const isBase = row.deltaPercent === 0;
                    return (
                      <tr
                        key={row.deltaPercent}
                        className={isBase ? 'bg-blue-50/60 font-bold' : 'hover:bg-slate-50/70'}
                      >
                        <td className="p-3 text-slate-900">{row.label}</td>
                        <td className="p-3 text-right text-slate-700">
                          {row.grossRevenue.toLocaleString()}만
                          <span className="text-[11px] text-slate-400 ml-1">
                            ({Math.round(row.monthlyRevenue).toLocaleString()}만)
                          </span>
                        </td>
                        <td className={`p-3 text-right font-bold ${
                          row.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {row.monthlyOperatingProfit >= 0 ? '+' : ''}
                          {Math.round(row.monthlyOperatingProfit).toLocaleString()}만원
                        </td>
                        <td className={`p-3 text-right ${
                          row.operatingProfitMargin >= 0 ? 'text-slate-800' : 'text-rose-600'
                        }`}>
                          {(row.operatingProfitMargin * 100).toFixed(1)}%
                        </td>
                        <td className={`p-3 text-right ${
                          row.monthlyCashFlow >= 0 ? 'text-blue-700 font-semibold' : 'text-rose-600'
                        }`}>
                          {Math.round(row.monthlyCashFlow).toLocaleString()}만원
                        </td>
                        <td className="p-3 text-right text-slate-800">
                          {row.paybackPeriodMonths === 999 ? '회수 불가' : `${row.paybackPeriodMonths.toFixed(1)}개월`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2) Cost Change Sensitivity Table */}
        {(sensitivityTab === 'both' || sensitivityTab === 'cost') && (
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-indigo-600" />
                B. 비용 변화 민감도 (동일 매출 기준 · 주요 비용 항목별 변동)
              </h4>
              <span className="text-[11px] text-slate-500 tabular-nums">
                원가 +3%p <strong className="text-rose-600">{Math.round(cogsPlus3Row?.profitDelta ?? 0).toLocaleString()}만</strong> ·
                인건비 +10% <strong className="text-rose-600">{Math.round(laborPlus10Row?.profitDelta ?? 0).toLocaleString()}만</strong> ·
                임대료 +10% <strong className="text-rose-600">{Math.round(rentPlus10Row?.profitDelta ?? 0).toLocaleString()}만</strong>
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left border-collapse text-xs sm:text-sm tabular-nums min-w-[620px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs">
                    <th className="p-3">비용 변화 시나리오</th>
                    <th className="p-3 text-right">월 총비용 (증감)</th>
                    <th className="p-3 text-right">월 영업이익</th>
                    <th className="p-3 text-right">기준 대비 이익 변화</th>
                    <th className="p-3 text-right">손익분기점 (BEP)</th>
                    <th className="p-3 text-right">기본 회수기간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-blue-50/60 font-bold">
                    <td className="p-3 text-slate-900">
                      현재 비용 구조 (기준)
                    </td>
                    <td className="p-3 text-right text-slate-800">
                      {Math.round(metrics.totalMonthlyCost).toLocaleString()}만원
                    </td>
                    <td className={`p-3 text-right font-bold ${
                      metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}>
                      {metrics.monthlyOperatingProfit >= 0 ? '+' : ''}
                      {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만원
                    </td>
                    <td className="p-3 text-right text-slate-500">기준 (0만)</td>
                    <td className="p-3 text-right text-blue-700">
                      {Math.round(metrics.breakEvenRevenue).toLocaleString()}만원
                    </td>
                    <td className="p-3 text-right text-slate-800">
                      {metrics.paybackPeriodMonths === 999 ? '회수 불가' : `${metrics.paybackPeriodMonths.toFixed(1)}개월`}
                    </td>
                  </tr>

                  {costSensitivityRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="p-3 text-slate-900">
                        <span className="text-[11px] font-semibold text-slate-400 mr-1.5">
                          {row.group} ·
                        </span>
                        <span className="font-semibold">{row.label}</span>
                      </td>
                      <td className="p-3 text-right text-slate-700">
                        {Math.round(row.totalMonthlyCost).toLocaleString()}만
                        <span
                          className={`text-[11px] font-bold ml-1 ${
                            row.costDelta <= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          ({row.costDelta > 0 ? '+' : ''}
                          {Math.round(row.costDelta).toLocaleString()}만)
                        </span>
                      </td>
                      <td className={`p-3 text-right font-bold ${
                        row.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {row.monthlyOperatingProfit >= 0 ? '+' : ''}
                        {Math.round(row.monthlyOperatingProfit).toLocaleString()}만원
                      </td>
                      <td className={`p-3 text-right font-bold ${
                        row.profitDelta >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {row.profitDelta >= 0 ? '+' : ''}
                        {Math.round(row.profitDelta).toLocaleString()}만원
                      </td>
                      <td className="p-3 text-right text-slate-700">
                        {Math.round(row.breakEvenRevenue).toLocaleString()}만원
                      </td>
                      <td className="p-3 text-right text-slate-800">
                        {row.paybackPeriodMonths === 999 ? '회수 불가' : `${row.paybackPeriodMonths.toFixed(1)}개월`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Formula Transparency Accordion */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowFormula(!showFormula)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>계산식과 적용 가정 확인</span>
            {showFormula ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showFormula && (
            <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <p>• <strong>변동비</strong> = 순매출(공급가액) × (원가율 + 카드비중×카드수수료율 + 배달비중×배달수수료율 + 기타변동비율)</p>
              <p>• <strong>고정비(F)</strong> = 인건비(4대보험 포함) + 월세 + 관리비 + 공과금(전기·수도·가스·통신) + 세무비용(기장·신고조정·보험) + 홍보·마케팅 예산(온라인·배달·오프라인) + 기타고정비 + 대표자급여 + 월 감가상각비</p>
              <p>• <strong>월 총비용</strong> = 변동비 + 고정비(F) / <strong>영업이익</strong> = 순매출 − 월 총비용 / <strong>영업현금흐름</strong> = 영업이익 + 감가상각비</p>
              <p>• <strong>손익분기 매출(BEP)</strong> = 고정비 ÷ (1 − 변동비율) / <strong>기본 회수기간</strong> = 순투자금 ÷ 월 영업현금흐름</p>
              <p>• 법인세/종합소득세 본세 및 대출 원리금 상환은 영업 손익 계산에서 제외되며, 환급 가능한 보증금은 월 비용으로 차감하지 않습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
