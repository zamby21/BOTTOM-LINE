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
  Trash2,
  Check,
  Trophy,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface S7CompareProps {
  candidates: CandidateLocation[];
  activeCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onGoToDetail: (candidateId: string) => void;
  onAddNew: () => void;
  onToggleCompare: (candidateId: string) => void;
  onGoToDecision?: (candidateId: string) => void;
  onGoToReport?: (candidateId: string) => void;
  onAddAllToCompare?: () => void;
}

export const S7Compare: React.FC<S7CompareProps> = ({
  candidates,
  activeCandidateId,
  onSelectCandidate,
  onGoToDetail,
  onAddNew,
  onToggleCompare,
  onGoToDecision,
  onGoToReport,
  onAddAllToCompare,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showManager, setShowManager] = useState(false);

  // Filter candidates that are added to comparison pool
  const comparedCandidates = candidates.filter((c) => c.addedToCompare === true);
  const uncomparedCandidates = candidates.filter((c) => !c.addedToCompare);

  // Compute evaluations for compared candidates
  const evaluated = comparedCandidates.map((cand) => {
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

  // Sort by decision total score descending (Decision Rank)
  const sortedByScore = [...evaluated].sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);
  const scoreRankMap = new Map<string, number>();
  sortedByScore.forEach((item, idx) => {
    scoreRankMap.set(item.candidate.id, idx + 1);
  });

  // Sort by revenue descending (Revenue Rank)
  const sortedByRevenue = [...evaluated].sort((a, b) => b.candidate.grossRevenue - a.candidate.grossRevenue);
  const revenueRankMap = new Map<string, number>();
  sortedByRevenue.forEach((item, idx) => {
    revenueRankMap.set(item.candidate.id, idx + 1);
  });

  // Identify rank inversions
  const inversions = evaluated.filter((item) => {
    const revRank = revenueRankMap.get(item.candidate.id) || 1;
    const scoreRank = scoreRankMap.get(item.candidate.id) || 1;
    return revRank !== scoreRank;
  });

  // Best Choice candidate (Rank 1 by Decision score)
  const bestChoice = sortedByScore[0];

  const handleCandidateDetail = (candidateId: string) => {
    onSelectCandidate(candidateId);
    if (onGoToDecision) {
      onGoToDecision(candidateId);
    } else {
      onGoToDetail(candidateId);
    }
  };

  const handleReportDetail = (candidateId: string) => {
    onSelectCandidate(candidateId);
    if (onGoToReport) {
      onGoToReport(candidateId);
    } else {
      onGoToDetail(candidateId);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold mb-1.5">
            <Scale className="w-3.5 h-3.5" />
            S7 후보지 다중 비교
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
            04 종합판정 후보지 다자간 비교 및 순위 검증
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            04 종합판정을 완료한 후보지들을 비교함에 모아 100점 만점 총점, 실질 순영업이익, 회수기간, 6대 규제를 비교합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Compared counter chip */}
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-extrabold flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-indigo-600" />
            비교 등록 {comparedCandidates.length}곳 / 전체 {candidates.length}곳
          </span>

          {/* Toggle comparison manager */}
          <button
            type="button"
            onClick={() => setShowManager(!showManager)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>비교 대상 관리</span>
            {showManager ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* View mode toggle */}
          {comparedCandidates.length > 0 && (
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
          )}

          <button
            type="button"
            onClick={onAddNew}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            신규 매물 등록
          </button>
        </div>
      </div>

      {/* Comparison Candidates Pool Manager Drawer */}
      {(showManager || comparedCandidates.length === 0) && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                비교 대상 후보지 관리 (04 종합판정 완료 매물 풀)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {uncomparedCandidates.length > 0 && onAddAllToCompare && (
                <button
                  type="button"
                  onClick={onAddAllToCompare}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  미등록 매물 전체 비교함 담기
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {candidates.map((cand) => {
              const m = calculateFinancialMetrics(cand);
              const r = evaluateRiskRules(cand);
              const { scoreBreakdown: sc, verdict: vd } = calculateDecisionScore(m, r);
              const isAdded = cand.addedToCompare === true;

              return (
                <div
                  key={cand.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                    isAdded
                      ? 'bg-indigo-50/50 border-indigo-200'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-slate-500 truncate max-w-[150px]">
                        {cand.businessName}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${vd.badgeClass}`}>
                        {vd.title} ({sc.totalScore}점)
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {cand.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {cand.address}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                      <span>월매출: <strong>{cand.grossRevenue}만</strong></span>
                      <span>순이익: <strong className={m.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {Math.round(m.monthlyOperatingProfit)}만
                      </strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onToggleCompare(cand.id)}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                        isAdded
                          ? 'bg-white border border-indigo-300 text-indigo-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-indigo-600" />
                          <span>비교 중 (제외)</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>04 판정 비교함 추가</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCandidateDetail(cand.id)}
                      title="04 종합판정 보기"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg border border-slate-200"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State: When no candidates are added to comparison pool */}
      {comparedCandidates.length === 0 && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-dashed border-slate-300 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
            <Scale className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              비교함에 등록된 후보지가 없습니다
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              <strong>04 종합판정</strong>을 받은 후보지들만 비교함에 담아서, 100점 만점 총점과 손익분기점, 규제 통과 여부를 객관적으로 대조합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {activeCandidateId && (
              <button
                type="button"
                onClick={() => onToggleCompare(activeCandidateId)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                현재 검토 후보지 바로 비교함에 담기
              </button>
            )}

            {onAddAllToCompare && (
              <button
                type="button"
                onClick={onAddAllToCompare}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                기본 예시 매물 전체 비교함에 담기
              </button>
            )}

            <button
              type="button"
              onClick={() => handleCandidateDetail(activeCandidateId || candidates[0]?.id)}
              className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold"
            >
              <span>04 종합판정 검토하러 가기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Single Candidate Notice: Need at least 2 for comparative inversion analysis */}
      {comparedCandidates.length === 1 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              현재 <strong>1곳의 후보지</strong>만 비교함에 등록되어 있습니다. 다른 후보지를 추가하시면 <strong>매출 1위 vs 바텀라인 1위 역전 검증</strong>과 다자간 매트릭스를 볼 수 있습니다.
            </span>
          </div>
          {uncomparedCandidates.length > 0 && (
            <button
              type="button"
              onClick={() => onToggleCompare(uncomparedCandidates[0].id)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs whitespace-nowrap"
            >
              + '{uncomparedCandidates[0].name.slice(0, 10)}...' 추가하기
            </button>
          )}
        </div>
      )}

      {/* 2+ Candidates: Best Choice Banner */}
      {comparedCandidates.length >= 2 && bestChoice && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 border border-emerald-300 text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-xs mt-0.5">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[11px] tracking-wide">
                  BEST CHOICE · 최우수 추천 매물
                </span>
                <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                  {bestChoice.candidate.name}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${bestChoice.verdict.badgeClass}`}>
                  {bestChoice.verdict.title} ({bestChoice.scoreBreakdown.totalScore}점)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-snug">
                월 순영업이익 <strong>{Math.round(bestChoice.metrics.monthlyOperatingProfit).toLocaleString()}만원</strong>, 
                임대료 부담률 <strong>{(bestChoice.metrics.rentBurdenRate * 100).toFixed(1)}%</strong>, 
                안전여유율 <strong>{(bestChoice.metrics.marginOfSafety * 100).toFixed(1)}%</strong>로 
                비교 매물 중 종합 사업 안정성과 정량 점수가 가장 높습니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCandidateDetail(bestChoice.candidate.id)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1 shadow-xs"
          >
            <span>1위 매물 상세 판정</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Rank Inversion Banner */}
      {comparedCandidates.length >= 2 && inversions.length > 0 && (
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
                바텀라인 핵심 가치
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px] sm:text-xs">
              Top-line 결제액 기준 <strong>매출 1위 매물</strong>이 과도한 월세·인건비와 행정 규제 리스크로 인해, 실제 
              <strong> 바텀라인 순영업이익 및 종합 안전성에서는 하위 순위로 역전</strong>되었습니다.
            </p>
          </div>
        </div>
      )}

      {/* Cards View */}
      {comparedCandidates.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedByScore.map(({ candidate, metrics, riskEval, scoreBreakdown, verdict }) => {
            const revRank = revenueRankMap.get(candidate.id) || 1;
            const scoreRank = scoreRankMap.get(candidate.id) || 1;
            const isReversed = revRank !== scoreRank;
            const isSelected = candidate.id === activeCandidateId;
            const isWinner = scoreRank === 1;

            return (
              <div
                key={candidate.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-xs flex flex-col justify-between space-y-4 relative ${
                  isWinner
                    ? 'border-emerald-400 ring-2 ring-emerald-400/20 shadow-md'
                    : isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Winner Crown Tag */}
                {isWinner && (
                  <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center gap-1 shadow-xs">
                    <Trophy className="w-3 h-3 text-amber-300" />
                    종합 1위 (추천)
                  </div>
                )}

                <div className="space-y-3">
                  {/* Top Bar: Rank & Verdict Chip */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      isWinner ? 'bg-emerald-100 text-emerald-800 font-black' : 'bg-slate-100 text-slate-700'
                    }`}>
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
                      {candidate.address} {candidate.detailAddress ? `(${candidate.detailAddress})` : ''}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{candidate.businessName}</span>
                      <span>·</span>
                      <span>{candidate.areaSqm}㎡ (약 {Math.round(candidate.areaSqm * 0.3025)}평)</span>
                      <span>·</span>
                      <span>{candidate.floor}층</span>
                    </div>
                  </div>

                  {/* Rank Contrast Badges (Core Inversion Display) */}
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex-1 text-center border-r border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold">Top-line 매출</span>
                      <strong className="text-blue-700 font-extrabold text-xs sm:text-sm">
                        {revRank}위 <span className="text-[10px] font-normal text-slate-500">({candidate.grossRevenue}만)</span>
                      </strong>
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-[10px] text-slate-400 block font-semibold">04 판정 순위</span>
                      <strong className="text-purple-700 font-extrabold text-xs sm:text-sm">
                        {scoreRank}위 <span className="text-[10px] font-normal text-slate-500">({scoreBreakdown.totalScore}점)</span>
                      </strong>
                    </div>
                    {isReversed && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0 animate-pulse">
                        🔄 역전
                      </span>
                    )}
                  </div>

                  {/* 5 Scoring Areas Mini Bar */}
                  <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 flex justify-between">
                      <span>5대 평가 배점</span>
                      <span>{scoreBreakdown.totalScore} / 100점</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-[10px] text-center font-bold">
                      <div className="bg-blue-100 text-blue-800 rounded p-1">
                        <span className="block text-[8px] text-slate-400">수익</span>
                        {scoreBreakdown.profitScore}
                      </div>
                      <div className="bg-indigo-100 text-indigo-800 rounded p-1">
                        <span className="block text-[8px] text-slate-400">회수</span>
                        {scoreBreakdown.paybackScore}
                      </div>
                      <div className="bg-purple-100 text-purple-800 rounded p-1">
                        <span className="block text-[8px] text-slate-400">안전</span>
                        {scoreBreakdown.safetyScore}
                      </div>
                      <div className="bg-amber-100 text-amber-800 rounded p-1">
                        <span className="block text-[8px] text-slate-400">임대</span>
                        {scoreBreakdown.rentScore}
                      </div>
                      <div className={`rounded p-1 ${riskEval.hasBlockingRisk ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        <span className="block text-[8px] text-slate-400">규제</span>
                        {scoreBreakdown.riskScore}
                      </div>
                    </div>
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

                  {/* 6 Risk Rules Summary (including R4 Education Zone GIS status) */}
                  <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px] font-semibold">6대 인허가 규제:</span>
                      {riskEval.hasBlockingRisk ? (
                        <span className="font-bold text-rose-600 flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3.5 h-3.5" /> 차단 발생
                        </span>
                      ) : riskEval.hasConditionalRisk ? (
                        <span className="font-bold text-amber-700 flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" /> 조건부 인허가
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 규제 전면 통과
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[10px] pt-1">
                      <div className="text-slate-600">
                        위반건축: <strong>{candidate.hasViolation ? '🔴 등재' : '🟢 없음'}</strong>
                      </div>
                      <div className="text-slate-600">
                        교육환경: <strong>{
                          candidate.schoolZone === 'none' ? '🟢 비해당' : candidate.schoolZone === 'relative' ? '🟡 상대' : '🔴 절대'
                        }</strong>
                      </div>
                      <div className="text-slate-600">
                        용도: <strong>{candidate.buildingUse.slice(0, 4)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions: Detail View & Remove from Compare */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCandidateDetail(candidate.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-2xs"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>04 종합판정 상세</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReportDetail(candidate.id)}
                      className="py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center gap-1 border border-purple-200 transition-colors"
                      title="AI 리포트 바로보기"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleCompare(candidate.id)}
                    className="w-full py-1.5 text-center text-[11px] text-slate-400 hover:text-rose-600 font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>비교대상에서 제외</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Matrix View */}
      {comparedCandidates.length > 0 && viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[750px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase">
                  <th className="p-3 sm:p-4">비교 항목</th>
                  {sortedByScore.map((item, idx) => (
                    <th key={item.candidate.id} className="p-3 sm:p-4 text-center min-w-[160px]">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                        {item.candidate.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        #{idx + 1}위 매물 · {item.candidate.businessName}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 04 Decision Verdict */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 sm:p-4 font-bold text-slate-800 bg-slate-50/50">
                    04 종합판정 등급
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black inline-block ${item.verdict.badgeClass}`}>
                        {item.verdict.title}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Total Score */}
                <tr className="hover:bg-slate-50/50 bg-indigo-50/20">
                  <td className="p-3 sm:p-4 font-bold text-slate-800">
                    정량 총점 (100점 만점)
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center">
                      <span className="text-base sm:text-lg font-black text-indigo-700">
                        {item.scoreBreakdown.totalScore}
                      </span>
                      <span className="text-xs text-slate-400 font-normal"> /100</span>
                    </td>
                  ))}
                </tr>

                {/* 5-Area Scores */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 sm:p-4 font-semibold text-slate-600 text-xs">
                    5대 배점 상세
                    <span className="block text-[10px] text-slate-400 font-normal">수익35·회수20·안전20·임대10·규제15</span>
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center text-xs text-slate-700">
                      {item.scoreBreakdown.profitScore} / {item.scoreBreakdown.paybackScore} / {item.scoreBreakdown.safetyScore} / {item.scoreBreakdown.rentScore} / {item.scoreBreakdown.riskScore}
                    </td>
                  ))}
                </tr>

                {/* Top-line Gross Revenue */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 sm:p-4 font-semibold text-slate-700">
                    Top-line 월 매출 (공급가액)
                  </td>
                  {sortedByScore.map((item) => {
                    const revRank = revenueRankMap.get(item.candidate.id) || 1;
                    return (
                      <td key={item.candidate.id} className="p-3 sm:p-4 text-center">
                        <div className="font-extrabold text-blue-700">
                          {item.candidate.grossRevenue.toLocaleString()}만원
                        </div>
                        <div className="text-[10px] text-slate-400">
                          매출 #{revRank}위
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Bottom-line Net Operating Profit */}
                <tr className="hover:bg-slate-50/50 bg-emerald-50/20">
                  <td className="p-3 sm:p-4 font-bold text-slate-800">
                    Bottom-line 월 순영업이익
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center">
                      <div className={`font-black text-sm sm:text-base ${
                        item.metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {Math.round(item.metrics.monthlyOperatingProfit).toLocaleString()}만원
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        마진 {(item.metrics.operatingProfitMargin * 100).toFixed(1)}%
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Break-Even Point */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 sm:p-4 font-semibold text-slate-700">
                    손익분기점 (BEP)
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center text-xs">
                      <div className="font-bold text-slate-900">
                        {Math.round(item.metrics.breakEvenRevenue).toLocaleString()}만원
                      </div>
                      <div className="text-[10px] text-indigo-700 font-semibold">
                        안전율 {(item.metrics.marginOfSafety * 100).toFixed(1)}%
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Rent Burden Rate */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 sm:p-4 font-semibold text-slate-700">
                    임대료 부담률 (월세+관리비)
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center text-xs">
                      <div className={`font-bold ${
                        item.metrics.rentBurdenRate <= 0.12 ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {(item.metrics.rentBurdenRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        월 {item.metrics.monthlyRentAndMaintenance}만원
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Initial Investment & Payback Period */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 sm:p-4 font-semibold text-slate-700">
                    초기투자금 및 회수기간
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center text-xs">
                      <div className="font-bold text-slate-900">
                        {item.metrics.paybackPeriodMonths === 999 ? '회수 불가' : `${item.metrics.paybackPeriodMonths.toFixed(1)}개월`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        투자 {item.metrics.initialInvestment.toLocaleString()}만 / 연 ROI {(item.metrics.annualRoi * 100).toFixed(0)}%
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 6 Risk Rules Status */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 sm:p-4 font-semibold text-slate-700">
                    6대 인허가 규제 종합
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center">
                      {item.riskEval.hasBlockingRisk ? (
                        <span className="font-bold text-rose-600 text-xs flex items-center justify-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> 차단 발생
                        </span>
                      ) : item.riskEval.hasConditionalRisk ? (
                        <span className="font-bold text-amber-700 text-xs flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> 조건부 인허가
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-700 text-xs flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 전면 통과
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* R4 School Zone GIS linkage status */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 sm:p-4 font-medium text-slate-600 text-xs">
                    R4 교육환경보호구역 (GIS)
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center text-xs font-semibold">
                      {item.candidate.schoolZone === 'none' && (
                        <span className="text-emerald-700">🟢 비해당</span>
                      )}
                      {item.candidate.schoolZone === 'relative' && (
                        <span className="text-amber-700">🟡 상대보호구역 (심의)</span>
                      )}
                      {item.candidate.schoolZone === 'absolute' && (
                        <span className="text-rose-600">🔴 절대보호구역 (차단)</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* R2 Building Violation */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 sm:p-4 font-medium text-slate-600 text-xs">
                    R2 위반건축물 표기
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center text-xs font-semibold">
                      {item.candidate.hasViolation ? (
                        <span className="text-rose-600 font-bold">🔴 위반건축물 등재</span>
                      ) : (
                        <span className="text-emerald-700">🟢 정상 (위반 없음)</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Action Row */}
                <tr className="bg-slate-50/50">
                  <td className="p-3 sm:p-4 font-bold text-slate-800">
                    관리 액션
                  </td>
                  {sortedByScore.map((item) => (
                    <td key={item.candidate.id} className="p-3 sm:p-4 text-center">
                      <div className="flex flex-col gap-1.5 items-center">
                        <button
                          type="button"
                          onClick={() => handleCandidateDetail(item.candidate.id)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                        >
                          04 판정 상세
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleCompare(item.candidate.id)}
                          className="text-[11px] text-slate-400 hover:text-rose-600 underline"
                        >
                          비교 제외
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Sticky-like Helper Bar */}
      {comparedCandidates.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              현재 <strong>{comparedCandidates.length}곳</strong>의 종합판정 매물이 비교 풀에 등록되어 있습니다.
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onAddNew}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
            >
              + 신규 매물 등록
            </button>
            <button
              type="button"
              onClick={() => handleReportDetail(bestChoice?.candidate.id || activeCandidateId)}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>최우수 매물 AI 리포트 출력</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
