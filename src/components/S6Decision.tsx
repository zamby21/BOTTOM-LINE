import React, { useEffect } from 'react';
import { CandidateLocation, FinancialMetrics, RiskEvaluation, ScoreBreakdown, DecisionVerdict } from '../types/decision';
import { calculateFinancialMetrics, evaluateRiskRules, calculateDecisionScore } from '../utils/engine';
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
} from 'lucide-react';

interface S6DecisionProps {
  candidate: CandidateLocation;
  onGoToReport: () => void;
  onGoToCompare: () => void;
  onGoToRisk: () => void;
  onToggleCompare?: (candidateId: string) => void;
}

export const S6Decision: React.FC<S6DecisionProps> = ({
  candidate,
  onGoToReport,
  onGoToCompare,
  onGoToRisk,
  onToggleCompare,
}) => {
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const metrics: FinancialMetrics = calculateFinancialMetrics(candidate);
  const riskEval: RiskEvaluation = evaluateRiskRules(candidate);
  const { scoreBreakdown, verdict } = calculateDecisionScore(metrics, riskEval);

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
        setToastMsg(`'${candidate.name}'이(가) S7 후보지 비교함에 추가되었습니다.`);
      } else {
        setToastMsg(`'${candidate.name}'이(가) 비교함에서 제외되었습니다.`);
      }
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const waterfallSteps = [
    { label: '월 순매출 (S)', amount: Math.round(metrics.monthlyRevenue), type: 'base', color: 'bg-blue-600' },
    { label: '원가·변동비', amount: -Math.round(metrics.totalVariableCost), type: 'sub', color: 'bg-rose-500' },
    { label: '직원 인건비', amount: -Math.round(metrics.laborCost), type: 'sub', color: 'bg-amber-500' },
    { label: '임대료+관리비', amount: -Math.round(metrics.monthlyRentAndMaintenance), type: 'sub', color: 'bg-purple-500' },
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

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-24">
      {/* Step Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold mb-1">
            <Award className="w-3.5 h-3.5" />
            04 DECISION (그래서 어떻게)
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
            종합 의사결정 판정 결과
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            수익성, 회수기간, 안전여유율, 임대료부담률, 6대 규제 룰을 100점 만점으로 정량화한 최종 판정입니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleCompareClick}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              candidate.addedToCompare
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {candidate.addedToCompare ? (
              <>
                <Check className="w-3.5 h-3.5 text-indigo-600" />
                <span>비교함 등록됨</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>비교함 담기</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onGoToCompare}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
          >
            <Scale className="w-4 h-4 text-indigo-600" />
            후보지 비교
          </button>

          <button
            type="button"
            onClick={onGoToReport}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            AI 리포트
            <ArrowRight className="w-4 h-4" />
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
            S7 비교함 바로가기 ➔
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
                  ? '04 종합판정 결과가 S7 후보지 비교함에 등록되어 있습니다'
                  : '이 매물의 04 종합판정 결과를 후보지 비교대상으로 추가하시겠습니까?'}
              </h4>
            </div>
            <p className="text-xs text-slate-600 pl-9">
              {candidate.addedToCompare
                ? `100점 만점 총점(${scoreBreakdown.totalScore}점), 월 순영업이익(${Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만원), BEP, 6대 규제 점검 결과가 S7 비교 풀에 등록되었습니다.`
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
                  <span>04 종합판정 결과 비교대상으로 추가</span>
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
                <span>S7 비교함 가기</span>
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

      {/* Revenue-to-Profit Waterfall Chart */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            매출 ➔ 영업이익 폭포 차트 (Waterfall)
          </h3>
          <span className="text-[10px] text-slate-500">단위: 만원</span>
        </div>

        <div className="space-y-2.5 pt-1">
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
    </div>
  );
};
