import React, { useState } from 'react';
import { CandidateLocation, StepId } from './types/decision';
import { INITIAL_PRESET_CANDIDATES, INDUSTRY_BENCHMARKS } from './data/presets';
import { calculateFinancialMetrics, evaluateRiskRules, calculateDecisionScore } from './utils/engine';
import { Header } from './components/Header';
import { StepNav } from './components/StepNav';
import { MobileBottomBar } from './components/MobileBottomBar';
import { S1Start } from './components/S1Start';
import { S2Input } from './components/S2Input';
import { S3TopLine } from './components/S3TopLine';
import { S4BottomLine } from './components/S4BottomLine';
import { S5Risk } from './components/S5Risk';
import { S6Decision } from './components/S6Decision';
import { S7Compare } from './components/S7Compare';
import { S8Report } from './components/S8Report';

export default function App() {
  const [candidates, setCandidates] = useState<CandidateLocation[]>(() => {
    try {
      const saved = localStorage.getItem('bottomline_candidates');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return INITIAL_PRESET_CANDIDATES;
  });

  const [activeCandidateId, setActiveCandidateId] = useState<string>(
    INITIAL_PRESET_CANDIDATES[0].id
  );
  const [currentStep, setCurrentStep] = useState<StepId>('S1_START');

  const updateCandidate = (updated: CandidateLocation) => {
    setCandidates((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      try {
        localStorage.setItem('bottomline_candidates', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleAddNewCandidate = () => {
    const newIdx = candidates.length + 1;
    const defaultBenchmark = INDUSTRY_BENCHMARKS.cafe;
    const newCandidate: CandidateLocation = {
      id: `candidate-${Date.now()}`,
      name: `후보지 ${String.fromCharCode(64 + newIdx)}: 신규 검토 매물`,
      address: '서울특별시 마포구 양화로 100',
      detailAddress: '지상 1층',
      regionCode: 'seoul',
      businessType: 'cafe',
      businessName: defaultBenchmark.name,
      buildingUse: '제2종근린생활시설',
      zoning: '일반상업지역',
      areaSqm: 49.5,
      floor: 1,
      hasViolation: false,
      schoolZone: 'none',

      deposit: 4000,
      monthlyRent: 280,
      maintenanceFee: 25,
      premium: 2000,

      revenueSource: 'openup',
      grossRevenue: 3000,
      isVatIncluded: true,

      costOfGoodsRate: defaultBenchmark.costOfGoodsRate,
      otherVariableRate: 3.0,
      cardRatio: defaultBenchmark.cardRatio,
      cardFeeRate: 1.5,
      deliveryRatio: defaultBenchmark.deliveryRatio,
      deliveryFeeRate: defaultBenchmark.deliveryFeeRate,

      fullTimeStaff: defaultBenchmark.standardStaffCount,
      hourlyWage: 10030,
      socialInsuranceRate: 10.5,
      ownerSalary: 300,

      interiorCost: 3000,
      equipmentCost: 2000,
      depreciationMonths: 60,
    };

    const nextList = [...candidates, newCandidate];
    setCandidates(nextList);
    setActiveCandidateId(newCandidate.id);
    setCurrentStep('S2_INPUT');
    try {
      localStorage.setItem('bottomline_candidates', JSON.stringify(nextList));
    } catch (e) {}
  };

  const handleResetPresets = () => {
    if (confirm('기본 예시 후보지 3곳 데이터로 초기화하시겠습니까?')) {
      setCandidates(INITIAL_PRESET_CANDIDATES);
      setActiveCandidateId(INITIAL_PRESET_CANDIDATES[0].id);
      setCurrentStep('S1_START');
      try {
        localStorage.removeItem('bottomline_candidates');
      } catch (e) {}
    }
  };

  const handleToggleCompare = (candidateId: string) => {
    setCandidates((prev) => {
      const next = prev.map((c) => {
        if (c.id === candidateId) {
          const nextAdded = !c.addedToCompare;
          return {
            ...c,
            addedToCompare: nextAdded,
            evaluatedAt: nextAdded ? new Date().toISOString() : c.evaluatedAt,
          };
        }
        return c;
      });
      try {
        localStorage.setItem('bottomline_candidates', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleAddAllToCompare = () => {
    setCandidates((prev) => {
      const next = prev.map((c) => ({
        ...c,
        addedToCompare: true,
        evaluatedAt: c.evaluatedAt || new Date().toISOString(),
      }));
      try {
        localStorage.setItem('bottomline_candidates', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const activeCandidate =
    candidates.find((c) => c.id === activeCandidateId) || candidates[0];

  const activeMetrics = calculateFinancialMetrics(activeCandidate);
  const activeRiskEval = evaluateRiskRules(activeCandidate);
  const { scoreBreakdown: activeScore, verdict: activeVerdict } =
    calculateDecisionScore(activeMetrics, activeRiskEval);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Fixed Header */}
      <Header
        candidates={candidates}
        activeCandidateId={activeCandidate.id}
        onSelectCandidate={(id) => setActiveCandidateId(id)}
        onAddCandidate={handleAddNewCandidate}
        onResetPresets={handleResetPresets}
        onOpenReport={() => setCurrentStep('S8_REPORT')}
        onOpenCompare={() => setCurrentStep('S7_COMPARE')}
      />

      {/* Step Bar Navigation (S1 ~ S8) with mobile progress */}
      <StepNav
        currentStep={currentStep}
        onStepChange={(step) => setCurrentStep(step)}
        verdictCode={activeVerdict.code}
        totalScore={activeScore.totalScore}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-12">
        {currentStep === 'S1_START' && (
          <S1Start
            candidates={candidates}
            onSelectCandidate={(id) => setActiveCandidateId(id)}
            onGoToStep={(stepId) => setCurrentStep(stepId)}
            onAddNew={handleAddNewCandidate}
          />
        )}

        {currentStep === 'S2_INPUT' && (
          <S2Input
            candidate={activeCandidate}
            onChange={updateCandidate}
            onNext={() => setCurrentStep('S3_TOPLINE')}
          />
        )}

        {currentStep === 'S3_TOPLINE' && (
          <S3TopLine
            candidate={activeCandidate}
            onChange={updateCandidate}
            onNext={() => setCurrentStep('S4_BOTTOMLINE')}
            onPrev={() => setCurrentStep('S2_INPUT')}
          />
        )}

        {currentStep === 'S4_BOTTOMLINE' && (
          <S4BottomLine
            candidate={activeCandidate}
            onChange={updateCandidate}
            onNext={() => setCurrentStep('S5_RISK')}
            onPrev={() => setCurrentStep('S3_TOPLINE')}
          />
        )}

        {currentStep === 'S5_RISK' && (
          <S5Risk
            candidate={activeCandidate}
            onNext={() => setCurrentStep('S6_DECISION')}
            onPrev={() => setCurrentStep('S4_BOTTOMLINE')}
          />
        )}

        {currentStep === 'S6_DECISION' && (
          <S6Decision
            candidate={activeCandidate}
            onGoToReport={() => setCurrentStep('S8_REPORT')}
            onGoToCompare={() => setCurrentStep('S7_COMPARE')}
            onGoToRisk={() => setCurrentStep('S5_RISK')}
            onToggleCompare={handleToggleCompare}
          />
        )}

        {currentStep === 'S7_COMPARE' && (
          <S7Compare
            candidates={candidates}
            activeCandidateId={activeCandidate.id}
            onSelectCandidate={(id) => setActiveCandidateId(id)}
            onGoToDetail={(id) => {
              setActiveCandidateId(id);
              setCurrentStep('S6_DECISION');
            }}
            onAddNew={handleAddNewCandidate}
            onToggleCompare={handleToggleCompare}
            onGoToDecision={(id) => {
              setActiveCandidateId(id);
              setCurrentStep('S6_DECISION');
            }}
            onGoToReport={(id) => {
              setActiveCandidateId(id);
              setCurrentStep('S8_REPORT');
            }}
            onAddAllToCompare={handleAddAllToCompare}
          />
        )}

        {currentStep === 'S8_REPORT' && (
          <S8Report
            candidate={activeCandidate}
            onUpdateCandidate={updateCandidate}
          />
        )}
      </main>

      {/* Floating Mobile Sticky Bottom Bar (Thumb-friendly Navigation) */}
      <MobileBottomBar
        currentStep={currentStep}
        onStepChange={(step) => setCurrentStep(step)}
        onOpenReport={() => setCurrentStep('S8_REPORT')}
        onOpenCompare={() => setCurrentStep('S7_COMPARE')}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 text-center text-xs text-slate-500 hidden lg:block print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800">BOTTOM LINE</span>
            <span>· 상업용 부동산 입점 의사결정 지원 솔루션</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Top-line(매출추정) 한계 극복 ➔ Bottom-line(비용) & 6대 Risk(규제) 종합 의사결정
          </p>
        </div>
      </footer>
    </div>
  );
}
