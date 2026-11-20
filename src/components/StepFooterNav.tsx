import React from 'react';
import { StepId } from '../types/decision';
import { STEPS } from './StepNav';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

interface StepFooterNavProps {
  currentStep: StepId;
  onStepChange: (step: StepId) => void;
}

export const StepFooterNav: React.FC<StepFooterNavProps> = ({
  currentStep,
  onStepChange,
}) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  if (currentIndex === -1) return null;

  const prevStep = currentIndex > 0 ? STEPS[currentIndex - 1] : null;
  const nextStep = currentIndex < STEPS.length - 1 ? STEPS[currentIndex + 1] : null;

  const navigateTo = (stepId: StepId) => {
    onStepChange(stepId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextStageNum = nextStep ? nextStep.stageNum.split(' ')[0] : '';
  const prevStageNum = prevStep ? prevStep.stageNum.split(' ')[0] : '';

  return (
    <div
      aria-label="세션 하단 이전·다음 단계 이동"
      className="mt-[1cm] bg-white rounded-2xl p-3.5 sm:px-6 sm:py-4 border border-slate-200 shadow-xs flex items-center justify-end gap-2 print:hidden"
    >
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
        {prevStep && (
          <button
            type="button"
            onClick={() => navigateTo(prevStep.id)}
            title={`이전 단계: ${prevStageNum} ${prevStep.name}`}
            className="h-10 min-w-[88px] px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span>이전</span>
          </button>
        )}

        {nextStep ? (
          <button
            type="button"
            onClick={() => navigateTo(nextStep.id)}
            className="h-10 min-w-[168px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <span>
              다음: {nextStageNum} {nextStep.name}
            </span>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigateTo(STEPS[0].id)}
            className="h-10 min-w-[168px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
            <span>처음으로: 01 시작</span>
          </button>
        )}
      </div>
    </div>
  );
};
