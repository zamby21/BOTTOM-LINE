import React, { useState } from 'react';
import { AnalysisHistoryRecord, CandidateLocation, StepId } from './types/decision';
import { INITIAL_PRESET_CANDIDATES, INDUSTRY_BENCHMARKS } from './data/presets';
import { calculateFinancialMetrics, evaluateRiskRules, calculateDecisionScore } from './utils/engine';
import { Header } from './components/Header';
import { StepNav, StepNavPosition } from './components/StepNav';
import { StepFooterNav } from './components/StepFooterNav';
import { MobileBottomBar } from './components/MobileBottomBar';
import { S1Start } from './components/S1Start';
import { S2Input } from './components/S2Input';
import { S3TopLine } from './components/S3TopLine';
import { S4BottomLine } from './components/S4BottomLine';
import { S5Risk } from './components/S5Risk';
import { S6Decision } from './components/S6Decision';
import { S7Compare } from './components/S7Compare';
import { S8Report } from './components/S8Report';
import { RegionMarketModal } from './components/RegionMarketModal';
import { AnalysisHistoryModal } from './components/AnalysisHistoryModal';

export type ViewMode = 'auto' | 'wide' | 'mobile';

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

  const [history, setHistory] = useState<AnalysisHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('bottomline_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  });
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [navPosition, setNavPosition] = useState<StepNavPosition>(() => {
    try {
      const saved = localStorage.getItem('bottomline_nav_position');
      if (saved === 'left' || saved === 'top') return saved;
    } catch {
      // ignore
    }
    return 'top';
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('bottomline_view_mode');
      if (saved === 'auto' || saved === 'wide' || saved === 'mobile') return saved;
    } catch {
      // ignore
    }
    return 'auto';
  });

  const handleChangeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('bottomline_view_mode', mode);
    } catch {
      // ignore
    }
  };

  const handleToggleNavPosition = () => {
    setNavPosition((prev) => {
      const next: StepNavPosition = prev === 'top' ? 'left' : 'top';
      try {
        localStorage.setItem('bottomline_nav_position', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const persistHistory = (nextHistory: AnalysisHistoryRecord[]) => {
    setHistory(nextHistory);
    try {
      localStorage.setItem('bottomline_history', JSON.stringify(nextHistory));
    } catch (e) {}
  };

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

  const handleToggleLockCandidate = (candidateId: string) => {
    setCandidates((prev) => {
      const next = prev.map((c) =>
        c.id === candidateId ? { ...c, isLocked: !c.isLocked } : c
      );
      try {
        localStorage.setItem('bottomline_candidates', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleToggleStarCandidate = (candidateId: string) => {
    setCandidates((prev) => {
      const next = prev.map((c) =>
        c.id === candidateId ? { ...c, isStarred: !c.isStarred } : c
      );
      try {
        localStorage.setItem('bottomline_candidates', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleDeleteCandidate = (candidateId: string) => {
    setCandidates((prev) => {
      if (prev.length <= 1) return prev;
      const target = prev.find((c) => c.id === candidateId);
      if (!target || target.isLocked) return prev;

      const next = prev.filter((c) => c.id !== candidateId);
      try {
        localStorage.setItem('bottomline_candidates', JSON.stringify(next));
      } catch (e) {}

      if (activeCandidateId === candidateId && next.length > 0) {
        setActiveCandidateId(next[0].id);
      }
      return next;
    });
  };

  const activeCandidate =
    candidates.find((c) => c.id === activeCandidateId) || candidates[0];

  const activeMetrics = calculateFinancialMetrics(activeCandidate);
  const activeRiskEval = evaluateRiskRules(activeCandidate);
  const { scoreBreakdown: activeScore, verdict: activeVerdict } =
    calculateDecisionScore(activeMetrics, activeRiskEval);

  const handleSaveSnapshot = () => {
    const snapshotCandidate: CandidateLocation = JSON.parse(JSON.stringify(activeCandidate));
    const newRecord: AnalysisHistoryRecord = {
      id: `hist-${Date.now()}`,
      savedAt: new Date().toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      candidate: snapshotCandidate,
      totalScore: activeScore.totalScore,
      verdictCode: activeVerdict.code,
      verdictTitle: activeVerdict.title,
      monthlyRevenue: activeMetrics.monthlyRevenue,
      monthlyOperatingProfit: activeMetrics.monthlyOperatingProfit,
    };
    persistHistory([newRecord, ...history].slice(0, 30));
  };

  const handleRestoreSnapshot = (record: AnalysisHistoryRecord) => {
    const restored: CandidateLocation = JSON.parse(JSON.stringify(record.candidate));
    setCandidates((prev) => {
      const exists = prev.some((c) => c.id === restored.id);
      const next = exists
        ? prev.map((c) => (c.id === restored.id ? restored : c))
        : [restored, ...prev];
      try {
        localStorage.setItem('bottomline_candidates', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    setActiveCandidateId(restored.id);
    setCurrentStep('S6_DECISION');
  };

  const handleDeleteHistoryRecord = (id: string) => {
    persistHistory(history.filter((r) => r.id !== id));
  };

  const handleClearHistory = () => {
    persistHistory([]);
  };

  const isMobileView = viewMode === 'mobile';
  const headerContainerClass = isMobileView
    ? 'w-full px-3'
    : 'w-full px-3 sm:px-5 lg:px-6';
  const mainContainerClass = isMobileView
    ? 'flex-1 min-w-0 w-full px-3 py-3.5 pb-22'
    : viewMode === 'wide'
    ? 'flex-1 min-w-0 w-full px-3 sm:px-5 lg:px-6 py-4 sm:py-5 pb-24 lg:pb-10'
    : 'flex-1 min-w-0 w-full max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-5 pb-24 lg:pb-10';

  const appShell = (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white ${
        isMobileView
          ? 'w-full max-w-[430px] mx-auto sm:shadow-2xl sm:border-x sm:border-slate-200 mobile-view-mode relative'
          : 'w-full'
      }`}
    >
      {/* Top Fixed Header (Full-width so logo stays cleanly left-aligned) */}
      <Header
        candidates={candidates}
        activeCandidateId={activeCandidate.id}
        onSelectCandidate={(id) => setActiveCandidateId(id)}
        onAddCandidate={handleAddNewCandidate}
        onResetPresets={handleResetPresets}
        onOpenReport={() => setCurrentStep('S8_REPORT')}
        onOpenCompare={() => setCurrentStep('S7_COMPARE')}
        onOpenRegionMarket={() => setIsRegionModalOpen(true)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        historyCount={history.length}
        viewMode={viewMode}
        onChangeViewMode={handleChangeViewMode}
        containerClass={headerContainerClass}
      />

      {/* Sticky Top Step Bar Navigation (always shown in 'top' or 'mobile' mode; on narrow screens also shown when 'left' mode is selected) */}
      {isMobileView || navPosition === 'top' ? (
        <StepNav
          currentStep={currentStep}
          onStepChange={(step) => setCurrentStep(step)}
          verdictCode={activeVerdict.code}
          totalScore={activeScore.totalScore}
          position="top"
          onTogglePosition={handleToggleNavPosition}
          isMobileView={isMobileView}
          containerClass={headerContainerClass}
        />
      ) : (
        <div className="lg:hidden sticky top-14 sm:top-15 z-30 print:hidden">
          <StepNav
            currentStep={currentStep}
            onStepChange={(step) => setCurrentStep(step)}
            verdictCode={activeVerdict.code}
            totalScore={activeScore.totalScore}
            position="top"
            onTogglePosition={handleToggleNavPosition}
            isMobileView={false}
            containerClass={headerContainerClass}
          />
        </div>
      )}

      {/* Body Wrapper (supports sticky left sidebar + fluid main content) */}
      <div
        className={`flex-1 flex w-full ${
          !isMobileView && navPosition === 'left' ? 'items-start' : 'flex-col'
        }`}
      >
        {!isMobileView && navPosition === 'left' && (
          <StepNav
            currentStep={currentStep}
            onStepChange={(step) => setCurrentStep(step)}
            verdictCode={activeVerdict.code}
            totalScore={activeScore.totalScore}
            position="left"
            onTogglePosition={handleToggleNavPosition}
            isMobileView={false}
            containerClass={headerContainerClass}
          />
        )}

        {/* Main Content Area (uniform width across all steps) */}
        <main className={mainContainerClass}>
        {currentStep === 'S1_START' && (
          <S1Start
            candidates={candidates}
            onSelectCandidate={(id) => setActiveCandidateId(id)}
            onGoToStep={(stepId) => setCurrentStep(stepId)}
            onAddNew={handleAddNewCandidate}
            onOpenRegionMarket={() => setIsRegionModalOpen(true)}
            onOpenHistory={() => setIsHistoryModalOpen(true)}
            historyCount={history.length}
            isMobileView={isMobileView}
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
            onChange={updateCandidate}
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
            onSaveSnapshot={handleSaveSnapshot}
            onUpdateCandidate={updateCandidate}
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
            onDeleteCandidate={handleDeleteCandidate}
            onToggleLock={handleToggleLockCandidate}
            onToggleStar={handleToggleStarCandidate}
          />
        )}

        {currentStep === 'S8_REPORT' && (
          <S8Report
            candidate={activeCandidate}
            onUpdateCandidate={updateCandidate}
            onSaveSnapshot={handleSaveSnapshot}
          />
        )}

        {/* Unified Bottom Previous / Next Step Navigation across all sessions */}
        <StepFooterNav
          currentStep={currentStep}
          onStepChange={(step) => setCurrentStep(step)}
        />
        </main>
      </div>

      {/* Modals: Region/Commercial Market Hub & Analysis Snapshot History */}
      <RegionMarketModal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        candidate={activeCandidate}
      />

      <AnalysisHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        onSaveCurrentSnapshot={handleSaveSnapshot}
        onRestoreSnapshot={handleRestoreSnapshot}
        onDeleteRecord={handleDeleteHistoryRecord}
        onClearAll={handleClearHistory}
      />

      {/* Floating Mobile Sticky Bottom Bar (Thumb-friendly Navigation) */}
      <MobileBottomBar
        currentStep={currentStep}
        onStepChange={(step) => setCurrentStep(step)}
        onOpenReport={() => setCurrentStep('S8_REPORT')}
        onOpenCompare={() => setCurrentStep('S7_COMPARE')}
        forceVisible={isMobileView}
      />

      {/* Footer */}
      {!isMobileView && (
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 hidden lg:block print:hidden">
          <div className={`${headerContainerClass} flex flex-col sm:flex-row items-center justify-between gap-2`}>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-800">BOTTOM LINE</span>
              <span>· 상업용 부동산 입점 의사결정 지원 솔루션</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Top-line(매출추정) 한계 극복 ➔ Bottom-line(비용) & 6대 Risk(규제) 종합 의사결정
            </p>
          </div>
        </footer>
      )}
    </div>
  );

  if (isMobileView) {
    return (
      <div className="min-h-screen w-full bg-slate-200/75 flex justify-center">
        {appShell}
      </div>
    );
  }

  return appShell;
}
