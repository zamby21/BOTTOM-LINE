import React from 'react';
import { StepId } from '../types/decision';
import { STEPS } from './StepNav';
import { ArrowLeft, ArrowRight, Sparkles, Scale } from 'lucide-react';

interface MobileBottomBarProps {
  currentStep: StepId;
  onStepChange: (step: StepId) => void;
  onOpenReport: () => void;
  onOpenCompare: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  currentStep,
  onStepChange,
  onOpenReport,
  onOpenCompare,
}) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEPS.length - 1;

  const handlePrev = () => {
    if (currentIndex > 0) {
      onStepChange(STEPS[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentIndex < STEPS.length - 1) {
      onStepChange(STEPS[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5 shadow-lg lg:hidden print:hidden">
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Prev Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={isFirst}
          className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>이전</span>
        </button>

        {/* Context-aware Quick Action */}
        {currentStep === 'S6_DECISION' ? (
          <button
            type="button"
            onClick={onOpenReport}
            className="flex-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI 심층 리포트</span>
          </button>
        ) : currentStep === 'S1_START' ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
          >
            <span>후보지 분석 시작</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={isLast}
            className="flex-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-sm disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all"
          >
            <span>다음 단계 ({STEPS[currentIndex + 1]?.name || '완료'})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
