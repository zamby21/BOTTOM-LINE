import React, { useEffect } from 'react';
import { CandidateLocation, FinancialMetrics, RiskEvaluation } from '../types/decision';
import confetti from 'canvas-confetti';
import {
  Award,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  DollarSign,
  Scale,
  Sparkles,
  ArrowRight,
  BarChart3,
  Percent,
  Plus,
  Check,
  BookmarkPlus,
  ClipboardCheck,
  PieChart as PieChartIcon,
  SlidersHorizontal,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LabelList,
} from 'recharts';
import {
  calculateFinancialMetrics,
  evaluateRiskRules,
  calculateDecisionScore,
  getCandidateDueDiligence,
  simulateRevenueSensitivity,
  simulateCostSensitivity,
  evaluateLocationCompetitiveness,
} from '../utils/engine';

interface S6DecisionProps {
  candidate: CandidateLocation;
  onGoToReport: () => void;
  onGoToCompare: () => void;
  onGoToRisk: () => void;
  onToggleCompare?: (candidateId: string) => void;
  onSaveSnapshot?: () => void;
  onUpdateCandidate?: (updated: CandidateLocation) => void;
}

export const S6Decision: React.FC<S6DecisionProps> = ({
  candidate,
  onGoToReport,
  onGoToCompare,
  onGoToRisk,
  onToggleCompare,
  onSaveSnapshot,
  onUpdateCandidate,
}) => {
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const [returnChartMetric, setReturnChartMetric] = React.useState<'margin' | 'roi'>('margin');
  const [isDonutHovered, setIsDonutHovered] = React.useState(false);
  const metrics: FinancialMetrics = calculateFinancialMetrics(candidate);
  const riskEval: RiskEvaluation = evaluateRiskRules(candidate);
  const { scoreBreakdown, verdict } = calculateDecisionScore(metrics, riskEval);
  const dueDiligenceItems = getCandidateDueDiligence(candidate);
  const unverifiedCount = dueDiligenceItems.filter((d) => d.status === 'unverified').length;
  const criticalCount = dueDiligenceItems.filter((d) => d.status === 'critical').length;
  const sensitivityRows = simulateRevenueSensitivity(candidate);
  const costSensitivityRows = simulateCostSensitivity(candidate, 10);
  const locationCompetitiveness = evaluateLocationCompetitiveness(candidate, metrics, riskEval);

  type RevenueMethodKey = 'openup' | 'unit_calc' | 'ai_estimate';
  const activeRevenueMethod: RevenueMethodKey =
    candidate.revenueSource === 'unit_calc'
      ? 'unit_calc'
      : candidate.revenueSource === 'ai_estimate'
      ? 'ai_estimate'
      : 'openup';

  const hasStoredRevenueMap = candidate.revenueBySource !== undefined;
  const savedRevenueByMethod: Record<RevenueMethodKey, number | undefined> = {
    openup: hasStoredRevenueMap
      ? candidate.revenueBySource?.openup
      : activeRevenueMethod === 'openup'
      ? candidate.grossRevenue
      : undefined,
    unit_calc: hasStoredRevenueMap
      ? candidate.revenueBySource?.unit_calc
      : activeRevenueMethod === 'unit_calc'
      ? candidate.grossRevenue
      : undefined,
    ai_estimate: hasStoredRevenueMap
      ? candidate.revenueBySource?.ai_estimate
      : activeRevenueMethod === 'ai_estimate'
      ? candidate.grossRevenue
      : undefined,
  };

  const revenueMethodReturnData = (
    [
      {
        key: 'openup' as RevenueMethodKey,
        label: '오픈업 · 직접 입력',
        shortLabel: '오픈업/직접',
        activeColor: '#2563eb',
        mutedColor: '#93c5fd',
      },
      {
        key: 'unit_calc' as RevenueMethodKey,
        label: '객단가 · 고객수 계산',
        shortLabel: '객단가 계산',
        activeColor: '#059669',
        mutedColor: '#6ee7b7',
      },
      {
        key: 'ai_estimate' as RevenueMethodKey,
        label: 'Gemini AI 상권 추정',
        shortLabel: 'AI 상권 추정',
        activeColor: '#7c3aed',
        mutedColor: '#c4b5fd',
      },
    ] as const
  ).map((item) => {
    const isSelected = activeRevenueMethod === item.key;
    const savedGross = savedRevenueByMethod[item.key];
    const effectiveGross = savedGross ?? (isSelected ? candidate.grossRevenue : undefined);
    const hasValue = effectiveGross !== undefined;

    if (!hasValue) {
      return {
        ...item,
        isSelected,
        hasValue: false,
        grossRevenue: 0,
        netRevenue: 0,
        monthlyOperatingProfit: 0,
        marginPct: 0,
        roiPct: 0,
        displayPct: 0,
        barLabel: '미저장',
        expectedScore: 0,
        barColor: '#e2e8f0',
      };
    }

    const simulatedMetrics = calculateFinancialMetrics({
      ...candidate,
      grossRevenue: effectiveGross,
    });
    const simulatedScore = calculateDecisionScore(simulatedMetrics, riskEval).scoreBreakdown.totalScore;
    const marginPct = Number((simulatedMetrics.operatingProfitMargin * 100).toFixed(1));
    const roiPct = Number((simulatedMetrics.annualRoi * 100).toFixed(1));
    const displayPct = returnChartMetric === 'margin' ? marginPct : roiPct;

    return {
      ...item,
      isSelected,
      hasValue: true,
      grossRevenue: effectiveGross,
      netRevenue: Math.round(simulatedMetrics.monthlyRevenue),
      monthlyOperatingProfit: Math.round(simulatedMetrics.monthlyOperatingProfit),
      marginPct,
      roiPct,
      displayPct,
      barLabel: `${displayPct.toFixed(1)}%`,
      expectedScore: simulatedScore,
      barColor:
        displayPct < 0
          ? isSelected
            ? '#e11d48'
            : '#fda4af'
          : isSelected
          ? item.activeColor
          : item.mutedColor,
    };
  });

  const activeReturnRow =
    revenueMethodReturnData.find((d) => d.isSelected) || revenueMethodReturnData[0];
  const savedReturnCount = revenueMethodReturnData.filter((d) => d.hasValue).length;

  const handleSwitchRevenueMethodFromDecision = (methodKey: RevenueMethodKey) => {
    if (!onUpdateCandidate) return;
    const targetGross = savedRevenueByMethod[methodKey];
    if (targetGross === undefined) return;
    onUpdateCandidate({
      ...candidate,
      revenueSource: methodKey,
      grossRevenue: targetGross,
      revenueBySource: {
        ...(savedRevenueByMethod.openup !== undefined ? { openup: savedRevenueByMethod.openup } : {}),
        ...(savedRevenueByMethod.unit_calc !== undefined ? { unit_calc: savedRevenueByMethod.unit_calc } : {}),
        ...(savedRevenueByMethod.ai_estimate !== undefined ? { ai_estimate: savedRevenueByMethod.ai_estimate } : {}),
      },
    });
  };

  const handleLocationRatingChange = (
    key: 'hinterlandPopulation' | 'transitAccess' | 'visibility' | 'commercialVitality',
    val: number
  ) => {
    if (!onUpdateCandidate) return;
    onUpdateCandidate({
      ...candidate,
      locationRatings: {
        ...(candidate.locationRatings || {}),
        [key]: val,
      },
    });
  };

  const handleResetLocationRatings = () => {
    if (!onUpdateCandidate) return;
    onUpdateCandidate({
      ...candidate,
      locationRatings: undefined,
    });
  };

  const rentDown = costSensitivityRows.find((r) => r.id === 'rent_down');
  const rentUp = costSensitivityRows.find((r) => r.id === 'rent_up');
  const laborDown = costSensitivityRows.find((r) => r.id === 'labor_down');
  const laborUp = costSensitivityRows.find((r) => r.id === 'labor_up');
  const bothDown = costSensitivityRows.find((r) => r.id === 'both_down');
  const bothUp = costSensitivityRows.find((r) => r.id === 'both_up');

  const costBarChartData = [
    {
      name: '임대료(월세)',
      '비용 -10%': Math.round(rentDown?.monthlyOperatingProfit ?? metrics.monthlyOperatingProfit),
      '현재 기준': Math.round(metrics.monthlyOperatingProfit),
      '비용 +10%': Math.round(rentUp?.monthlyOperatingProfit ?? metrics.monthlyOperatingProfit),
    },
    {
      name: '직원 인건비',
      '비용 -10%': Math.round(laborDown?.monthlyOperatingProfit ?? metrics.monthlyOperatingProfit),
      '현재 기준': Math.round(metrics.monthlyOperatingProfit),
      '비용 +10%': Math.round(laborUp?.monthlyOperatingProfit ?? metrics.monthlyOperatingProfit),
    },
    {
      name: '임대+인건비 동시',
      '비용 -10%': Math.round(bothDown?.monthlyOperatingProfit ?? metrics.monthlyOperatingProfit),
      '현재 기준': Math.round(metrics.monthlyOperatingProfit),
      '비용 +10%': Math.round(bothUp?.monthlyOperatingProfit ?? metrics.monthlyOperatingProfit),
    },
  ];

  useEffect(() => {
    if (verdict.code === 'GO') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  }, [verdict.code]);

  const handleCompareClick = () => {
    if (onToggleCompare) {
      onToggleCompare(candidate.id);
      if (!candidate.addedToCompare) {
        setToastMsg(`'${candidate.name}'이(가) 07 후보지 비교함에 추가되었습니다.`);
      } else {
        setToastMsg(`'${candidate.name}'이(가) 비교함에서 제외되었습니다.`);
      }
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleSnapshotClick = () => {
    if (onSaveSnapshot) {
      onSaveSnapshot();
      setToastMsg(`'${candidate.name}'의 현재 06 종합판정 결과가 분석 히스토리에 저장되었습니다.`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const waterfallSteps = [
    { label: '월 순매출 (S)', amount: Math.round(metrics.monthlyRevenue), type: 'base', color: 'bg-blue-600' },
    { label: '원가·변동비', amount: -Math.round(metrics.totalVariableCost), type: 'sub', color: 'bg-rose-500' },
    { label: '직원 인건비', amount: -Math.round(metrics.laborCost), type: 'sub', color: 'bg-amber-500' },
    { label: '임대료+관리비', amount: -Math.round(metrics.monthlyRentAndMaintenance), type: 'sub', color: 'bg-purple-500' },
    ...(metrics.utilityCostTotal > 0
      ? [{ label: '월 공과금', amount: -Math.round(metrics.utilityCostTotal), type: 'sub', color: 'bg-cyan-500' }]
      : []),
    ...(metrics.taxCostTotal > 0
      ? [{ label: '세무·보험비', amount: -Math.round(metrics.taxCostTotal), type: 'sub', color: 'bg-orange-500' }]
      : []),
    ...(metrics.marketingCostTotal > 0
      ? [{ label: '홍보·마케팅', amount: -Math.round(metrics.marketingCostTotal), type: 'sub', color: 'bg-fuchsia-500' }]
      : []),
    ...(metrics.otherFixedCostTotal > 0
      ? [{ label: '기타 고정비', amount: -Math.round(metrics.otherFixedCostTotal), type: 'sub', color: 'bg-teal-500' }]
      : []),
    { label: '시설 감가상각', amount: -Math.round(metrics.monthlyDepreciation), type: 'sub', color: 'bg-slate-500' },
    { label: '대표 인건비', amount: -Math.round(candidate.ownerSalary), type: 'sub', color: 'bg-indigo-500' },
    {
      label: '월 순영업이익',
      amount: Math.round(metrics.monthlyOperatingProfit),
      type: 'result',
      color: metrics.monthlyOperatingProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600',
    },
  ];

  const maxWaterfallVal = Math.max(metrics.monthlyRevenue, 1);

  const roundedRevenue = Math.max(0, Math.round(metrics.monthlyRevenue));
  const roundedVariableCost = Math.max(0, Math.round(metrics.totalVariableCost));
  const roundedFixedCost = Math.max(0, Math.round(metrics.totalFixedCost));
  const roundedProfit = Math.round(metrics.monthlyOperatingProfit);
  const isOperatingProfit = roundedProfit >= 0;

  const donutData = [
    {
      name: '변동비',
      detail: '원가·카드·배달·기타변동',
      value: roundedVariableCost,
      ratio: metrics.monthlyRevenue > 0 ? (metrics.totalVariableCost / metrics.monthlyRevenue) * 100 : 0,
      color: '#f59e0b',
      dotClass: 'bg-amber-500',
    },
    {
      name: '고정비',
      detail: '인건·임대·공과금·세무·마케팅·상각',
      value: roundedFixedCost,
      ratio: metrics.monthlyRevenue > 0 ? (metrics.totalFixedCost / metrics.monthlyRevenue) * 100 : 0,
      color: '#6366f1',
      dotClass: 'bg-indigo-500',
    },
    ...(isOperatingProfit
      ? [
          {
            name: '영업이익',
            detail: '매출에서 모든 비용 차감',
            value: roundedProfit,
            ratio: metrics.monthlyRevenue > 0 ? (metrics.monthlyOperatingProfit / metrics.monthlyRevenue) * 100 : 0,
            color: '#10b981',
            dotClass: 'bg-emerald-500',
          },
        ]
      : []),
  ];

  const activeDonutSlices = donutData.filter((d) => d.value > 0);

  return (
    <div className="w-full space-y-5 pb-24">
      {/* Step Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold mb-1.5">
            <Award className="w-3.5 h-3.5" />
            06 DECISION (그래서 어떻게)
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
            종합 의사결정 판정 결과
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            수익성, 회수기간, 안전여유율, 임대료부담률, 6대 규제 룰을 100점 만점으로 정량화한 최종 판정입니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
          <button
            type="button"
            onClick={handleCompareClick}
            className={`h-10 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl text-xs font-bold transition-colors shadow-2xs whitespace-nowrap flex-shrink-0 cursor-pointer ${
              candidate.addedToCompare
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {candidate.addedToCompare ? (
              <>
                <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span>비교함 등록됨</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span>비교함 담기</span>
              </>
            )}
          </button>

          {onSaveSnapshot && (
            <button
              type="button"
              onClick={handleSnapshotClick}
              className="h-10 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
              title="현재 판정 결과를 히스토리에 저장"
            >
              <BookmarkPlus className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>이력 저장</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGoToCompare}
            className="h-10 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <Scale className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>후보지 비교</span>
          </button>

          <button
            type="button"
            onClick={onGoToReport}
            className="h-10 min-w-[144px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>08 AI 리포트</span>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Instant Toast Notification */}
      {toastMsg && (
        <div className="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-fade-in border border-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={onGoToCompare}
            className="text-indigo-300 hover:text-white underline text-[11px] font-semibold"
          >
            07 비교함 바로가기 ➔
          </button>
        </div>
      )}

      {/* Main Verdict Card with 100-Point Score & Decision Chip */}
      <div className={`p-5 sm:p-7 rounded-3xl border shadow-sm transition-all ${verdict.bgLightClass} ${verdict.borderClass}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3.5 py-1 rounded-full text-xs sm:text-sm font-black shadow-2xs tracking-wide flex items-center gap-1.5 ${verdict.badgeClass}`}>
                {verdict.code === 'GO' && <CheckCircle2 className="w-4 h-4" />}
                {verdict.code === 'CONDITIONAL' && <AlertTriangle className="w-4 h-4" />}
                {verdict.code === 'HOLD' && <XCircle className="w-4 h-4" />}
                {verdict.title}
              </span>
              <span className="text-[11px] font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200 truncate">
                {candidate.name}
              </span>
              {candidate.addedToCompare && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <Scale className="w-3 h-3" />
                  비교함 등록 매물
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
              {verdict.summary}
            </p>

            <div className="space-y-1 pt-0.5">
              {verdict.rationale.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                  <span className="leading-tight">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 100-Point Radial Gauge Display */}
          <div className="w-full sm:w-auto flex-shrink-0 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center min-w-[140px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              정량 평가 총점
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-0.5 tracking-tight">
              {scoreBreakdown.totalScore}
              <span className="text-sm font-normal text-slate-400">/100</span>
            </div>
            <div className="mt-1 text-[10px] font-bold text-slate-500">
              {scoreBreakdown.totalScore >= 70
                ? '🟢 우량 (진입)'
                : scoreBreakdown.totalScore >= 50
                ? '🟡 보통 (조건부)'
                : '🔴 위험 (보류)'}
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated 04 Decision Comparison Action Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        candidate.addedToCompare
          ? 'bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-blue-50/80 border-indigo-200 shadow-xs'
          : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                candidate.addedToCompare ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                <Scale className="w-4 h-4" />
              </span>
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                {candidate.addedToCompare
                  ? '06 종합판정 결과가 07 후보지 비교함에 등록되어 있습니다'
                  : '이 매물의 06 종합판정 결과를 후보지 비교대상으로 추가하시겠습니까?'}
              </h4>
            </div>
            <p className="text-xs text-slate-600 pl-9">
              {candidate.addedToCompare
                ? `100점 만점 총점(${scoreBreakdown.totalScore}점), 월 순영업이익(${Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만원), BEP, 6대 규제 점검 결과가 07 비교 풀에 등록되었습니다.`
                : '종합 판정 결과가 완료된 매물들을 비교함에 모아서, 다른 후보지들과의 순위 역전 현상 및 최적 매물(BEST CHOICE)을 비교 검증합니다.'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto pl-9 md:pl-0">
            <button
              type="button"
              onClick={handleCompareClick}
              className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                candidate.addedToCompare
                  ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-rose-600'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-sm'
              }`}
            >
              {candidate.addedToCompare ? (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>비교대상에서 제외</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>06 종합판정 결과 비교대상으로 추가</span>
                </>
              )}
            </button>

            {candidate.addedToCompare && (
              <button
                type="button"
                onClick={onGoToCompare}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>07 비교함 가기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Key Decision Metrics Grid (2x2 on mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span>월 순영업이익</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className={`text-lg sm:text-2xl font-black truncate ${
            metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}
            <span className="text-xs font-normal text-slate-500"> 만</span>
          </div>
          <div className="text-[10px] sm:text-xs font-semibold text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>마진율:</span>
            <span className="font-bold text-emerald-700">
              {(metrics.operatingProfitMargin * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span>원금 회수기간</span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 truncate">
            {metrics.paybackPeriodMonths === 999 ? '회수 불가' : `${metrics.paybackPeriodMonths.toFixed(1)}`}
            <span className="text-xs font-normal text-slate-500"> 개월</span>
          </div>
          <div className="text-[10px] sm:text-xs font-semibold text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>연 ROI:</span>
            <span className="font-bold text-blue-700">
              {(metrics.annualRoi * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span>손익분기점 (BEP)</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 truncate">
            {Math.round(metrics.breakEvenRevenue).toLocaleString()}
            <span className="text-xs font-normal text-slate-500"> 만</span>
          </div>
          <div className="text-[10px] sm:text-xs font-semibold text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>안전여유율:</span>
            <span className="font-bold text-indigo-700">
              {(metrics.marginOfSafety * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span>임대료 부담률</span>
            <Percent className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className={`text-lg sm:text-2xl font-black truncate ${
            metrics.rentBurdenRate <= 0.12 ? 'text-emerald-700' : 'text-amber-700'
          }`}>
            {(metrics.rentBurdenRate * 100).toFixed(1)}
            <span className="text-xs font-normal text-slate-500"> %</span>
          </div>
          <div className="text-[10px] sm:text-xs font-semibold text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>월 임대+관리:</span>
            <span className="font-bold text-slate-800">
              {metrics.monthlyRentAndMaintenance}만
            </span>
          </div>
        </div>
      </div>

      {/* Revenue Structure Donut Chart & Waterfall Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recharts Donut Chart: Revenue = Variable + Fixed + Operating Profit */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              매출·비용·이익 구성
            </h3>
            <span className="text-[11px] text-slate-500 tabular-nums">
              월 순매출 기준
            </span>
          </div>

          {activeDonutSlices.length > 0 ? (
            <div
              className="relative w-full h-56 sm:h-60"
              onMouseLeave={() => setIsDonutHovered(false)}
            >
              {/* Center Metric inside Donut Hole (placed behind Recharts tooltip layer) */}
              <div
                className={`absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none text-center px-6 tabular-nums transition-opacity duration-150 ${
                  isDonutHovered ? 'opacity-20' : 'opacity-100'
                }`}
              >
                <span className="text-[10px] font-semibold text-slate-400 leading-tight">
                  월 순매출
                </span>
                <strong className="text-base sm:text-lg font-black text-slate-900 leading-snug mt-0.5">
                  {roundedRevenue.toLocaleString()}만
                </strong>
                <span
                  className={`text-[11px] font-bold mt-0.5 leading-tight ${
                    isOperatingProfit ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {isOperatingProfit
                    ? `이익 ${(metrics.operatingProfitMargin * 100).toFixed(1)}%`
                    : `적자 ${Math.abs(roundedProfit).toLocaleString()}만`}
                </span>
              </div>

              <div className="relative z-10 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeDonutSlices}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={86}
                      paddingAngle={2}
                      stroke="#ffffff"
                      strokeWidth={2}
                      onMouseEnter={() => setIsDonutHovered(true)}
                      onMouseLeave={() => setIsDonutHovered(false)}
                    >
                      {activeDonutSlices.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      offset={18}
                      wrapperStyle={{ zIndex: 40, pointerEvents: 'none', outline: 'none' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const item = payload[0]?.payload as (typeof donutData)[number] | undefined;
                        if (!item) return null;
                        return (
                          <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs tabular-nums whitespace-nowrap">
                            <div className="font-bold flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span>{item.name}</span>
                            </div>
                            <div className="text-white font-mono font-bold mt-1">
                              {item.value.toLocaleString()}만원{' '}
                              <span className="text-slate-300 font-semibold">
                                ({item.ratio.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.detail}</div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-xs text-slate-400">
              매출 및 비용 데이터를 입력하면 구성 도넛 차트가 표시됩니다.
            </div>
          )}

          {/* Clean Tabular Breakdown Legend (매출, 변동비, 고정비, 영업이익) */}
          <div className="divide-y divide-slate-100 border-t border-slate-100 text-xs tabular-nums">
            <div className="py-2 flex items-center justify-between">
              <span className="font-bold text-slate-700">월 순매출 (공급가액)</span>
              <span className="font-mono font-black text-slate-900">
                {roundedRevenue.toLocaleString()}만원 (100%)
              </span>
            </div>

            {donutData.map((item) => (
              <div key={item.name} className="py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${item.dotClass}`} />
                  <span className="font-semibold text-slate-700">{item.name}</span>
                  <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                    {item.detail}
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-900 flex-shrink-0">
                  {item.value.toLocaleString()}만
                  <span className="text-slate-400 font-normal ml-1.5">
                    ({item.ratio.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}

            {!isOperatingProfit && (
              <div className="py-2 flex items-center justify-between gap-2 text-rose-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-rose-600" />
                  <span className="font-bold">영업손실 (매출 초과 비용)</span>
                </div>
                <div className="font-mono font-black flex-shrink-0">
                  {roundedProfit.toLocaleString()}만
                  <span className="font-semibold ml-1.5">
                    ({(metrics.operatingProfitMargin * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Revenue-to-Profit Waterfall Chart */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              매출 ➔ 영업이익 폭포 차트 (Waterfall)
            </h3>
            <span className="text-[11px] text-slate-500">단위: 만원</span>
          </div>

          <div className="space-y-2.5 pt-1 tabular-nums">
            {waterfallSteps.map((step, idx) => {
              const isSub = step.type === 'sub';
              const isResult = step.type === 'result';
              const absVal = Math.abs(step.amount);
              const barWidthPercent = Math.min(100, (absVal / maxWaterfallVal) * 100);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={`${isResult ? 'font-bold text-slate-900 text-xs sm:text-sm' : 'text-slate-600 text-[11px] sm:text-xs'}`}>
                      {step.label}
                    </span>
                    <span className={`font-mono text-xs ${
                      isSub ? 'text-rose-600' : isResult ? (step.amount >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold') : 'text-slate-900 font-bold'
                    }`}>
                      {step.amount > 0 ? `+${step.amount.toLocaleString()}` : step.amount.toLocaleString()} 만원
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 sm:h-3 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${step.color}`}
                      style={{ width: `${Math.max(3, barWidthPercent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Revenue Method Expected Return Rate Bar Chart (Recharts) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                매출 산정 방식별 예상 수익률 비교
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                현재 적용: {activeReturnRow.label} ({returnChartMetric === 'margin' ? `${activeReturnRow.marginPct.toFixed(1)}%` : `${activeReturnRow.roiPct.toFixed(1)}%`})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              03 매출 산정 단계에서 저장된 방식별 결제액 기준 {returnChartMetric === 'margin' ? '월 영업이익률(순이익÷순매출)' : '연 투자수익률(연 순이익÷초기투자금)'}을 막대 차트로 비교합니다.
            </p>
          </div>

          {/* Metric Toggle: Operating Margin vs Annual ROI */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start md:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setReturnChartMetric('margin')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                returnChartMetric === 'margin'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              영업이익률 (%)
            </button>
            <button
              type="button"
              onClick={() => setReturnChartMetric('roi')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                returnChartMetric === 'roi'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              연 투자수익률 ROI (%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Recharts BarChart */}
          <div className="lg:col-span-7 space-y-1.5">
            {returnChartMetric === 'margin' && (
              <div className="flex items-center justify-end gap-3 text-[11px] text-slate-500 px-1">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                  <span className="w-4 border-t-2 border-dashed border-emerald-500 inline-block" />
                  우량 영업이익률 기준선 (15%)
                </span>
              </div>
            )}
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueMethodReturnData}
                  margin={{ top: 28, right: 16, left: 0, bottom: 12 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    domain={[
                      (dataMin: number) => (dataMin < 0 ? Math.floor(dataMin * 1.25 - 5) : 0),
                      (dataMax: number) =>
                        Math.max(
                          returnChartMetric === 'margin' ? 20 : 15,
                          Math.ceil(dataMax * 1.25 + 4)
                        ),
                    ]}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.2} />
                  {returnChartMetric === 'margin' && (
                    <ReferenceLine
                      y={15}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  )}
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    wrapperStyle={{ zIndex: 40, pointerEvents: 'none', outline: 'none' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const row = payload[0]?.payload as (typeof revenueMethodReturnData)[number] | undefined;
                      if (!row) return null;
                      return (
                        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1 tabular-nums min-w-[190px]">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                            <span className="font-extrabold">{row.label}</span>
                            {row.isSelected && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black">
                                적용중
                              </span>
                            )}
                          </div>
                          {row.hasValue ? (
                            <div className="space-y-0.5 pt-0.5">
                              <div className="flex justify-between gap-3 text-slate-300">
                                <span>저장 월 결제액</span>
                                <strong className="text-white">{row.grossRevenue.toLocaleString()}만원</strong>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-300">
                                <span>월 순영업이익</span>
                                <strong className={row.monthlyOperatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {row.monthlyOperatingProfit.toLocaleString()}만원
                                </strong>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-300">
                                <span>영업이익률</span>
                                <strong className={row.marginPct >= 0 ? 'text-blue-300' : 'text-rose-400'}>
                                  {row.marginPct.toFixed(1)}%
                                </strong>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-300">
                                <span>연 투자수익률 (ROI)</span>
                                <strong className={row.roiPct >= 0 ? 'text-amber-300' : 'text-rose-400'}>
                                  {row.roiPct.toFixed(1)}%
                                </strong>
                              </div>
                              <div className="flex justify-between gap-3 text-slate-400 pt-1 border-t border-slate-800">
                                <span>예상 종합점수</span>
                                <strong className="text-white">{row.expectedScore} / 100점</strong>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 pt-0.5">
                              03 매출 산정 단계에서 해당 방식을 입력·실행하면 예상 수익률이 자동 비교됩니다.
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="displayPct"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={68}
                  >
                    {revenueMethodReturnData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={entry.barColor}
                        stroke={entry.isSelected ? '#0f172a' : 'none'}
                        strokeWidth={entry.isSelected ? 1.5 : 0}
                      />
                    ))}
                    <LabelList
                      dataKey="barLabel"
                      position="top"
                      offset={8}
                      style={{ fill: '#1e293b', fontSize: 11, fontWeight: 800 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-Method Breakdown & Live Switcher Cards */}
          <div className="lg:col-span-5 space-y-2.5">
            {revenueMethodReturnData.map((row) => {
              const canSwitch = row.hasValue && !row.isSelected && Boolean(onUpdateCandidate);
              return (
                <div
                  key={row.key}
                  onClick={() => {
                    if (canSwitch) handleSwitchRevenueMethodFromDecision(row.key);
                  }}
                  className={`p-3 rounded-xl border transition-all tabular-nums ${
                    row.isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : row.hasValue
                      ? 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer'
                      : 'bg-slate-50/60 border-dashed border-slate-200 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: row.hasValue ? row.activeColor : '#cbd5e1' }}
                      />
                      <span className={`text-xs font-extrabold truncate ${row.isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {row.label}
                      </span>
                    </div>
                    {row.isSelected ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-black flex-shrink-0">
                        적용중
                      </span>
                    ) : row.hasValue ? (
                      <span className="text-[10px] font-bold text-blue-600 flex-shrink-0">
                        클릭해 적용
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">
                        미저장
                      </span>
                    )}
                  </div>

                  {row.hasValue ? (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className={`block text-[10px] ${row.isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                          월 결제액
                        </span>
                        <strong className={row.isSelected ? 'text-white' : 'text-slate-900'}>
                          {row.grossRevenue.toLocaleString()}만
                        </strong>
                      </div>
                      <div>
                        <span className={`block text-[10px] ${row.isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                          영업이익률
                        </span>
                        <strong
                          className={
                            row.marginPct >= 0
                              ? row.isSelected
                                ? 'text-emerald-400'
                                : 'text-emerald-700'
                              : 'text-rose-500'
                          }
                        >
                          {row.marginPct.toFixed(1)}%
                        </strong>
                      </div>
                      <div>
                        <span className={`block text-[10px] ${row.isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                          연 ROI
                        </span>
                        <strong
                          className={
                            row.roiPct >= 0
                              ? row.isSelected
                                ? 'text-amber-300'
                                : 'text-blue-700'
                              : 'text-rose-500'
                          }
                        >
                          {row.roiPct.toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      03 매출 산정에서 값을 저장하면 수익률을 함께 비교할 수 있습니다.
                    </p>
                  )}
                </div>
              );
            })}

            {savedReturnCount < 3 && (
              <p className="text-[11px] text-slate-400 leading-snug px-1">
                * 현재 {savedReturnCount}개 방식의 매출이 저장되어 있습니다. 03 매출 산정 단계에서 나머지 방식도 계산·추정하면 3가지 방식의 예상 수익률 차이를 한눈에 비교할 수 있습니다.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 5 Scoring Areas Breakdown */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base border-b border-slate-100 pb-2.5">
          <Award className="w-4 h-4 text-purple-600" />
          5대 평가 영역별 정량 배점 상세 (100점 만점)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 block">수익성 (35점)</span>
            <div className="text-base sm:text-lg font-black text-slate-900">
              {scoreBreakdown.profitScore} <span className="text-[10px] text-slate-400">/35</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              이익률 {(metrics.operatingProfitMargin * 100).toFixed(0)}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 block">회수기간 (20점)</span>
            <div className="text-base sm:text-lg font-black text-slate-900">
              {scoreBreakdown.paybackScore} <span className="text-[10px] text-slate-400">/20</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {metrics.paybackPeriodMonths === 999 ? '불가' : `${metrics.paybackPeriodMonths.toFixed(0)}개월`}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 block">안전성 (20점)</span>
            <div className="text-base sm:text-lg font-black text-slate-900">
              {scoreBreakdown.safetyScore} <span className="text-[10px] text-slate-400">/20</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              안전율 {(metrics.marginOfSafety * 100).toFixed(0)}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 block">임대료 부담 (10점)</span>
            <div className="text-base sm:text-lg font-black text-slate-900">
              {scoreBreakdown.rentScore} <span className="text-[10px] text-slate-400">/10</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              부담률 {(metrics.rentBurdenRate * 100).toFixed(0)}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-500 block">규제·임대차 (15점)</span>
            <div className={`text-base sm:text-lg font-black ${
              riskEval.hasBlockingRisk ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {scoreBreakdown.riskScore} <span className="text-[10px] text-slate-400">/15</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {riskEval.hasBlockingRisk ? '차단 발생' : `감점 -${riskEval.totalPenalty}점`}
            </div>
          </div>
        </div>
      </div>
      {/* Cost Sensitivity Analysis: ±10% Rent & Labor Impact on Operating Profit */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              비용 민감도 분석 (임대료 · 인건비 ±10% 변동 시 영업이익)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              임대료(월 {candidate.monthlyRent.toLocaleString()}만) 또는 직원 인건비(월 {Math.round(metrics.laborCost).toLocaleString()}만)가 10% 오르내릴 때의 손익 변화입니다.
            </p>
          </div>
          <span className="text-[11px] text-slate-500 tabular-nums flex-shrink-0">
            기준 영업이익: <strong className={metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
              {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만원
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Grouped Bar Chart comparing -10% / Baseline / +10% */}
          <div className="lg:col-span-6 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costBarChartData} margin={{ top: 10, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val: number) => `${val}만`}
                />
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
                  wrapperStyle={{ zIndex: 40, pointerEvents: 'none', outline: 'none' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700 text-xs tabular-nums space-y-1">
                        <div className="font-bold text-slate-200 border-b border-slate-700 pb-1">
                          {label} ±10% 변동
                        </div>
                        {payload.map((entry) => (
                          <div key={String(entry.name)} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <span
                                className="w-2 h-2 rounded-xs inline-block"
                                style={{ backgroundColor: String(entry.color) }}
                              />
                              {entry.name}
                            </span>
                            <span className="font-mono font-bold text-white">
                              {Number(entry.value).toLocaleString()}만원
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="비용 -10%" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="현재 기준" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="비용 +10%" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Sensitivity Table */}
          <div className="lg:col-span-6 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                  <th className="py-2 pr-2">시나리오</th>
                  <th className="py-2 px-2 text-right">비용 변화</th>
                  <th className="py-2 px-2 text-right">예상 영업이익</th>
                  <th className="py-2 px-2 text-right">기준 대비</th>
                  <th className="py-2 pl-2 text-right">회수기간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {costSensitivityRows.map((row) => {
                  const isBetter = row.profitDelta > 0;
                  const roundedProfit = Math.round(row.monthlyOperatingProfit);
                  const roundedDelta = Math.round(row.profitDelta);
                  const roundedCostDelta = Math.round(row.costDeltaAmount);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-2 font-bold text-slate-800 whitespace-nowrap">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500 whitespace-nowrap">
                        {roundedCostDelta > 0 ? `+${roundedCostDelta.toLocaleString()}` : roundedCostDelta.toLocaleString()}만
                      </td>
                      <td className={`py-2.5 px-2 text-right font-mono font-black whitespace-nowrap ${
                        roundedProfit >= 0 ? 'text-slate-900' : 'text-rose-600'
                      }`}>
                        {roundedProfit.toLocaleString()}만원
                      </td>
                      <td className={`py-2.5 px-2 text-right font-mono font-bold whitespace-nowrap ${
                        isBetter ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {roundedDelta > 0 ? `+${roundedDelta.toLocaleString()}` : roundedDelta.toLocaleString()}만
                      </td>
                      <td className="py-2.5 pl-2 text-right text-slate-600 whitespace-nowrap">
                        {row.paybackPeriodMonths === 999 ? '불가' : `${row.paybackPeriodMonths.toFixed(1)}개월`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Due Diligence & Revenue Stress Check Summary (PropScope Enhancement) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-4 sm:p-5 rounded-2xl border space-y-2.5 ${
          criticalCount > 0
            ? 'bg-rose-50/50 border-rose-300'
            : unverifiedCount > 0 || !candidate.costChecked
            ? 'bg-amber-50/50 border-amber-200'
            : 'bg-emerald-50/50 border-emerald-200'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
              확인 근거 vs 입력 가정 점검
            </h4>
            <button
              type="button"
              onClick={onGoToRisk}
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              실사 기록장 보기 ➔
            </button>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {criticalCount > 0
              ? `실사 기록장에 '치명적 리스크'가 ${criticalCount}건 기록되어 있습니다. 해당 문제를 해결하기 전까지 계약을 보류하세요.`
              : unverifiedCount > 0 || !candidate.costChecked
              ? `5대 현장·서류 실사 항목 중 미확인 ${unverifiedCount}건이 남아있거나 비용 누락 자가점검이 완료되지 않았습니다. 현재 점수는 입력 가정 기반 잠정 판정입니다.`
              : '5대 현장·서류 실사 항목과 비용 누락 점검이 모두 완료된 확정 판정 데이터입니다.'}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2.5 tabular-nums">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            매출 변동 스트레스 테스트 (-15% / 기준 / +15%)
          </h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[sensitivityRows[1], sensitivityRows[2], sensitivityRows[3]].map((row) => (
              <div key={row.deltaPercent} className={`p-2 rounded-xl border text-center ${
                row.deltaPercent === 0 ? 'bg-blue-50/60 border-blue-200' : 'bg-slate-50 border-slate-100'
              }`}>
                <span className="text-[10px] text-slate-500 block font-semibold">{row.label}</span>
                <strong className={`text-xs sm:text-sm font-black block mt-0.5 ${
                  row.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {row.monthlyOperatingProfit >= 0 ? '+' : ''}{Math.round(row.monthlyOperatingProfit).toLocaleString()}만
                </strong>
                <span className="text-[10px] text-slate-400">
                  회수 {row.paybackPeriodMonths === 999 ? '불가' : `${row.paybackPeriodMonths.toFixed(0)}개월`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Location Competitiveness 6-Axis Radar Chart */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <MapPin className="w-4 h-4 text-indigo-600" />
              입지 경쟁력 종합 프로파일 (6대 입지 환경 레이더)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              배후 인구, 대중교통 접근성, 점포 가시성, 상권 활력과 재무·규제 지표를 종합한 입지 균형도입니다.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 tabular-nums">
            {locationCompetitiveness.hasCustomOverrides && onUpdateCandidate && (
              <button
                type="button"
                onClick={handleResetLocationRatings}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                자동 산출값 복원
              </button>
            )}
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-semibold">입지 경쟁력 지수</span>
              <strong className={`text-lg font-black ${
                locationCompetitiveness.overallScore >= 75
                  ? 'text-emerald-700'
                  : locationCompetitiveness.overallScore >= 60
                  ? 'text-indigo-700'
                  : 'text-amber-700'
              }`}>
                {locationCompetitiveness.overallScore}
                <span className="text-xs font-normal text-slate-400"> / 100</span>
              </strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Recharts RadarChart */}
          <div className="lg:col-span-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="68%"
                data={locationCompetitiveness.axes}
              >
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tickCount={5}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name="적정 기준 (70점)"
                  dataKey="benchmark"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="transparent"
                />
                <Radar
                  name={candidate.name}
                  dataKey="score"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fill="#4f46e5"
                  fillOpacity={0.24}
                />
                <Tooltip
                  wrapperStyle={{ zIndex: 40, pointerEvents: 'none', outline: 'none' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const axis = payload[0]?.payload as (typeof locationCompetitiveness.axes)[number] | undefined;
                    if (!axis) return null;
                    return (
                      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700 text-xs tabular-nums space-y-0.5">
                        <div className="font-bold text-slate-100">{axis.subject}</div>
                        <div className="font-mono font-black text-indigo-300">
                          {axis.score}점 <span className="text-slate-400 font-normal">(기준 {axis.benchmark}점)</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{axis.basis}</div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 6-Axis Score Details & Field Calibration Sliders */}
          <div className="lg:col-span-6 divide-y divide-slate-100 border-t lg:border-t-0 border-slate-100 text-xs tabular-nums">
            {locationCompetitiveness.axes.map((axis) => {
              const vsBench = axis.score - axis.benchmark;
              return (
                <div key={axis.key} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800">{axis.subject}</span>
                      <span className="text-[11px] text-slate-400 ml-2 truncate">
                        {axis.basis}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                      <span className={`text-[10px] font-bold ${
                        vsBench >= 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {vsBench >= 0 ? `+${vsBench}` : vsBench}
                      </span>
                      <strong className="text-slate-900 font-black w-11 text-right">
                        {axis.score}점
                      </strong>
                    </div>
                  </div>

                  {axis.editable && onUpdateCandidate ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={20}
                        max={100}
                        step={1}
                        value={axis.score}
                        aria-label={`${axis.subject} 현장 평가 점수`}
                        onChange={(e) =>
                          handleLocationRatingChange(
                            axis.key as 'hinterlandPopulation' | 'transitAccess' | 'visibility' | 'commercialVitality',
                            Number(e.target.value)
                          )
                        }
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">현장 보정</span>
                    </div>
                  ) : (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          axis.score >= 70 ? 'bg-indigo-600' : axis.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${axis.score}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
