import React, { useState } from 'react';
import { CandidateLocation, FinancialMetrics, RiskEvaluation, ScoreBreakdown, DecisionVerdict } from '../types/decision';
import { calculateFinancialMetrics, evaluateRiskRules, calculateDecisionScore } from '../utils/engine';
import {
  FileText,
  Sparkles,
  Printer,
  Copy,
  Check,
  Share2,
  RefreshCw,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
} from 'lucide-react';

interface S8ReportProps {
  candidate: CandidateLocation;
  onUpdateCandidate: (updated: CandidateLocation) => void;
}

export const S8Report: React.FC<S8ReportProps> = ({
  candidate,
  onUpdateCandidate,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const metrics: FinancialMetrics = calculateFinancialMetrics(candidate);
  const riskEval: RiskEvaluation = evaluateRiskRules(candidate);
  const { scoreBreakdown, verdict } = calculateDecisionScore(metrics, riskEval);

  const handleGenerateAiReport = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/gemini/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate,
          metrics,
          riskResults: riskEval,
          scoreBreakdown,
          verdict,
        }),
      });

      const json = await response.json();
      if (json.success && json.report) {
        onUpdateCandidate({
          ...candidate,
          aiReport: json.report,
          aiReportDate: new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      } else {
        setErrorMsg(json.error || '리포트 생성 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '네트워크 통신 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = `[BOTTOM LINE 상업용 부동산 판정 리포트]
매물명: ${candidate.name}
주소: ${candidate.address}
종합점수: ${scoreBreakdown.totalScore}점 / 100점
최종판정: ${verdict.title}
월 순매출(공급가액): ${Math.round(metrics.monthlyRevenue).toLocaleString()}만원
월 순영업이익: ${Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만원 (${(metrics.operatingProfitMargin * 100).toFixed(1)}%)
손익분기점(BEP): ${Math.round(metrics.breakEvenRevenue).toLocaleString()}만원
원금회수기간: ${metrics.paybackPeriodMonths === 999 ? '회수불가' : metrics.paybackPeriodMonths.toFixed(1) + '개월'}

AI 종합 해설:
${candidate.aiReport || verdict.summary}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `BOTTOM LINE 판정 리포트 - ${candidate.name}`,
        text: `종합점수 ${scoreBreakdown.totalScore}점 [${verdict.title}] - ${candidate.name} 상업용 부동산 입점 분석 결과`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 print:p-0 print:space-y-4">
      {/* Top Action Bar (hidden in print) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            S8 AI 입점 심사 및 종합 리포트
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            전문가 브리핑용 판정 리포트
          </h2>
        </div>

        {/* Action Buttons: Responsive Grid on Mobile */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleGenerateAiReport}
            disabled={isGenerating}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Gemini 작성 중...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {candidate.aiReport ? 'AI 해설 다시 생성' : 'Gemini AI 해설 생성'}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '복사됨' : '요약 복사'}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            {shared ? '링크 복사됨' : '모바일 공유'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF 인쇄 / 저장
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 print:hidden">
          {errorMsg}
        </div>
      )}

      {/* Printable Report Document Sheet */}
      <div className="bg-white rounded-3xl p-5 sm:p-10 border border-slate-200 shadow-md space-y-6 sm:space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-black text-lg sm:text-xl tracking-tight">
              <Building2 className="w-5 h-5 text-blue-700" />
              BOTTOM LINE
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                REPORT
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              {candidate.aiReportDate || new Date().toLocaleDateString('ko-KR')}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block">
              COMMERCIAL REAL ESTATE DECISION AUDIT
            </span>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 mt-0.5">
              {candidate.name} 입점 의사결정 정밀 심사서
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              소재지: {candidate.address} {candidate.detailAddress || ''} | 업종: {candidate.businessName} ({candidate.areaSqm}㎡, {candidate.floor}층)
            </p>
          </div>
        </div>

        {/* Executive Verdict Callout */}
        <div className={`p-4 sm:p-6 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          verdict.code === 'GO'
            ? 'bg-emerald-50/60 border-emerald-500'
            : verdict.code === 'CONDITIONAL'
            ? 'bg-amber-50/60 border-amber-500'
            : 'bg-rose-50/60 border-rose-500'
        }`}>
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              FINAL VERDICT
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-sm sm:text-base text-white font-black ${verdict.badgeClass}`}>
                {verdict.title}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 font-medium pt-0.5">
              {verdict.summary}
            </p>
          </div>

          <div className="text-right flex-shrink-0 bg-white px-4 py-2.5 rounded-xl border border-slate-200 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 block">정량 종합 점수</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {scoreBreakdown.totalScore}
              <span className="text-xs font-normal text-slate-400">/100</span>
            </span>
          </div>
        </div>

        {/* Financial Highlights Table (2x2 on mobile) */}
        <div className="space-y-2.5">
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            1. 핵심 재무 및 손익 검증 (Bottom-Line Metrics)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">월 순매출 (공급가액 S)</span>
              <strong className="text-slate-900 font-black text-xs sm:text-base">
                {Math.round(metrics.monthlyRevenue).toLocaleString()}만원
              </strong>
            </div>

            <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">월 순영업이익</span>
              <strong className={`font-black text-xs sm:text-base ${
                metrics.monthlyOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만원
              </strong>
              <span className="text-[10px] text-slate-500 block">
                이익률 {(metrics.operatingProfitMargin * 100).toFixed(1)}%
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">손익분기점 (BEP)</span>
              <strong className="text-slate-900 font-black text-xs sm:text-base">
                {Math.round(metrics.breakEvenRevenue).toLocaleString()}만원
              </strong>
              <span className="text-[10px] text-slate-500 block">
                안전율 {(metrics.marginOfSafety * 100).toFixed(1)}%
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">투자 회수기간 (ROI)</span>
              <strong className="text-slate-900 font-black text-xs sm:text-base">
                {metrics.paybackPeriodMonths === 999 ? '회수 불가' : `${metrics.paybackPeriodMonths.toFixed(1)}개월`}
              </strong>
              <span className="text-[10px] text-slate-500 block">
                연 ROI {(metrics.annualRoi * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-wrap justify-between gap-1.5">
            <span>보증금: <strong>{candidate.deposit.toLocaleString()}만원</strong></span>
            <span>월세+관리비: <strong>{metrics.monthlyRentAndMaintenance.toLocaleString()}만원</strong> (부담률 {(metrics.rentBurdenRate * 100).toFixed(1)}%)</span>
            <span>초기 투자비: <strong>{Math.round(metrics.initialInvestment).toLocaleString()}만원</strong></span>
          </div>
        </div>

        {/* 6 Risk Rules Table */}
        <div className="space-y-2.5">
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            2. 6대 행정·법률 규제 심사 결과 (Regulatory Audit)
          </h3>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-500 font-bold">
                <tr>
                  <th className="p-2 sm:p-2.5">항목</th>
                  <th className="p-2 sm:p-2.5">판정 결과</th>
                  <th className="p-2 sm:p-2.5 hidden sm:table-cell">확인 내용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-800">R1 건축물 용도</td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-900">{riskEval.r1.statusText}</td>
                  <td className="p-2 sm:p-2.5 text-slate-500 hidden sm:table-cell">{riskEval.r1.detail}</td>
                </tr>
                <tr>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-800">R2 위반건축물</td>
                  <td className={`p-2 sm:p-2.5 font-bold ${riskEval.r2.status === 'BLOCK' ? 'text-rose-600' : 'text-slate-900'}`}>
                    {riskEval.r2.statusText}
                  </td>
                  <td className="p-2 sm:p-2.5 text-slate-500 hidden sm:table-cell">{riskEval.r2.detail}</td>
                </tr>
                <tr>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-800">R3 용도지역</td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-900">{riskEval.r3.statusText}</td>
                  <td className="p-2 sm:p-2.5 text-slate-500 hidden sm:table-cell">{riskEval.r3.detail}</td>
                </tr>
                <tr>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-800">R4 교육환경보호구역</td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-900">{riskEval.r4.statusText}</td>
                  <td className="p-2 sm:p-2.5 text-slate-500 hidden sm:table-cell">{riskEval.r4.detail}</td>
                </tr>
                <tr>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-800">R5 다중이용업소</td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-900">{riskEval.r5.statusText}</td>
                  <td className="p-2 sm:p-2.5 text-slate-500 hidden sm:table-cell">{riskEval.r5.detail}</td>
                </tr>
                <tr>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-800">R6 환산보증금</td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-900">{riskEval.r6.statusText}</td>
                  <td className="p-2 sm:p-2.5 text-slate-500 hidden sm:table-cell">{riskEval.r6.detail}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Gemini AI Expert Commentary Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              3. Gemini AI 부동산 전문 자문 위원 심층 해설
            </h3>
            {candidate.aiReport && (
              <span className="text-[10px] text-slate-400">
                {candidate.aiReportDate}
              </span>
            )}
          </div>

          {candidate.aiReport ? (
            <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed bg-slate-50/60 p-4 sm:p-6 rounded-2xl border border-slate-200 text-xs sm:text-sm whitespace-pre-line">
              {candidate.aiReport}
            </div>
          ) : (
            <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <Sparkles className="w-7 h-7 text-purple-600 mx-auto" />
              <div className="font-bold text-slate-900 text-sm">
                Gemini AI 심층 리포트가 아직 생성되지 않았습니다.
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                상단의 [Gemini AI 해설 생성] 버튼을 누르면 재무 지표와 6대 리스크를 종합 분석한 전략적 해설 및 임대인 협상 팁을 생성합니다.
              </p>
              <button
                type="button"
                onClick={handleGenerateAiReport}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                지금 생성하기
              </button>
            </div>
          )}
        </div>

        {/* District Office Disclaimer & Sign-off Footer */}
        <div className="border-t border-slate-200 pt-5 text-[10px] sm:text-[11px] text-slate-400 flex flex-col sm:flex-row justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-600">
              * 본 리포트는 상업용 부동산 의사결정 보조도구에 의해 자동 산출된 스크리닝 결과입니다.
            </p>
            <p className="mt-0.5">
              실제 계약 체결 전 관할 시·군·구청(건축과/위생과) 및 소방서에서 인허가 가능 여부를 최종 확인하시기 바랍니다.
            </p>
          </div>
          <div className="text-left sm:text-right font-mono font-bold text-slate-500 flex-shrink-0">
            Powered by BOTTOM LINE Engine
          </div>
        </div>
      </div>
    </div>
  );
};
