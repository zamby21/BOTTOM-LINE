import React, { useState, useRef, useEffect } from 'react';
import { CandidateLocation } from '../types/decision';
import type { ViewMode } from '../App';
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
  Monitor,
  Maximize2,
  Smartphone,
  ChevronDown,
  Check,
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
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  containerClass?: string;
}

const VIEW_MODE_OPTIONS: {
  id: ViewMode;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'auto',
    label: '자동 반응형',
    shortLabel: '자동',
    desc: '화면 크기에 맞춰 최적 폭 자동 조정',
    icon: Monitor,
  },
  {
    id: 'wide',
    label: '와이드 화면',
    shortLabel: '와이드',
    desc: '큰 모니터에서 여백을 줄여 넓게 보기',
    icon: Maximize2,
  },
  {
    id: 'mobile',
    label: '모바일 최적화',
    shortLabel: '모바일',
    desc: '한 손 조작·1열 세로 모바일 전용 레이아웃',
    icon: Smartphone,
  },
];

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
  viewMode,
  onChangeViewMode,
  containerClass = 'max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  const comparedCount = candidates.filter((c) => c.addedToCompare).length;
  const isMobileView = viewMode === 'mobile';
  const activeViewMeta =
    VIEW_MODE_OPTIONS.find((opt) => opt.id === viewMode) || VIEW_MODE_OPTIONS[0];
  const ActiveViewIcon = activeViewMeta.icon;

  useEffect(() => {
    if (!viewMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setViewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [viewMenuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs print:hidden">
      <div className={containerClass}>
        <div
          className={`flex items-center justify-between gap-2 ${
            isMobileView ? 'h-13' : 'h-14 sm:h-15 xl:gap-3'
          }`}
        >
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
            className="flex items-center gap-2 flex-shrink-0 text-left cursor-pointer hover:opacity-85 active:scale-[0.99] transition-all rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div
              className={`${
                isMobileView ? 'w-7 h-7 rounded-lg' : 'w-8 h-8 xl:w-9 xl:h-9 rounded-xl'
              } bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 flex items-center justify-center text-white shadow-xs flex-shrink-0`}
            >
              <Building2
                className={`${isMobileView ? 'w-3.5 h-3.5' : 'w-4 h-4 xl:w-5 xl:h-5'} text-blue-200`}
              />
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                className={`font-black tracking-tight text-slate-900 leading-none ${
                  isMobileView ? 'text-sm' : 'text-sm sm:text-base xl:text-lg'
                }`}
              >
                BOTTOM LINE
              </span>
              {!isMobileView && (
                <span className="hidden sm:inline-block px-1.5 xl:px-2 py-0.5 text-[10px] xl:text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md leading-tight whitespace-nowrap">
                  상업용 부동산 판정
                </span>
              )}
            </div>
          </button>

          {/* Desktop Candidate Switcher & Uniform Action Buttons */}
          {!isMobileView && (
            <div className="hidden lg:flex items-center justify-end gap-1.5 xl:gap-2 flex-1 min-w-0">
              {/* Candidate Switcher */}
              <div className="flex items-center h-9 bg-slate-100 rounded-lg px-1.5 border border-slate-200 gap-1.5 flex-1 min-w-[180px] max-w-[240px] xl:max-w-[330px]">
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
                    className="h-9 w-[104px] xl:w-[120px] flex items-center justify-center gap-1 xl:gap-1.5 px-1.5 xl:px-2 text-[11px] xl:text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
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
                    className="h-9 w-[104px] xl:w-[120px] flex items-center justify-center gap-1 xl:gap-1.5 px-1.5 xl:px-2 text-[11px] xl:text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-colors shadow-2xs tabular-nums whitespace-nowrap cursor-pointer"
                    title="저장된 분석 히스토리"
                  >
                    <History className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span>분석 이력 ({historyCount})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenCompare}
                  className="h-9 w-[104px] xl:w-[120px] flex items-center justify-center gap-1 xl:gap-1.5 px-1.5 xl:px-2 text-[11px] xl:text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-colors shadow-2xs tabular-nums whitespace-nowrap cursor-pointer"
                  title="후보지 비교"
                >
                  <Scale className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                  <span>후보지 비교 ({comparedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenReport}
                  className="h-9 w-[104px] xl:w-[120px] flex items-center justify-center gap-1 xl:gap-1.5 px-1.5 xl:px-2 text-[11px] xl:text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
                  title="AI 종합 리포트"
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>AI 리포트</span>
                </button>
              </div>

              {/* Display / Screen Mode Selector */}
              <div className="relative flex-shrink-0" ref={viewMenuRef}>
                <button
                  type="button"
                  onClick={() => setViewMenuOpen((prev) => !prev)}
                  title="화면 크기 및 모바일 최적화 모드 전환"
                  aria-expanded={viewMenuOpen}
                  aria-haspopup="menu"
                  className={`h-9 px-2 xl:px-2.5 flex items-center gap-1 rounded-lg border text-[11px] xl:text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    viewMode !== 'auto'
                      ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <ActiveViewIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{activeViewMeta.shortLabel}</span>
                  <ChevronDown className="w-3 h-3 opacity-70 flex-shrink-0" />
                </button>

                {viewMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 z-50 space-y-1"
                  >
                    <div className="px-2.5 py-1.5 border-b border-slate-100">
                      <div className="text-[11px] font-extrabold text-slate-800">
                        화면 표시 최적화 모드
                      </div>
                      <div className="text-[10px] text-slate-500">
                        사용 중인 기기·모니터에 맞게 UI 폭을 조정합니다.
                      </div>
                    </div>
                    {VIEW_MODE_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = viewMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            onChangeViewMode(opt.id);
                            setViewMenuOpen(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-blue-900 border border-blue-200'
                              : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold">{opt.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </div>
                            <div className="text-[10px] text-slate-500 leading-snug mt-0.5">
                              {opt.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
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
          )}

          {/* Mobile Right Quick Action Buttons */}
          <div className={`flex items-center gap-1.5 ${isMobileView ? '' : 'lg:hidden'}`}>
            {isMobileView && (
              <button
                type="button"
                onClick={() => onChangeViewMode('auto')}
                title="PC / 자동 반응형 화면으로 돌아가기"
                className="h-8 px-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors"
              >
                <Monitor className="w-3.5 h-3.5 flex-shrink-0" />
                <span>PC</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenCompare}
              className="h-8 px-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer tabular-nums"
            >
              <Scale className="w-3.5 h-3.5 flex-shrink-0" />
              <span>비교({comparedCount})</span>
            </button>

            <button
              type="button"
              onClick={onOpenReport}
              className="h-8 px-2 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              <span>리포트</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div
            className={`${
              isMobileView ? '' : 'lg:hidden'
            } border-t border-slate-200 py-3 space-y-3 bg-white`}
          >
            {/* Display Mode Switcher in Mobile Menu */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                화면 표시 모드
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                {VIEW_MODE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = viewMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChangeViewMode(opt.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`py-2 px-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{opt.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 px-1 uppercase tracking-wider">
                현재 검토 후보지 선택
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
                    className={`p-2.5 text-left rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      c.id === activeCandidateId
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">
                      #{idx + 1}. {c.isStarred ? '★ ' : ''}{c.isLocked ? '🔒 ' : ''}{c.name}
                    </span>
                    <span className="text-[10px] opacity-80 flex-shrink-0 ml-2 tabular-nums">
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
                    className="py-2.5 px-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
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
                    className="py-2.5 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center gap-1.5 tabular-nums cursor-pointer"
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
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
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
                className="px-3 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                초기화
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
