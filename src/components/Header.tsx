import React, { useState } from 'react';
import { CandidateLocation } from '../types/decision';
import {
  Building2,
  Layers,
  RotateCcw,
  Plus,
  Scale,
  FileText,
  Menu,
  X,
  BarChart3,
  History,
} from 'lucide-react';

interface HeaderProps {
  candidates: CandidateLocation[];
  activeCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onAddCandidate: () => void;
  onResetPresets: () => void;
  onOpenReport: () => void;
  onOpenCompare: () => void;
  onOpenRegionMarket?: () => void;
  onOpenHistory?: () => void;
  historyCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  candidates,
  activeCandidateId,
  onSelectCandidate,
  onAddCandidate,
  onResetPresets,
  onOpenReport,
  onOpenCompare,
  onOpenRegionMarket,
  onOpenHistory,
  historyCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeCandidate = candidates.find((c) => c.id === activeCandidateId) || candidates[0];
  const comparedCount = candidates.filter((c) => c.addedToCompare).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 xl:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 xl:gap-3">
          {/* Logo */}
          <button
            type="button"
            onClick={() => {
              if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
                window.location.assign('/');
              } else {
                window.location.reload();
              }
            }}
            title="첫 화면으로 새로고침"
            aria-label="BOTTOM LINE 첫 화면으로 페이지 새로고침"
            className="flex items-center gap-2 xl:gap-2.5 flex-shrink-0 text-left cursor-pointer hover:opacity-85 active:scale-[0.99] transition-all rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 flex items-center justify-center text-white shadow-xs flex-shrink-0">
              <Building2 className="w-4 h-4 xl:w-5 xl:h-5 text-blue-200" />
            </div>
            <div className="flex items-center gap-1.5 xl:gap-2 whitespace-nowrap">
              <span className="font-black text-sm sm:text-base xl:text-lg tracking-tight text-slate-900 leading-none">
                BOTTOM LINE
              </span>
              <span className="px-1.5 xl:px-2 py-0.5 text-[10px] xl:text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md leading-tight whitespace-nowrap">
                상업용 부동산 판정
              </span>
            </div>
          </button>

          {/* Desktop Candidate Switcher & Uniform Action Buttons */}
          <div className="hidden lg:flex items-center justify-end gap-1.5 xl:gap-2 flex-1 min-w-0">
            {/* Candidate Switcher */}
            <div className="flex items-center h-9 bg-slate-100 rounded-lg px-1.5 border border-slate-200 gap-1.5 flex-1 min-w-[195px] max-w-[245px] xl:max-w-[320px]">
              <span className="text-[11px] xl:text-xs font-bold text-slate-600 pl-0.5 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
                <Layers className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                검토 매물
              </span>
              <select
                value={activeCandidateId}
                onChange={(e) => onSelectCandidate(e.target.value)}
                className="h-7 flex-1 min-w-0 bg-white border border-slate-200/80 text-[11px] xl:text-xs font-semibold text-slate-800 rounded-md px-1.5 xl:px-2 shadow-2xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer truncate"
              >
                {candidates.map((c, idx) => (
                  <option key={c.id} value={c.id}>
                    #{idx + 1}. {c.isStarred ? '★ ' : ''}{c.isLocked ? '🔒 ' : ''}{c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAddCandidate}
                title="새 후보지 추가"
                className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors flex-shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Uniform 4 Action Buttons */}
            <div className="grid grid-cols-4 gap-1.5 flex-shrink-0">
              {onOpenRegionMarket && (
                <button
                  type="button"
                  onClick={onOpenRegionMarket}
                  className="h-9 w-[108px] xl:w-[124px] flex items-center justify-center gap-1 xl:gap-1.5 px-1.5 xl:px-2 text-[11px] xl:text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                  title="지역·상권 통계 및 임대 수준 비교"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                  <span>지역 데이터</span>
                </button>
              )}

              {onOpenHistory && (
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="h-9 w-[108px] xl:w-[124px] flex items-center justify-center gap-1 xl:gap-1.5 px-1.5 xl:px-2 text-[11px] xl:text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-colors shadow-2xs tabular-nums whitespace-nowrap cursor-pointer"
                  title="저장된 분석 히스토리"
                >
                  <History className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>분석 이력 ({historyCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenCompare}
                className="h-9 w-[108px] xl:w-[124px] flex items-center justify-center gap-1 xl:gap-1.5 px-1.5 xl:px-2 text-[11px] xl:text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-colors shadow-2xs tabular-nums whitespace-nowrap cursor-pointer"
                title="후보지 비교"
              >
                <Scale className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <span>후보지 비교 ({comparedCount})</span>
              </button>

              <button
                type="button"
                onClick={onOpenReport}
                className="h-9 w-[108px] xl:w-[124px] flex items-center justify-center gap-1 xl:gap-1.5 px-1.5 xl:px-2 text-[11px] xl:text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                title="AI 종합 리포트"
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span>AI 리포트</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onResetPresets}
              title="예시 3곳 초기화"
              aria-label="예시 3곳 초기화"
              className="h-9 w-8 xl:w-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Right Quick Action Buttons */}
          <div className="flex lg:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenCompare}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>비교({comparedCount})</span>
            </button>

            <button
              type="button"
              onClick={onOpenReport}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>리포트</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 py-3 space-y-3 bg-white">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                현재 검토 후보지 선택:
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {candidates.map((c, idx) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelectCandidate(c.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2.5 text-left rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                      c.id === activeCandidateId
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">
                      #{idx + 1}. {c.isStarred ? '★ ' : ''}{c.isLocked ? '🔒 ' : ''}{c.name}
                    </span>
                    <span className="text-[10px] opacity-80 flex-shrink-0 ml-2">
                      {c.deposit}만 / {c.monthlyRent}만
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {(onOpenRegionMarket || onOpenHistory) && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                {onOpenRegionMarket && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRegionMarket();
                      setMobileMenuOpen(false);
                    }}
                    className="py-2 px-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    지역·상권 데이터
                  </button>
                )}
                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenHistory();
                      setMobileMenuOpen(false);
                    }}
                    className="py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center gap-1.5 tabular-nums"
                  >
                    <History className="w-3.5 h-3.5" />
                    분석 이력 ({historyCount})
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onAddCandidate();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                새 후보지 추가
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetPresets();
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                예시 3곳 초기화
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
