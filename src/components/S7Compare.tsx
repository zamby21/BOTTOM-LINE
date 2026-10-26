import React, { useState } from 'react';
import { CandidateLocation } from '../types/decision';
import { calculateFinancialMetrics, evaluateRiskRules, calculateDecisionScore } from '../utils/engine';
import {
  Scale,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Award,
  ArrowRight,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  DollarSign,
  Clock,
  Percent,
} from 'lucide-react';

interface S7CompareProps {
  candidates: CandidateLocation[];
  activeCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onGoToDetail: (candidateId: string) => void;
  onAddNew: () => void;
}

export const S7Compare: React.FC<S7CompareProps> = ({
  candidates,
  activeCandidateId,
  onSelectCandidate,
  onGoToDetail,
  onAddNew,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const evaluated = candidates.map((cand) => {
    const metrics = calculateFinancialMetrics(cand);
    const riskEval = evaluateRiskRules(cand);
    const { scoreBreakdown, verdict } = calculateDecisionScore(metrics, riskEval);
    return {
      candidate: cand,
      metrics,
      riskEval,
      scoreBreakdown,
      verdict,
    };
  });

  const sortedByRevenue = [...evaluated].sort((a, b) => b.candidate.grossRevenue - a.candidate.grossRevenue);
  const revenueRankMap = new Map<string, number>();
  sortedByRevenue.forEach((item, idx) => {
    revenueRankMap.set(item.candidate.id, idx + 1);
  });

  const sortedByScore = [...evaluated].sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);
  const scoreRankMap = new Map<string, number>();
  sortedByScore.forEach((item, idx) => {
    scoreRankMap.set(item.candidate.id, idx + 1);
  });

  const inversions = evaluated.filter((item) => {
    const revRank = revenueRankMap.get(item.candidate.id) || 1;
    const scoreRank = scoreRankMap.get(item.candidate.id) || 1;
    return revRank !== scoreRank;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold mb-1.5">
            <Scale className="w-3.5 h-3.5" />
            S7 후보지 다중 비교
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
            후보지별 매출 순위 vs 바텀라인 판정 순위 대조
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            "매출 1위 매물과 실제 순이익 1위 매물의 역전 현상"을 한눈에 검증합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* View mode toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>카드형</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>표형</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            후보지 추가
          </button>
        </div>
      </div>

      {/* Rank Inversion Banner */}
      {inversions.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 border border-indigo-200 text-slate-900 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0 mt-0.5 shadow-xs">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-indigo-950 text-xs sm:text-sm">
                🚨 매출 순위와 최종 판정 순위 역전(Inversion) 감지!
              </span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                핵심 가치 입증
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px] sm:text-xs">
              오픈업 기준 <strong>매출 1위 매물</strong>이 과도한 월세·인건비와 행정 규제로 인해, 실제 
              <strong> 바텀라인 순영업이익 및 종합 안전성에서는 하위 순위로 역전</strong>되었습니다.
            </p>
          </div>
        </div>
      )}

      {/* Mobile-Friendly Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evaluated.map(({ candidate, metrics, riskEval, scoreBreakdown, verdict }) => {
            const revRank = revenueRankMap.get(candidate.id) || 1;
            const scoreRank = scoreRankMap.get(candidate.id) || 1;
            const isReversed = revRank !== scoreRank;
            const isSelected = candidate.id === activeCandidateId;

            return (
              <div
                key={candidate.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      #{scoreRank}위 매물
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${verdict.badgeClass}`}>
                      {verdict.title} ({scoreBreakdown.totalScore}점)
                    </span>
                  </div>

                  {/* Candidate Name & Address */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                      {candidate.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {candidate.address}
                    </p>
                  </div>

                  {/* Rank Contrast Badges (Core Inversion Display) */}
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex-1 text-center border-r border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">Top-line 매출</span>
                      <strong className="text-blue-700 font-extrabold text-sm">
                        {revRank}위 <span className="text-[10px] font-normal text-slate-500">({candidate.grossRevenue}만)</span>
                      </strong>
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-[10px] text-slate-400 block font-semibold">종합 판정</span>
                      <strong className="text-purple-700 font-extrabold text-sm">
                        {scoreRank}위 <span className="text-[10px] font-normal text-slate-500">({scoreBreakdown.totalScore}점)</span>
                      </strong>
                    </div>
                    {isReversed && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0 animate-pulse">
                        🔄 역전
                      </span>
                    )}
                  </div>

                  {/* Key Metrics 2x2 Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">월 순영업이익</span>
                      <strong className={`text-xs sm:text-sm font-black ${
                        metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만원
                      </strong>
                      <span className="text-[10px] text-slate-500 block">
                        마진 {(metrics.operatingProfitMargin * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">손익분기점 (BEP)</span>
                      <strong className="text-slate-900 font-bold text-xs sm:text-sm">
                        {Math.round(metrics.breakEvenRevenue).toLocaleString()}만원
                      </strong>
                      <span className="text-[10px] text-slate-500 block">
                        안전율 {(metrics.marginOfSafety * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">임대료 부담률</span>
                      <strong className={`text-xs sm:text-sm font-bold ${
                        metrics.rentBurdenRate <= 0.12 ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {(metrics.rentBurdenRate * 100).toFixed(1)}%
                      </strong>
                      <span className="text-[10px] text-slate-500 block">
                        월 {metrics.monthlyRentAndMaintenance}만원
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">회수기간 (ROI)</span>
                      <strong className="text-slate-900 font-bold text-xs sm:text-sm">
                        {metrics.paybackPeriodMonths === 999 ? '불가' : `${metrics.paybackPeriodMonths.toFixed(1)}개월`}
                      </strong>
                      <span className="text-[10px] text-slate-500 block">
                        연 ROI {(metrics.annualRoi * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* 6 Risk Rules Status */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">6대 행정 규제:</span>
                    {riskEval.hasBlockingRisk ? (
                      <span className="font-bold text-rose-600 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> 차단 발생
                      </span>
                    ) : riskEval.hasConditionalRisk ? (
                      <span className="font-bold text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> 조건부 인허가
                      </span>
                    ) : (
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 규제 전면 통과
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action */}
                <button
                  type="button"
                  onClick={() => {
                    onSelectCandidate(candidate.id);
                    onGoToDetail(candidate.id);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <span>이 매물 상세 판정 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View (for larger screens or users requesting table view) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <th className="p-3 sm:p-4">후보지</th>
                  <th className="p-3 sm:p-4 text-center">Top-line 매출</th>
                  <th className="p-3 sm:p-4 text-center">월 순영업이익</th>
                  <th className="p-3 sm:p-4 text-center">임대료 부담률</th>
                  <th className="p-3 sm:p-4 text-center">회수기간</th>
                  <th className="p-3 sm:p-4 text-center">6대 규제</th>
                  <th className="p-3 sm:p-4 text-center bg-slate-100/60 font-black">종합 판정</th>
                  <th className="p-3 sm:p-4 text-right">분석</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluated.map(({ candidate, metrics, riskEval, scoreBreakdown, verdict }) => {
                  const revRank = revenueRankMap.get(candidate.id) || 1;
                  const scoreRank = scoreRankMap.get(candidate.id) || 1;
                  const isReversed = revRank !== scoreRank;
                  const isSelected = candidate.id === activeCandidateId;

                  return (
                    <tr key={candidate.id} className={isSelected ? 'bg-blue-50/30' : ''}>
                      <td className="p-3 sm:p-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{candidate.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{candidate.address}</div>
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        <div className="font-bold text-slate-900">{candidate.grossRevenue.toLocaleString()}만</div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                          {revRank}위
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        <div className={`font-black ${metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만
                        </div>
                        <span className="text-[10px] text-slate-500">{(metrics.operatingProfitMargin * 100).toFixed(1)}%</span>
                      </td>
                      <td className="p-3 sm:p-4 text-center font-bold">
                        {(metrics.rentBurdenRate * 100).toFixed(1)}%
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        {metrics.paybackPeriodMonths === 999 ? '불가' : `${metrics.paybackPeriodMonths.toFixed(1)}개월`}
                      </td>
                      <td className="p-3 sm:p-4 text-center">
                        {riskEval.hasBlockingRisk ? '차단' : riskEval.hasConditionalRisk ? '조건부' : '통과'}
                      </td>
                      <td className="p-3 sm:p-4 text-center bg-slate-50/50">
                        <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-block ${verdict.badgeClass}`}>
                          {verdict.title} ({scoreBreakdown.totalScore}점)
                        </div>
                        <div className="text-[10px] font-bold text-purple-700 mt-0.5">
                          {scoreRank}위 {isReversed && '🔄 역전'}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCandidate(candidate.id);
                            onGoToDetail(candidate.id);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white"
                        >
                          선택
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
