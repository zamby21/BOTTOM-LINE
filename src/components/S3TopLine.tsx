import React, { useState } from 'react';
import { CandidateLocation } from '../types/decision';
import {
  TrendingUp,
  Sparkles,
  CreditCard,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Loader2,
  Plus,
  Minus,
} from 'lucide-react';

interface S3TopLineProps {
  candidate: CandidateLocation;
  onChange: (updated: CandidateLocation) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const S3TopLine: React.FC<S3TopLineProps> = ({
  candidate,
  onChange,
  onNext,
  onPrev,
}) => {
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  // 공급가액 환산
  const netRevenue = candidate.isVatIncluded
    ? Math.round(candidate.grossRevenue / 1.1)
    : candidate.grossRevenue;
  const vatAmount = candidate.grossRevenue - netRevenue;

  // AI 매출 추정 호출
  const handleAiEstimate = async () => {
    setIsEstimating(true);
    setEstimateError(null);
    try {
      const response = await fetch('/api/gemini/estimate-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: candidate.address,
          businessType: candidate.businessName,
          areaSqm: candidate.areaSqm,
          floor: candidate.floor,
        }),
      });

      const json = await response.json();
      if (json.success && json.data) {
        const est = json.data;
        const recommendedGross = est.recommendedRevenue || Math.round((est.minMonthlyRevenue + est.maxMonthlyRevenue) / 2);
        
        onChange({
          ...candidate,
          grossRevenue: recommendedGross,
          revenueSource: 'ai_estimate',
          openupData: {
            storeName: `Gemini AI 상권 추정치 (${candidate.address})`,
            cardVolumeRatio: 94,
            peakTime: est.peakHours || '12:00 ~ 14:00, 19:00 ~ 21:00',
            avgTicket: est.averageOrderValue || 18000,
            monthlyTxCount: est.dailyTransactions ? est.dailyTransactions * 30 : Math.round((recommendedGross * 10000) / 18000),
            genderRatio: { male: 50, female: 50 },
            ageRatio: { '20대': 30, '30대': 40, '40대': 20, '기타': 10 },
          },
        });
      } else {
        setEstimateError(json.error || 'AI 매출 추정에 실패했습니다.');
      }
    } catch (err: any) {
      setEstimateError(err.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setIsEstimating(false);
    }
  };

  const adjustRevenue = (delta: number) => {
    const nextVal = Math.max(100, candidate.grossRevenue + delta);
    onChange({ ...candidate, grossRevenue: nextVal });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            01 TOP-LINE (얼마나 팔릴까)
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
            월 추정 매출액 산정 (Top-Line)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            오픈업 카드매출 데이터 또는 Gemini AI 추정치로 부가세 제외 순공급가액을 산출합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onPrev}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
          >
            이전
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all"
          >
            다음: 비용 분석
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Revenue Source Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Source: OpenUp */}
        <div
          onClick={() => onChange({ ...candidate, revenueSource: 'openup' })}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            candidate.revenueSource === 'openup'
              ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              추천: 오픈업 조회값
            </span>
            <input
              type="radio"
              checked={candidate.revenueSource === 'openup'}
              onChange={() => onChange({ ...candidate, revenueSource: 'openup' })}
              className="text-blue-600 focus:ring-blue-500"
            />
          </div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            오픈업(핀다) 조회 카드매출 입력
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            실제 신용카드 가맹점 결제 데이터 기반의 월 추정 결제금액을 직접 입력합니다.
          </p>
        </div>

        {/* Source: AI Estimation */}
        <div
          onClick={() => onChange({ ...candidate, revenueSource: 'ai_estimate' })}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            candidate.revenueSource === 'ai_estimate'
              ? 'bg-purple-50/50 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI 자동 추정
            </span>
            <input
              type="radio"
              checked={candidate.revenueSource === 'ai_estimate'}
              onChange={() => onChange({ ...candidate, revenueSource: 'ai_estimate' })}
              className="text-purple-600 focus:ring-purple-500"
            />
          </div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Gemini AI 상권 매출 자동 추정
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            주소와 업종, 전용면적을 분석해 예상 월 매출 및 객단가를 자동 도출합니다.
          </p>
        </div>
      </div>

      {/* Main Revenue Amount Input & Quick Touch Buttons */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              월 매출액 설정
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              공식: 결제액(부가세 포함) 입력 시 1.1로 나누어 실제 사업 공급가액(S)으로 계산합니다.
            </p>
          </div>

          {candidate.revenueSource === 'ai_estimate' && (
            <button
              type="button"
              disabled={isEstimating}
              onClick={handleAiEstimate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all w-full sm:w-auto"
            >
              {isEstimating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  상권 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Gemini로 매출 추정 실행
                </>
              )}
            </button>
          )}
        </div>

        {estimateError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {estimateError}
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
                  value={candidate.grossRevenue}
                  onChange={(e) => onChange({ ...candidate, grossRevenue: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 text-lg font-black text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-14"
                />
                <span className="absolute right-4 top-3.5 text-sm font-bold text-slate-400">만원</span>
              </div>

              {/* Mobile Quick Tap Adjustment Buttons */}
              <div className="flex gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => adjustRevenue(-500)}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold active:scale-95 transition-all"
                >
                  -500만
                </button>
                <button
                  type="button"
                  onClick={() => adjustRevenue(-100)}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold active:scale-95 transition-all"
                >
                  -100만
                </button>
                <button
                  type="button"
                  onClick={() => adjustRevenue(100)}
                  className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold active:scale-95 transition-all"
                >
                  +100만
                </button>
                <button
                  type="button"
                  onClick={() => adjustRevenue(500)}
                  className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold active:scale-95 transition-all"
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
                value={candidate.grossRevenue}
                onChange={(e) => onChange({ ...candidate, grossRevenue: parseFloat(e.target.value) || 0 })}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>500만원</span>
                <span>5,000만원</span>
                <span>1억원</span>
                <span>1억 5천만원</span>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown Result Card (S) */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
              <span>01 Top-line 계산 결과</span>
              <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 rounded text-blue-300">
                수익분석 출발값 (S)
              </span>
            </div>

            <div className="space-y-1.5 border-b border-slate-800 pb-3">
              <div className="flex justify-between text-xs text-slate-300">
                <span>입력 결제액:</span>
                <span className="font-semibold">{candidate.grossRevenue.toLocaleString()} 만원</span>
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

            <p className="text-[11px] text-slate-400 leading-relaxed">
              * 다음 단계의 원가·수수료 차감 및 손익분기점(BEP) 계산은 법인/개인사업자 세무 기준에 맞춰 위 
              <strong className="text-white"> 공급가액({netRevenue.toLocaleString()}만원)</strong>을 기준으로 실행됩니다.
            </p>
          </div>
        </div>

        {/* OpenUp Reference Insights Panel */}
        {candidate.openupData && (
          <div className="bg-slate-50 rounded-2xl p-3.5 sm:p-4 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                오픈업 상권 결제 패턴 데이터: {candidate.openupData.storeName}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">카드 {candidate.openupData.cardVolumeRatio}%</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
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
          </div>
        )}
      </div>
    </div>
  );
};
