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
} from 'lucide-react';

interface StepNavProps {
  currentStep: StepId;
  onStepChange: (step: StepId) => void;
  verdictCode?: 'GO' | 'CONDITIONAL' | 'HOLD';
  totalScore?: number;
}

interface StepItem {
  id: StepId;
  stageNum: string;
  name: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STEPS: StepItem[] = [
  { id: 'S1_START', stageNum: 'S1', name: '시작', shortDesc: '개요·3대 질문', icon: Compass },
  { id: 'S2_INPUT', stageNum: 'S2', name: '후보지 입력', shortDesc: '주소·업종·조건', icon: MapPin },
  { id: 'S3_TOPLINE', stageNum: '01 TOP-LINE', name: '매출 산정', shortDesc: '얼마나 팔릴까', icon: TrendingUp },
  { id: 'S4_BOTTOMLINE', stageNum: '02 BOTTOM-LINE', name: '비용 구조', shortDesc: '그래서 남는가', icon: Calculator },
  { id: 'S5_RISK', stageNum: '03 RISK', name: '리스크 점검', shortDesc: '해도 되는가', icon: ShieldAlert },
  { id: 'S6_DECISION', stageNum: '04 DECISION', name: '종합 판정', shortDesc: '그래서 어떻게', icon: Award },
  { id: 'S7_COMPARE', stageNum: 'S7', name: '후보지 비교', shortDesc: '순위 역전 검증', icon: ArrowRightLeft },
  { id: 'S8_REPORT', stageNum: 'S8', name: 'AI 리포트', shortDesc: 'Gemini 해설·PDF', icon: FileCheck2 },
];

export const StepNav: React.FC<StepNavProps> = ({
  currentStep,
  onStepChange,
  verdictCode,
  totalScore,
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

  return (
    <nav className="bg-white border-b border-slate-200 print:hidden shadow-2xs">
      {/* Mobile Compact Progress Bar & Quick Step Switcher */}
      <div className="lg:hidden px-3 py-2 border-b border-slate-100 bg-slate-50/70">
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
            {/* Tiny progress line */}
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

      {/* Horizontal Scrollable Tabs */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex space-x-1.5 sm:space-x-2 py-2 overflow-x-auto no-scrollbar">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;

            return (
              <button
                key={step.id}
                onClick={() => onStepChange(step.id)}
                type="button"
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-left transition-all flex-shrink-0 touch-manipulation ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
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
                      className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                        isActive ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {step.stageNum}
                    </span>
                    {step.id === 'S6_DECISION' && totalScore !== undefined && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${
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
                    )}
                  </div>
                  <div className="text-xs font-bold leading-tight truncate">
                    {step.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
