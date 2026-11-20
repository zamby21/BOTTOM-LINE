import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StepId } from '../types/decision';
import {
  Compass,
  MapPin,
  TrendingUp,
  Calculator,
  ShieldAlert,
  Award,
  ArrowRightLeft,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PanelLeft,
  PanelTop,
} from 'lucide-react';

export type StepNavPosition = 'top' | 'left';

interface StepNavProps {
  currentStep: StepId;
  onStepChange: (step: StepId) => void;
  verdictCode?: 'GO' | 'CONDITIONAL' | 'HOLD';
  totalScore?: number;
  position: StepNavPosition;
  onTogglePosition: () => void;
  isMobileView?: boolean;
  containerClass?: string;
}

interface StepItem {
  id: StepId;
  stageNum: string;
  name: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STEPS: StepItem[] = [
  { id: 'S1_START', stageNum: '01 START', name: '시작', shortDesc: '개요·3대 질문', icon: Compass },
  { id: 'S2_INPUT', stageNum: '02 INPUT', name: '후보지 기본정보', shortDesc: '위치·업종·조건', icon: MapPin },
  { id: 'S3_TOPLINE', stageNum: '03 TOP-LINE', name: '매출 산정', shortDesc: '얼마나 팔릴까', icon: TrendingUp },
  { id: 'S4_BOTTOMLINE', stageNum: '04 BOTTOM-LINE', name: '비용 구조', shortDesc: '그래서 남는가', icon: Calculator },
  { id: 'S5_RISK', stageNum: '05 RISK', name: '리스크 점검', shortDesc: '해도 되는가', icon: ShieldAlert },
  { id: 'S6_DECISION', stageNum: '06 DECISION', name: '종합 판정', shortDesc: '그래서 어떻게', icon: Award },
  { id: 'S7_COMPARE', stageNum: '07 COMPARE', name: '후보지 비교', shortDesc: '순위 역전 검증', icon: ArrowRightLeft },
  { id: 'S8_REPORT', stageNum: '08 REPORT', name: 'AI 리포트', shortDesc: 'Gemini 해설·PDF', icon: FileCheck2 },
];

export const StepNav: React.FC<StepNavProps> = ({
  currentStep,
  onStepChange,
  position,
  onTogglePosition,
  isMobileView = false,
  containerClass = 'max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6',
}) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const activeStep = STEPS[currentIndex] || STEPS[0];
  const progressPercent = ((currentIndex + 1) / STEPS.length) * 100;

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const stepButtonRefs = useRef<Partial<Record<StepId, HTMLButtonElement | null>>>({});
  const dragStateRef = useRef<{ isDown: boolean; startX: number; scrollLeft: number; dragged: boolean }>({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    dragged: false,
  });

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showAllStepsGrid, setShowAllStepsGrid] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 2) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  }, []);

  // Auto-center the active step card whenever the step or layout mode changes
  useEffect(() => {
    if (position === 'left' && !isMobileView) return;
    const container = scrollContainerRef.current;
    const activeBtn = stepButtonRefs.current[currentStep];
    if (!container || !activeBtn) return;

    const centerActiveStep = () => {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 2) {
        updateScrollIndicators();
        return;
      }
      const targetLeft =
        activeBtn.offsetLeft - (container.clientWidth - activeBtn.offsetWidth) / 2;
      const clampedLeft = Math.max(0, Math.min(maxScroll, targetLeft));
      container.scrollTo({ left: clampedLeft, behavior: 'smooth' });
      window.setTimeout(updateScrollIndicators, 260);
    };

    const rafId = window.requestAnimationFrame(centerActiveStep);
    return () => window.cancelAnimationFrame(rafId);
  }, [currentStep, isMobileView, position, updateScrollIndicators]);

  // Keep scroll fade indicators updated on window resize
  useEffect(() => {
    if (position === 'left' && !isMobileView) return;
    updateScrollIndicators();
    window.addEventListener('resize', updateScrollIndicators);
    return () => window.removeEventListener('resize', updateScrollIndicators);
  }, [isMobileView, position, updateScrollIndicators]);

  // Allow vertical mouse wheel to scroll the step rail horizontally when overflowing (e.g. PC mobile view mode)
  useEffect(() => {
    if (position === 'left' && !isMobileView) return;
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 2) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        updateScrollIndicators();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isMobileView, position, updateScrollIndicators]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth + 2) return;
    dragStateRef.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      dragged: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el || !dragStateRef.current.isDown) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragStateRef.current.startX;
    if (Math.abs(walk) > 6) {
      dragStateRef.current.dragged = true;
    }
    if (dragStateRef.current.dragged) {
      e.preventDefault();
      el.scrollLeft = dragStateRef.current.scrollLeft - walk;
      updateScrollIndicators();
    }
  };

  const handleMouseUpOrLeave = () => {
    dragStateRef.current.isDown = false;
  };

  const handleStepClick = (stepId: StepId) => {
    if (dragStateRef.current.dragged) {
      dragStateRef.current.dragged = false;
      return;
    }
    setShowAllStepsGrid(false);
    onStepChange(stepId);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setShowAllStepsGrid(false);
      onStepChange(STEPS[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < STEPS.length - 1) {
      setShowAllStepsGrid(false);
      onStepChange(STEPS[currentIndex + 1].id);
    }
  };

  // Left Vertical Sticky Sidebar Mode (Compact width & vertical spacing)
  if (position === 'left' && !isMobileView) {
    return (
      <aside
        aria-label="단계별 분석 좌측 메뉴"
        className="hidden lg:flex flex-col w-48 xl:w-52 flex-shrink-0 sticky top-15 self-start h-[calc(100vh-3.75rem)] bg-white/95 backdrop-blur-md border-r border-slate-200 shadow-2xs z-30 print:hidden"
      >
        {/* Sidebar Top Header + Toggle Back to Horizontal Top */}
        <div className="px-2.5 py-2 border-b border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[11px] font-extrabold text-slate-700 whitespace-nowrap">
                분석 단계
              </span>
              <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md tabular-nums leading-none">
                {currentIndex + 1}/{STEPS.length}
              </span>
            </div>
            <button
              type="button"
              onClick={onTogglePosition}
              title="상단 가로 고정 메뉴로 전환"
              className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <PanelTop className="w-3 h-3 flex-shrink-0" />
              <span>상단 가로</span>
            </button>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Compact Vertical Step List */}
        <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;

            return (
              <button
                key={step.id}
                onClick={() => onStepChange(step.id)}
                type="button"
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div
                    className={`text-[9px] font-bold uppercase tracking-wider truncate ${
                      isActive ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {step.stageNum}
                  </div>
                  <div className="text-xs font-extrabold truncate">
                    {step.name}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? 'text-blue-100/85' : 'text-slate-400'
                    }`}
                  >
                    {step.shortDesc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Prev / Next Footer */}
        <div className="px-2 py-2 border-t border-slate-100 bg-slate-50/70 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="h-7 flex items-center justify-center gap-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            이전
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === STEPS.length - 1}
            className="h-7 flex items-center justify-center gap-0.5 rounded-md bg-slate-900 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            다음
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // Sticky Top Horizontal Bar Mode (Uniform equal-width step cards on desktop & auto-centered equal-width rail on mobile)
  return (
    <nav
      aria-label="단계별 분석 상단 메뉴"
      className={`sticky ${
        isMobileView ? 'top-13' : 'top-14 sm:top-15'
      } z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 print:hidden shadow-xs`}
    >
      {/* Mobile Compact Progress Bar & Quick Step Switcher */}
      <div
        className={`${
          isMobileView ? 'block' : 'lg:hidden'
        } px-3 py-1.5 border-b border-slate-100 bg-slate-50/85`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-slate-500 disabled:opacity-30 hover:bg-slate-200/80 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            aria-label="이전 단계"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowAllStepsGrid((prev) => !prev)}
            aria-expanded={showAllStepsGrid}
            title="전체 8단계 한눈에 보기"
            className="flex-1 min-w-0 text-center rounded-lg px-2 py-0.5 hover:bg-slate-200/60 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-100/80 px-1.5 py-0.5 rounded tabular-nums leading-none flex-shrink-0">
                {currentIndex + 1} / {STEPS.length}
              </span>
              <span className="font-extrabold text-xs text-slate-900 truncate">
                {activeStep.stageNum} · {activeStep.name}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                  showAllStepsGrid ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </div>
            <div className="w-full bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === STEPS.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-slate-500 disabled:opacity-30 hover:bg-slate-200/80 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            aria-label="다음 단계"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Expandable 4x2 Quick-Jump Overview Grid (Mobile) */}
        {showAllStepsGrid && (
          <div className="mt-2 pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-1.5 pb-0.5">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div
                      className={`text-[8.5px] font-bold uppercase tracking-tight truncate ${
                        isActive ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {step.stageNum}
                    </div>
                    <div className="text-[11px] font-extrabold truncate">{step.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Equal-Width Horizontal Tabs (Desktop grid-cols-8, Mobile full-bleed auto-centering scroller) */}
      <div className={isMobileView ? 'w-full' : 'w-full lg:px-6'}>
        <div
          className={`flex items-center gap-2 ${
            isMobileView ? '' : containerClass.includes('max-w-') ? 'lg:max-w-[1440px] lg:mx-auto' : ''
          }`}
        >
          <div className="relative flex-1 min-w-0">
            {/* Soft Left Edge Fade Indicator (Mobile Scroll Mode) */}
            {canScrollLeft && (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute left-0 top-0 bottom-0 w-7 z-10 bg-gradient-to-r from-white via-white/85 to-transparent ${
                  isMobileView ? '' : 'lg:hidden'
                }`}
              />
            )}

            {/* Soft Right Edge Fade Indicator (Mobile Scroll Mode) */}
            {canScrollRight && (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute right-0 top-0 bottom-0 w-7 z-10 bg-gradient-to-l from-white via-white/85 to-transparent ${
                  isMobileView ? '' : 'lg:hidden'
                }`}
              />
            )}

            <div
              ref={scrollContainerRef}
              onScroll={updateScrollIndicators}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className={`flex gap-1.5 overflow-x-auto no-scrollbar select-none ${
                isMobileView
                  ? 'px-3 py-2'
                  : 'px-3 sm:px-5 py-2 lg:px-0 lg:py-1.5 lg:grid lg:grid-cols-8 lg:overflow-visible'
              }`}
            >
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;

                return (
                  <button
                    key={step.id}
                    ref={(el) => {
                      stepButtonRefs.current[step.id] = el;
                    }}
                    onClick={() => handleStepClick(step.id)}
                    type="button"
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-left transition-all flex-shrink-0 border touch-manipulation cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                      isMobileView
                        ? 'w-[126px]'
                        : 'w-[126px] lg:w-full lg:min-w-0 lg:flex-shrink xl:px-2.5'
                    } ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs ring-2 ring-blue-600/20'
                        : 'bg-slate-50/80 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 ${
                        isMobileView ? '' : 'xl:w-7 xl:h-7'
                      } rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white border border-slate-200/80 text-slate-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div
                        className={`text-[8.5px] ${
                          isMobileView ? '' : 'xl:text-[9.5px]'
                        } font-bold uppercase tracking-tight truncate ${
                          isActive ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {step.stageNum}
                      </div>
                      <div
                        className={`text-[11px] ${
                          isMobileView ? '' : 'xl:text-xs'
                        } font-extrabold truncate`}
                      >
                        {step.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Toggle to Left Vertical Sidebar */}
          {!isMobileView && (
            <div className="hidden lg:flex items-center pl-2 border-l border-slate-200 flex-shrink-0">
              <button
                type="button"
                onClick={onTogglePosition}
                title="단계 메뉴를 좌측 세로 고정 사이드바로 전환"
                className="h-9 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-600 text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                <PanelLeft className="w-3.5 h-3.5 flex-shrink-0" />
                <span>좌측 세로</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
