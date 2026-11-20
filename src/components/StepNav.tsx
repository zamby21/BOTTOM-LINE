import React from 'react';
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
  verdictCode,
  totalScore,
  position,
  onTogglePosition,
}) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const activeStep = STEPS[currentIndex] || STEPS[0];
  const progressPercent = ((currentIndex + 1) / STEPS.length) * 100;

  const handlePrev = () => {
    if (currentIndex > 0) {
      onStepChange(STEPS[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < STEPS.length - 1) {
      onStepChange(STEPS[currentIndex + 1].id);
    }
  };

  const renderScoreBadge = (isActive: boolean) => {
    if (totalScore === undefined) return null;
    return (
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none whitespace-nowrap ${
          isActive
            ? 'bg-white text-blue-700'
            : verdictCode === 'GO'
            ? 'bg-emerald-100 text-emerald-700'
            : verdictCode === 'CONDITIONAL'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-rose-100 text-rose-700'
        }`}
      >
        {totalScore}점
      </span>
    );
  };

  // Left Vertical Sticky Sidebar Mode (Desktop >= lg)
  if (position === 'left') {
    return (
      <aside
        aria-label="단계별 분석 좌측 메뉴"
        className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] bg-white/95 backdrop-blur-md border-r border-slate-200 shadow-2xs z-30 print:hidden"
      >
        {/* Sidebar Top Header + Toggle Back to Horizontal Top */}
        <div className="px-3.5 py-3 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-extrabold text-slate-700 whitespace-nowrap">
                분석 단계
              </span>
              <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md tabular-nums">
                {currentIndex + 1} / {STEPS.length}
              </span>
            </div>
            <button
              type="button"
              onClick={onTogglePosition}
              title="상단 가로 고정 메뉴로 전환"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors whitespace-nowrap cursor-pointer"
            >
              <PanelTop className="w-3.5 h-3.5 flex-shrink-0" />
              <span>상단 가로</span>
            </button>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Vertical Step List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-1">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;

            return (
              <button
                key={step.id}
                onClick={() => onStepChange(step.id)}
                type="button"
                className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                        isActive ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {step.stageNum}
                    </span>
                    {step.id === 'S6_DECISION' && renderScoreBadge(isActive)}
                  </div>
                  <div className="text-xs font-extrabold leading-snug truncate">
                    {step.name}
                  </div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      isActive ? 'text-blue-100/90' : 'text-slate-400'
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
        <div className="px-2.5 py-2.5 border-t border-slate-100 bg-slate-50/70 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="h-8 flex items-center justify-center gap-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            이전
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === STEPS.length - 1}
            className="h-8 flex items-center justify-center gap-1 rounded-lg bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            다음
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // Sticky Top Horizontal Bar Mode (Default, always visible on scroll)
  return (
    <nav
      aria-label="단계별 분석 상단 메뉴"
      className="sticky top-14 sm:top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 print:hidden shadow-xs"
    >
      {/* Mobile Compact Progress Bar & Quick Step Switcher */}
      <div className="lg:hidden px-3 py-2 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-1 rounded-lg text-slate-500 disabled:opacity-30 hover:bg-slate-200"
            aria-label="이전 단계"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 text-center min-w-0">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-100/70 px-1.5 py-0.2 rounded">
                {currentIndex + 1} / {STEPS.length}
              </span>
              <span className="font-extrabold text-xs text-slate-900 truncate">
                {activeStep.stageNum} {activeStep.name}
              </span>
              {currentStep === 'S6_DECISION' && totalScore !== undefined && (
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                  {totalScore}점
                </span>
              )}
            </div>
            <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === STEPS.length - 1}
            className="p-1 rounded-lg text-slate-500 disabled:opacity-30 hover:bg-slate-200"
            aria-label="다음 단계"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Tabs + Left Sidebar Toggle */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex space-x-1.5 sm:space-x-2 py-2 overflow-x-auto no-scrollbar">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => onStepChange(step.id)}
                  type="button"
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-left transition-all flex-shrink-0 touch-manipulation cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                          isActive ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {step.stageNum}
                      </span>
                      {step.id === 'S6_DECISION' && renderScoreBadge(isActive)}
                    </div>
                    <div className="text-xs font-bold leading-tight whitespace-nowrap">
                      {step.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop Toggle to Left Vertical Sidebar */}
          <div className="hidden lg:flex items-center pl-2 border-l border-slate-200 flex-shrink-0">
            <button
              type="button"
              onClick={onTogglePosition}
              title="단계 메뉴를 좌측 세로 고정 사이드바로 전환"
              className="h-9 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-600 text-[11px] font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
            >
              <PanelLeft className="w-3.5 h-3.5 flex-shrink-0" />
              <span>좌측 세로</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
