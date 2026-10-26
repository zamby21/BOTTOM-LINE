import React from 'react';
import { CandidateLocation, FinancialMetrics } from '../types/decision';
import { calculateFinancialMetrics } from '../utils/engine';
import {
  Calculator,
  ArrowRight,
  DollarSign,
  Users,
  Percent,
  Hammer,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Plus,
  Minus,
} from 'lucide-react';

interface S4BottomLineProps {
  candidate: CandidateLocation;
  onChange: (updated: CandidateLocation) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const S4BottomLine: React.FC<S4BottomLineProps> = ({
  candidate,
  onChange,
  onNext,
  onPrev,
}) => {
  const metrics: FinancialMetrics = calculateFinancialMetrics(candidate);

  const adjustCog = (delta: number) => {
    const nextVal = Math.min(80, Math.max(5, candidate.costOfGoodsRate + delta));
    onChange({ ...candidate, costOfGoodsRate: nextVal });
  };

  const adjustStaff = (delta: number) => {
    const nextVal = Math.min(20, Math.max(0, candidate.fullTimeStaff + delta));
    onChange({ ...candidate, fullTimeStaff: nextVal });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold mb-1">
            <Calculator className="w-3.5 h-3.5" />
            02 BOTTOM-LINE (그래서 남는가)
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
            비용 구조 및 손익분기점 (Bottom-Line)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            원가율·인건비·임대료·카드/배달 수수료·인테리어 감가상각을 차감하여 월 순영업이익과 손익분기(BEP)를 실시간 도출합니다.
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
            다음: 규제 점검
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time Profit & BEP Snapshot Bar (2x2 on mobile, 4x1 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 block">
            월 순매출 (공급가액 S)
          </span>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">
            {Math.round(metrics.monthlyRevenue).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">만원</span>
          </div>
        </div>

        <div className={`rounded-2xl p-3.5 sm:p-4 border shadow-2xs ${
          metrics.monthlyOperatingProfit >= 0
            ? 'bg-emerald-50/60 border-emerald-300'
            : 'bg-rose-50/60 border-rose-300'
        }`}>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block">
            실시간 월 영업이익
          </span>
          <div className={`text-lg sm:text-xl font-black mt-1 truncate ${
            metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}{' '}
            <span className="text-xs font-normal">만원</span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600">
            마진율 {(metrics.operatingProfitMargin * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 block">
            손익분기점 (BEP)
          </span>
          <div className="text-lg sm:text-xl font-black text-blue-700 mt-1 truncate">
            {Math.round(metrics.breakEvenRevenue).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">만원</span>
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600">
            안전율 {(metrics.marginOfSafety * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 block">
            원금 회수기간
          </span>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">
            {metrics.paybackPeriodMonths === 999 ? '회수 불가' : `${metrics.paybackPeriodMonths.toFixed(1)}개월`}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600">
            연 ROI {(metrics.annualRoi * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Inputs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Variable Costs (v) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Percent className="w-4 h-4 text-emerald-600" />
              1. 변동비 구조 (v = {(metrics.variableCostRate * 100).toFixed(1)}%)
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              월 {Math.round(metrics.totalVariableCost).toLocaleString()}만원
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                <span>식자재 / 상품 원가율 (%)</span>
                <span className="text-emerald-700 text-sm font-black">{candidate.costOfGoodsRate}%</span>
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
                <span className="text-[11px] text-slate-400">
                  월 {Math.round(metrics.monthlyRevenue * (candidate.costOfGoodsRate / 100)).toLocaleString()}만원
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => adjustCog(-2)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold"
                  >
                    -2%
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustCog(2)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold"
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
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold"
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
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold"
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
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold"
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
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold"
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
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Costs (F): Labor & Fixed Overheads */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Users className="w-4 h-4 text-blue-600" />
              2. 인건비 및 대표자 급여
            </h3>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              월 {Math.round(metrics.laborCost + candidate.ownerSalary).toLocaleString()}만원
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
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
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
                    className="flex-1 px-2 py-1.5 text-center text-xs font-bold border border-slate-300 rounded-lg outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustStaff(0.5)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700"
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
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">원</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>직원 순 인건비 (월 209h × {candidate.fullTimeStaff}명):</span>
                <span className="font-bold text-slate-800">
                  {Math.round((candidate.fullTimeStaff * candidate.hourlyWage * 209) / 10000).toLocaleString()}만원
                </span>
              </div>
              <div className="flex justify-between">
                <span>4대보험 사업주 부담 (+{candidate.socialInsuranceRate}%):</span>
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
                  value={candidate.ownerSalary}
                  onChange={(e) => onChange({ ...candidate, ownerSalary: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10 font-bold"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">만원</span>
              </div>
            </div>
          </div>
        </div>

        {/* Capital Expenditure & Depreciation */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Hammer className="w-4 h-4 text-amber-600" />
              3. 인테리어·설비 시설비 및 감가상각
            </h3>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
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
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold"
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
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold"
                />
                <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">만</span>
              </div>
            </div>
          </div>
        </div>

        {/* Initial Total Investment Summary */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              4. 총 초기 투자금 & 중개보수
            </h3>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              총 {Math.round(metrics.initialInvestment).toLocaleString()}만원
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">바닥/시설 권리금:</span>
              <span className="font-bold text-slate-900">{(candidate.premium || 0).toLocaleString()}만원</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">인테리어 + 설비 집기:</span>
              <span className="font-bold text-slate-900">{((candidate.interiorCost || 0) + (candidate.equipmentCost || 0)).toLocaleString()}만원</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">법정 중개보수 (상한 0.9%):</span>
              <span className="font-bold text-slate-900">{metrics.brokerageFee.toFixed(1)}만원</span>
            </div>
            <div className="flex justify-between py-1.5 font-black text-slate-900 text-sm">
              <span>초기 순투자금:</span>
              <span className="text-indigo-600">{Math.round(metrics.initialInvestment).toLocaleString()}만원</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
