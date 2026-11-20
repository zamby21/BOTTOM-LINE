import React, { useState } from 'react';
import { CandidateLocation } from '../types/decision';
import { INDUSTRY_BENCHMARKS } from '../data/presets';
import {
  TrendingUp,
  Sparkles,
  CreditCard,
  ArrowRight,
  Loader2,
  Calculator,
  Users,
  CalendarDays,
  CheckCircle2,
  Check,
} from 'lucide-react';

interface S3TopLineProps {
  candidate: CandidateLocation;
  onChange: (updated: CandidateLocation) => void;
  onNext: () => void;
  onPrev: () => void;
}

type ActiveRevenueMethod = 'openup' | 'unit_calc' | 'ai_estimate';

const METHOD_META: Record<
  ActiveRevenueMethod,
  {
    badge: string;
    title: string;
    shortTitle: string;
    desc: string;
    accentRing: string;
    accentBg: string;
    accentText: string;
    pillBg: string;
  }
> = {
  openup: {
    badge: '직접 입력 · 오픈업',
    title: '오픈업 조회 / 직접 입력',
    shortTitle: '오픈업 · 직접 입력',
    desc: '오픈업(핀다) 등 신용카드 추정 결제금액이나 목표 월 매출을 직접 입력합니다.',
    accentRing: 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20',
    accentBg: 'bg-blue-600',
    accentText: 'text-blue-700',
    pillBg: 'bg-blue-100 text-blue-800',
  },
  unit_calc: {
    badge: '객단가 × 고객수',
    title: '객단가 · 고객수 산출 계산기',
    shortTitle: '객단가 · 고객수 계산',
    desc: '평균 객단가와 일평균 방문 고객수, 월 영업일수를 곱해 현실적인 매출을 산출합니다.',
    accentRing: 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20',
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-700',
    pillBg: 'bg-emerald-100 text-emerald-800',
  },
  ai_estimate: {
    badge: 'AI 자동 추정',
    title: 'Gemini AI 상권 매출 추정',
    shortTitle: 'Gemini AI 상권 추정',
    desc: '주소, 업종, 전용면적, 층수를 분석해 예상 월 매출과 피크 시간대를 도출합니다.',
    accentRing: 'bg-purple-50/60 border-purple-500 ring-2 ring-purple-500/20',
    accentBg: 'bg-purple-600',
    accentText: 'text-purple-700',
    pillBg: 'bg-purple-100 text-purple-800',
  },
};

export const S3TopLine: React.FC<S3TopLineProps> = ({
  candidate,
  onChange,
  onNext,
  onPrev,
}) => {
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const activeMethod: ActiveRevenueMethod =
    candidate.revenueSource === 'unit_calc'
      ? 'unit_calc'
      : candidate.revenueSource === 'ai_estimate'
      ? 'ai_estimate'
      : 'openup';

  const benchmark = INDUSTRY_BENCHMARKS[candidate.businessType];
  const unitPrice =
    candidate.unitPrice ??
    candidate.openupData?.avgTicket ??
    benchmark?.openupAvgTicket ??
    12000;
  const operatingDays = candidate.operatingDaysPerMonth ?? 28;
  const computedDefaultDailyCustomers = Math.max(
    20,
    Math.round(
      ((candidate.revenueBySource?.openup ?? candidate.grossRevenue ?? 3000) * 10000) /
        Math.max(unitPrice, 1000) /
        operatingDays
    )
  );
  const dailyCustomers = candidate.dailyCustomers ?? computedDefaultDailyCustomers;
  const calculatedUnitRevenue = Math.max(
    100,
    Math.round((unitPrice * dailyCustomers * operatingDays) / 10000)
  );

  // 각 방식별 저장된 결제액 조회 (서로 덮어쓰지 않고 독립 유지)
  const hasStoredMap = candidate.revenueBySource !== undefined;
  const savedOpenupRevenue = hasStoredMap
    ? candidate.revenueBySource?.openup
    : activeMethod === 'openup'
    ? candidate.grossRevenue
    : undefined;
  const savedUnitCalcRevenue = hasStoredMap
    ? candidate.revenueBySource?.unit_calc
    : activeMethod === 'unit_calc'
    ? candidate.grossRevenue
    : undefined;
  const savedAiRevenue = hasStoredMap
    ? candidate.revenueBySource?.ai_estimate
    : activeMethod === 'ai_estimate'
    ? candidate.grossRevenue
    : undefined;

  const savedByMethod: Record<ActiveRevenueMethod, number | undefined> = {
    openup: savedOpenupRevenue,
    unit_calc: savedUnitCalcRevenue,
    ai_estimate: savedAiRevenue,
  };

  // 현재 방식의 표시 결제액 (저장값이 없으면 오픈업/계산기/AI 기본값 처리)
  const currentGrossRevenue =
    savedByMethod[activeMethod] ??
    (activeMethod === 'unit_calc' ? calculatedUnitRevenue : candidate.grossRevenue);

  const toNetRevenue = (gross: number) =>
    candidate.isVatIncluded ? Math.round(gross / 1.1) : gross;

  // 공급가액 환산
  const netRevenue = toNetRevenue(currentGrossRevenue);
  const vatAmount = currentGrossRevenue - netRevenue;

  // 필요 일평균 결제 건수 역산 (현 매출 기준)
  const referenceTicket =
    activeMethod === 'ai_estimate'
      ? candidate.aiEstimateMeta?.averageOrderValue || unitPrice
      : unitPrice;
  const impliedDailyTx =
    referenceTicket > 0 && operatingDays > 0
      ? Math.round((currentGrossRevenue * 10000) / referenceTicket / operatingDays)
      : 0;

  // 방식별 저장 맵을 보존하면서 업데이트하는 헬퍼
  const buildNextRevenueMap = (
    overrides?: Partial<Record<ActiveRevenueMethod, number>>
  ) => ({
    ...(savedOpenupRevenue !== undefined ? { openup: savedOpenupRevenue } : {}),
    ...(savedUnitCalcRevenue !== undefined ? { unit_calc: savedUnitCalcRevenue } : {}),
    ...(savedAiRevenue !== undefined ? { ai_estimate: savedAiRevenue } : {}),
    ...(overrides || {}),
  });

  // 3가지 방식 전환 핸들러 (각 방식에 저장된 결제액을 복원하여 적용)
  const handleSelectMethod = (method: ActiveRevenueMethod) => {
    setEstimateError(null);

    if (method === 'openup') {
      const nextAmount = savedOpenupRevenue ?? candidate.grossRevenue;
      onChange({
        ...candidate,
        revenueSource: 'openup',
        grossRevenue: nextAmount,
        revenueBySource: buildNextRevenueMap({ openup: nextAmount }),
      });
      return;
    }

    if (method === 'unit_calc') {
      const nextAmount = savedUnitCalcRevenue ?? calculatedUnitRevenue;
      onChange({
        ...candidate,
        revenueSource: 'unit_calc',
        unitPrice,
        dailyCustomers,
        operatingDaysPerMonth: operatingDays,
        grossRevenue: nextAmount,
        revenueBySource: buildNextRevenueMap({ unit_calc: nextAmount }),
      });
      return;
    }

    // ai_estimate: 이미 저장된 AI 추정치가 있으면 즉시 복원, 없으면 기존 결제액 유지하며 추정 대기
    if (savedAiRevenue !== undefined) {
      onChange({
        ...candidate,
        revenueSource: 'ai_estimate',
        grossRevenue: savedAiRevenue,
        revenueBySource: buildNextRevenueMap({ ai_estimate: savedAiRevenue }),
      });
    } else {
      onChange({
        ...candidate,
        revenueSource: 'ai_estimate',
        revenueBySource: buildNextRevenueMap(),
      });
    }
  };

  // 현재 활성 방식의 결제액 직접 수정 (다른 방식의 저장값은 건드리지 않음)
  const updateActiveMethodRevenue = (nextVal: number) => {
    const sanitized = Math.max(0, nextVal);
    onChange({
      ...candidate,
      revenueSource: activeMethod,
      grossRevenue: sanitized,
      revenueBySource: buildNextRevenueMap({ [activeMethod]: sanitized }),
    });
  };

  // 객단가 × 고객수 × 영업일수 적용 핸들러 (unit_calc 슬롯에만 저장)
  const applyUnitCalc = (nextPrice: number, nextCust: number, nextDays: number) => {
    const calculatedManwon = Math.max(
      100,
      Math.round((nextPrice * nextCust * nextDays) / 10000)
    );
    onChange({
      ...candidate,
      revenueSource: 'unit_calc',
      unitPrice: nextPrice,
      dailyCustomers: nextCust,
      operatingDaysPerMonth: nextDays,
      grossRevenue: calculatedManwon,
      revenueBySource: buildNextRevenueMap({ unit_calc: calculatedManwon }),
    });
  };

  // AI 매출 추정 호출 (ai_estimate 슬롯에만 저장, 오픈업/계산기 값은 보존)
  const handleAiEstimate = async () => {
    setIsEstimating(true);
    setEstimateError(null);
    try {
      const response = await fetch('/api/gemini/estimate-revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          address: candidate.address,
          businessType: candidate.businessName,
          areaSqm: candidate.areaSqm,
          floor: candidate.floor,
        }),
      });

      const rawText = await response.text();
      let json: any = null;
      if (rawText.trim().startsWith('{')) {
        try {
          json = JSON.parse(rawText);
        } catch {
          json = null;
        }
      }

      if (json?.success && json.data) {
        const est = json.data;
        const recommendedGross =
          est.recommendedRevenue ||
          Math.round((est.minMonthlyRevenue + est.maxMonthlyRevenue) / 2);

        onChange({
          ...candidate,
          grossRevenue: recommendedGross,
          revenueSource: 'ai_estimate',
          revenueBySource: buildNextRevenueMap({ ai_estimate: recommendedGross }),
          aiEstimateMeta: {
            minMonthlyRevenue: est.minMonthlyRevenue,
            maxMonthlyRevenue: est.maxMonthlyRevenue,
            recommendedRevenue: recommendedGross,
            averageOrderValue: est.averageOrderValue || 18000,
            dailyTransactions:
              est.dailyTransactions ||
              Math.round((recommendedGross * 10000) / (est.averageOrderValue || 18000) / 30),
            peakHours: est.peakHours || '12:00 ~ 14:00, 19:00 ~ 21:00',
            reasoning: est.reasoning,
            estimatedAt: new Date().toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
          openupData: {
            storeName: `Gemini AI 상권 추정치 (${candidate.address})`,
            cardVolumeRatio: 94,
            peakTime: est.peakHours || '12:00 ~ 14:00, 19:00 ~ 21:00',
            avgTicket: est.averageOrderValue || 18000,
            monthlyTxCount: est.dailyTransactions
              ? est.dailyTransactions * 30
              : Math.round((recommendedGross * 10000) / 18000),
            genderRatio: { male: 50, female: 50 },
            ageRatio: { '20대': 30, '30대': 40, '40대': 20, '기타': 10 },
          },
        });
      } else {
        const errMsg =
          typeof json?.error === 'string'
            ? json.error
            : 'AI 모델 서버 응답이 일시적으로 지연되고 있습니다. 잠시 후 다시 실행해주세요.';
        setEstimateError(errMsg);
      }
    } catch {
      setEstimateError('네트워크 통신 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsEstimating(false);
    }
  };

  const adjustRevenue = (delta: number) => {
    const nextVal = Math.max(100, currentGrossRevenue + delta);
    updateActiveMethodRevenue(nextVal);
  };

  const activeMeta = METHOD_META[activeMethod];
  const savedMethodsCount = (['openup', 'unit_calc', 'ai_estimate'] as ActiveRevenueMethod[]).filter(
    (m) => savedByMethod[m] !== undefined
  ).length;

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold mb-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            03 TOP-LINE (얼마나 팔릴까)
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
            월 추정 매출액 산정 (Top-Line)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            3가지 산정 방식별 결제액이 각각 독립 저장됩니다. 비교해 본 뒤 원하는 1가지 방식을 선택해 다음 단계로 진행하세요.
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
            <span>다음: 04 비용 분석</span>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* 3-Way Revenue Source Selector (Each stores & displays its own saved amount) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['openup', 'unit_calc', 'ai_estimate'] as ActiveRevenueMethod[]).map((methodKey) => {
          const meta = METHOD_META[methodKey];
          const isSelected = activeMethod === methodKey;
          const savedAmount = savedByMethod[methodKey];
          const savedNet = savedAmount !== undefined ? toNetRevenue(savedAmount) : undefined;

          return (
            <div
              key={methodKey}
              onClick={() => handleSelectMethod(methodKey)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                isSelected
                  ? meta.accentRing
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-1">
                  <span className={`text-[11px] font-bold flex items-center gap-1 ${meta.accentText}`}>
                    {methodKey === 'unit_calc' && <Calculator className="w-3 h-3" />}
                    {methodKey === 'ai_estimate' && <Sparkles className="w-3 h-3" />}
                    {meta.badge}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${meta.pillBg}`}>
                        선택 적용중
                      </span>
                    )}
                    <input
                      type="radio"
                      name="revenue-method-selector"
                      checked={isSelected}
                      onChange={() => handleSelectMethod(methodKey)}
                      className="focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{meta.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{meta.desc}</p>
              </div>

              {/* Per-Method Saved Amount Box */}
              <div
                className={`rounded-xl px-3 py-2 border text-xs tabular-nums ${
                  isSelected
                    ? 'bg-white/90 border-slate-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-slate-500">저장 결제액</span>
                  {savedAmount !== undefined ? (
                    <span className="font-black text-slate-900 text-sm">
                      {savedAmount.toLocaleString()}만원
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">
                      {methodKey === 'ai_estimate' ? '미추정 (실행 필요)' : '미산출 (클릭해 계산)'}
                    </span>
                  )}
                </div>
                {savedNet !== undefined ? (
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>순공급가액 (S)</span>
                    <span className={`font-bold ${meta.accentText}`}>
                      {savedNet.toLocaleString()}만원
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {methodKey === 'unit_calc'
                      ? `예상 계산값: ${calculatedUnitRevenue.toLocaleString()}만원`
                      : 'AI 추정 실행 시 별도 저장됩니다'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unit Price * Daily Customers Interactive Calculator Panel */}
      {activeMethod === 'unit_calc' && (
        <div className="bg-emerald-50/40 rounded-2xl p-4 sm:p-5 border border-emerald-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                객단가 × 예상 일 고객수 매출 계산기
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-800 tabular-nums">
              계산 결과: {calculatedUnitRevenue.toLocaleString()}만원/월
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                평균 객단가 (1건당 결제액)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="500"
                  min="1000"
                  value={unitPrice}
                  onChange={(e) =>
                    applyUnitCalc(
                      Math.max(1000, parseInt(e.target.value, 10) || 1000),
                      dailyCustomers,
                      operatingDays
                    )
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white font-bold tabular-nums pr-9 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">원</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                업종 참고 객단가: {(benchmark?.openupAvgTicket || 12000).toLocaleString()}원
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                일평균 결제 건수 (팀/고객)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="5"
                  min="1"
                  value={dailyCustomers}
                  onChange={(e) =>
                    applyUnitCalc(
                      unitPrice,
                      Math.max(1, parseInt(e.target.value, 10) || 1),
                      operatingDays
                    )
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white font-bold tabular-nums pr-9 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">건</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
                일 매출 약 {Math.round((unitPrice * dailyCustomers) / 10000).toLocaleString()}만원
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                월 영업일수
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="31"
                  value={operatingDays}
                  onChange={(e) =>
                    applyUnitCalc(
                      unitPrice,
                      dailyCustomers,
                      Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 26))
                    )
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white font-bold tabular-nums pr-9 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">일</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                주 6일 약 26일 / 무휴 약 30일
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Revenue Amount Input & Quick Touch Buttons */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">
                월 매출액 설정
              </h3>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${activeMeta.pillBg}`}>
                {activeMeta.shortTitle} 기준 편집중
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              현재 수정값은 <strong>{activeMeta.shortTitle}</strong> 항목에만 별도 저장되며, 다른 방식의 저장값은 유지됩니다.
            </p>
          </div>

          {activeMethod === 'ai_estimate' && (
            <button
              type="button"
              disabled={isEstimating}
              onClick={handleAiEstimate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all w-full sm:w-auto whitespace-nowrap cursor-pointer"
            >
              {isEstimating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  상권 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {savedAiRevenue !== undefined ? 'Gemini로 매출 재추정' : 'Gemini로 매출 추정 실행'}
                </>
              )}
            </button>
          )}
        </div>

        {activeMethod === 'ai_estimate' && savedAiRevenue === undefined && !estimateError && (
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex flex-wrap items-center justify-between gap-2">
            <span>
              아직 <strong>Gemini AI 상권 매출 추정</strong>을 실행하지 않았습니다. 우측 버튼을 눌러 AI 추정 결제액을 생성·저장하거나 아래 입력란에서 직접 조정할 수 있습니다.
            </span>
          </div>
        )}

        {estimateError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex flex-wrap items-center justify-between gap-2">
            <span>{estimateError}</span>
            <button
              type="button"
              disabled={isEstimating}
              onClick={handleAiEstimate}
              className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-700 font-bold hover:bg-rose-100 disabled:opacity-50 transition-colors cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
          {/* Amount Input with Touch Adjustment Buttons */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-700">
                  {candidate.isVatIncluded ? '월 총 결제액 (소비자가격/부가세포함)' : '월 공급가액 (부가세 제외)'}
                </label>
                {/* VAT Toggle */}
                <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                  <span className={candidate.isVatIncluded ? 'font-bold text-blue-600 text-[11px]' : 'text-slate-400 text-[11px]'}>
                    부가세포함
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...candidate, isVatIncluded: !candidate.isVatIncluded })}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      candidate.isVatIncluded ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        candidate.isVatIncluded ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={!candidate.isVatIncluded ? 'font-bold text-blue-600 text-[11px]' : 'text-slate-400 text-[11px]'}>
                    공급가액
                  </span>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  step="50"
                  value={currentGrossRevenue}
                  onChange={(e) => updateActiveMethodRevenue(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 text-lg font-black text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-14 tabular-nums"
                />
                <span className="absolute right-4 top-3.5 text-sm font-bold text-slate-400">만원</span>
              </div>

              {/* Mobile Quick Tap Adjustment Buttons */}
              <div className="flex gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => adjustRevenue(-500)}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold active:scale-95 transition-all cursor-pointer"
                >
                  -500만
                </button>
                <button
                  type="button"
                  onClick={() => adjustRevenue(-100)}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold active:scale-95 transition-all cursor-pointer"
                >
                  -100만
                </button>
                <button
                  type="button"
                  onClick={() => adjustRevenue(100)}
                  className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold active:scale-95 transition-all cursor-pointer"
                >
                  +100만
                </button>
                <button
                  type="button"
                  onClick={() => adjustRevenue(500)}
                  className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold active:scale-95 transition-all cursor-pointer"
                >
                  +500만
                </button>
              </div>
            </div>

            {/* Slider */}
            <div>
              <input
                type="range"
                min="500"
                max="15000"
                step="50"
                value={currentGrossRevenue}
                onChange={(e) => updateActiveMethodRevenue(parseFloat(e.target.value) || 0)}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 tabular-nums">
                <span>500만원</span>
                <span>5,000만원</span>
                <span>1억원</span>
                <span>1억 5천만원</span>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown Result Card (S) */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
            <div className="text-xs font-bold text-blue-400 flex items-center justify-between gap-2">
              <span>03 Top-line 계산 결과</span>
              <span className="text-[11px] text-blue-300 font-semibold truncate">
                {activeMeta.shortTitle}
              </span>
            </div>

            <div className="space-y-1.5 border-b border-slate-800 pb-3 tabular-nums">
              <div className="flex justify-between text-xs text-slate-300">
                <span>입력 결제액:</span>
                <span className="font-semibold">{currentGrossRevenue.toLocaleString()} 만원</span>
              </div>
              {candidate.isVatIncluded && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>부가가치세 (10%):</span>
                  <span>- {vatAmount.toLocaleString()} 만원</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-xs font-bold text-emerald-400">
                  실제 순공급가액 S:
                </span>
                <span className="text-2xl font-black text-white">
                  {netRevenue.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-slate-400">만원</span>
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 flex items-center justify-between bg-slate-800/70 px-3 py-2 rounded-lg tabular-nums">
              <span>객단가 {referenceTicket.toLocaleString()}원 · {operatingDays}일 영업 기준:</span>
              <strong className="text-amber-300">일 약 {impliedDailyTx}건 결제 필요</strong>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              * 다음 단계의 원가·수수료 차감 및 손익분기점(BEP) 계산은 법인/개인사업자 세무 기준에 맞춰 위{' '}
              <strong className="text-white">공급가액({netRevenue.toLocaleString()}만원)</strong>을 기준으로 실행됩니다.
            </p>
          </div>
        </div>

        {/* OpenUp / AI Reference Insights Panel */}
        {candidate.openupData && (
          <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 min-w-0 truncate">
                <CreditCard className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="truncate">상권 결제 패턴 참고 데이터: {candidate.openupData.storeName}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium tabular-nums flex-shrink-0">
                카드 비중 {candidate.openupData.cardVolumeRatio}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs tabular-nums">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">평균 객단가</span>
                <strong className="text-slate-900 font-bold text-xs sm:text-sm">
                  {candidate.openupData.avgTicket?.toLocaleString()}원
                </strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">월 결제 건수</span>
                <strong className="text-slate-900 font-bold text-xs sm:text-sm">
                  {candidate.openupData.monthlyTxCount?.toLocaleString()}건
                </strong>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-2">
                <span className="text-slate-400 block text-[10px]">핵심 피크 시간대</span>
                <strong className="text-slate-900 font-medium text-[11px] sm:text-xs truncate block">
                  {candidate.openupData.peakTime}
                </strong>
              </div>
            </div>

            {candidate.aiEstimateMeta?.reasoning && activeMethod === 'ai_estimate' && (
              <p className="text-[11px] text-slate-600 bg-white px-3 py-2 rounded-xl border border-purple-100 leading-relaxed">
                <strong className="text-purple-700">AI 추정 근거:</strong> {candidate.aiEstimateMeta.reasoning}
                {candidate.aiEstimateMeta.minMonthlyRevenue && candidate.aiEstimateMeta.maxMonthlyRevenue ? (
                  <span className="text-slate-500 ml-1.5 tabular-nums">
                    (추정 범위: {candidate.aiEstimateMeta.minMonthlyRevenue.toLocaleString()}~{candidate.aiEstimateMeta.maxMonthlyRevenue.toLocaleString()}만원)
                  </span>
                ) : null}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Saved 3-Method Comparison & Final Choice Bar for Next Step */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              다음 단계(04 비용 구조)에 적용할 매출 산정 방식 선택
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              저장된 {savedMethodsCount}개 방식의 결제액을 비교하고, 최종 분석에 반영할 1가지 방식을 선택한 뒤 다음 단계로 넘어가세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(['openup', 'unit_calc', 'ai_estimate'] as ActiveRevenueMethod[]).map((methodKey) => {
            const meta = METHOD_META[methodKey];
            const isSelected = activeMethod === methodKey;
            const savedAmount = savedByMethod[methodKey];
            const hasSaved = savedAmount !== undefined;

            return (
              <button
                key={methodKey}
                type="button"
                onClick={() => handleSelectMethod(methodKey)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                    : hasSaved
                    ? 'bg-slate-50 border-slate-200 hover:border-slate-400 text-slate-800'
                    : 'bg-white border-dashed border-slate-300 hover:border-slate-400 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span
                    className={`text-[11px] font-bold ${
                      isSelected ? 'text-blue-300' : meta.accentText
                    }`}
                  >
                    {meta.shortTitle}
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-extrabold">
                      <Check className="w-3 h-3" />
                      적용 선택됨
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      {hasSaved ? '클릭하여 선택' : '미저장'}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between gap-2 tabular-nums">
                  <span className={`text-base font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {hasSaved ? `${savedAmount.toLocaleString()}만원` : '—'}
                  </span>
                  {hasSaved && (
                    <span className={`text-[11px] font-semibold ${isSelected ? 'text-emerald-300' : 'text-slate-500'}`}>
                      공급가액 {toNetRevenue(savedAmount).toLocaleString()}만
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
          <div className="text-xs text-slate-600 tabular-nums">
            최종 선택: <strong className="text-slate-900">{activeMeta.shortTitle}</strong> · 월 결제액{' '}
            <strong className="text-blue-700">{currentGrossRevenue.toLocaleString()}만원</strong>{' '}
            <span className="text-slate-400">(순공급가액 S: {netRevenue.toLocaleString()}만원)</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-emerald-700 whitespace-nowrap flex-shrink-0">
            04 비용 구조에 자동 반영됨
          </span>
        </div>
      </div>
    </div>
  );
};
