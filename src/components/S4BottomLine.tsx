import React, { useState } from 'react';
import { CandidateLocation, FinancialMetrics } from '../types/decision';
import { calculateFinancialMetrics, simulateRevenueSensitivity } from '../utils/engine';
import {
  Calculator,
  ArrowRight,
  DollarSign,
  Users,
  Percent,
  Hammer,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Zap,
  Info,
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
  const [showFormula, setShowFormula] = useState(false);

  const metrics: FinancialMetrics = calculateFinancialMetrics(candidate);
  const sensitivityRows = simulateRevenueSensitivity(candidate);

  const adjustCog = (delta: number) => {
    const nextVal = Math.min(80, Math.max(5, candidate.costOfGoodsRate + delta));
    onChange({ ...candidate, costOfGoodsRate: nextVal });
  };

  const adjustStaff = (delta: number) => {
    const nextVal = Math.min(20, Math.max(0, candidate.fullTimeStaff + delta));
    onChange({ ...candidate, fullTimeStaff: nextVal });
  };

  return (
    <div className="w-full space-y-5 pb-24">
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
            변동비·인건비·임대료·공과금·감가상각 및 초기 운전자금까지 반영해 실제 월 영업현금흐름과 회수기간을 도출합니다.
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

      {/* Real-time Profit & BEP Snapshot Bar (2x2 on mobile, 4x1 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 tabular-nums">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 block">
            월 순매출 (공급가액 S)
          </span>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">
            {Math.round(metrics.monthlyRevenue).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">만원</span>
          </div>
          <span className="text-[11px] text-slate-500">
            현금흐름 {Math.round(metrics.monthlyCashFlow).toLocaleString()}만/월
          </span>
        </div>

        <div className={`rounded-2xl p-3.5 sm:p-4 border shadow-2xs ${
          metrics.monthlyOperatingProfit >= 0
            ? 'bg-emerald-50/60 border-emerald-300'
            : 'bg-rose-50/60 border-rose-300'
        }`}>
          <span className="text-[11px] font-bold text-slate-500 block">
            실시간 월 영업이익
          </span>
          <div className={`text-lg sm:text-xl font-black mt-1 truncate ${
            metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}{' '}
            <span className="text-xs font-normal">만원</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-600">
            영업이익률 {(metrics.operatingProfitMargin * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 block">
            손익분기점 (BEP)
          </span>
          <div className="text-lg sm:text-xl font-black text-blue-700 mt-1 truncate">
            {Math.round(metrics.breakEvenRevenue).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">만원</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-600">
            안전여유율 {(metrics.marginOfSafety * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 block">
            기본 원금 회수기간
          </span>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">
            {metrics.paybackPeriodMonths === 999 ? '회수 불가' : `${metrics.paybackPeriodMonths.toFixed(1)}개월`}
          </div>
          <span className="text-[11px] font-semibold text-slate-600">
            총현금 기준 {metrics.totalPaybackPeriodMonths === 999 ? '불가' : `${metrics.totalPaybackPeriodMonths.toFixed(1)}개월`} · 연 ROI {(metrics.annualRoi * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Inputs Section */}
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

        {/* 2. Fixed Costs (F): Labor & Operating Overheads */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Users className="w-4 h-4 text-blue-600" />
              2. 인건비 · 공과금 · 마케팅 고정비
            </h3>
            <span className="text-[11px] font-semibold text-blue-700 tabular-nums">
              월 {Math.round(metrics.laborCost + candidate.ownerSalary + metrics.utilityAndOtherFixedCost).toLocaleString()}만원
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
                    className="flex-1 px-2 py-1.5 text-center text-xs font-bold border border-slate-300 rounded-lg outline-none tabular-nums"
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
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10 font-bold tabular-nums"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">만원</span>
              </div>
            </div>

            {/* Extra Operating Fixed Costs (PropScope Enhancement) */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  월 공과금
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={candidate.utilityCost ?? 0}
                    onChange={(e) => onChange({ ...candidate, utilityCost: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1.5 text-[11px] text-slate-400 font-bold">만</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">전기·수도·가스</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  월 광고비
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={candidate.marketingCost ?? 0}
                    onChange={(e) => onChange({ ...candidate, marketingCost: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1.5 text-[11px] text-slate-400 font-bold">만</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">마케팅·체험단</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  기타 고정비
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    value={candidate.otherFixedCost ?? 0}
                    onChange={(e) => onChange({ ...candidate, otherFixedCost: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none pr-7 font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1.5 text-[11px] text-slate-400 font-bold">만</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">세무·보안·렌탈</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Capital Expenditure & Depreciation */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Hammer className="w-4 h-4 text-amber-600" />
              3. 인테리어·설비·초기 운전자금
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

        {/* 4. Initial Total Investment & Cash Requirement Summary */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              4. 초기 투자와 총 필요 현금
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

          {/* Cost Omission Self-Check (PropScope Addition) */}
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
                공과금·배달수수료·광고비·기타 초기비용에 누락이 없으며, ‘0원’으로 둔 항목은 실제 비용이 없음을 확인했습니다.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Revenue Sensitivity Simulation Matrix (PropScope "매출이 달라지면?") */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Zap className="w-4 h-4 text-amber-500" />
              매출 가정 변화에 따른 손익 민감도 (매출이 달라지면?)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              예측 확률이 아닌, 동일 비용 구조에서 월 매출이 ±15%, ±30% 변할 때의 손익과 회수기간 방어력 비교 시나리오입니다.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            BEP 손익분기 매출: {Math.round(metrics.breakEvenRevenue).toLocaleString()}만원
          </span>
        </div>

        <div className="overflow-x-auto">
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
                    <td className="p-3 text-slate-900">
                      {row.label}
                    </td>
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

        {/* Formula Transparency Accordion */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowFormula(!showFormula)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
          >
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>계산식과 적용 가정 확인</span>
            {showFormula ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showFormula && (
            <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <p>• <strong>변동비</strong> = 순매출(공급가액) × (원가율 + 카드비중×카드수수료율 + 배달비중×배달수수료율 + 기타변동비율)</p>
              <p>• <strong>고정비(F)</strong> = 인건비(4대보험 포함) + 월세 + 관리비 + 공과금 + 광고비 + 기타고정비 + 대표자급여 + 월 감가상각비</p>
              <p>• <strong>영업이익</strong> = 순매출 − 변동비 − 고정비(감가상각 포함) / <strong>영업현금흐름</strong> = 영업이익 + 감가상각비(현금유출 없는 비용 환원)</p>
              <p>• <strong>손익분기 매출(BEP)</strong> = 고정비 ÷ (1 − 변동비율) / <strong>기본 회수기간</strong> = 순투자금 ÷ 월 영업현금흐름</p>
              <p>• 세금(종합소득세/법인세) 및 대출 원리금 상환은 영업 손익 계산에서 제외되며, 환급 가능한 보증금은 월 비용으로 차감하지 않습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
