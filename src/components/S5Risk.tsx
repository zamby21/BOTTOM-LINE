import React, { useState } from 'react';
import { CandidateLocation, RiskEvaluation, RiskRuleResult } from '../types/decision';
import { evaluateRiskRules } from '../utils/engine';
import { EEIS_GIS_URL } from '../utils/regulatoryPredictor';
import {
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Building,
  FileCheck,
  Scale,
  GraduationCap,
  Flame,
  FileSpreadsheet,
  ExternalLink,
  Copy,
  Check,
  Map,
} from 'lucide-react';

interface S5RiskProps {
  candidate: CandidateLocation;
  onNext: () => void;
  onPrev: () => void;
}

export const S5Risk: React.FC<S5RiskProps> = ({
  candidate,
  onNext,
  onPrev,
}) => {
  const [gisCopied, setGisCopied] = useState(false);
  const riskEval: RiskEvaluation = evaluateRiskRules(candidate);

  const rules: { rule: RiskRuleResult; icon: React.ComponentType<{ className?: string }> }[] = [
    { rule: riskEval.r1, icon: Building },
    { rule: riskEval.r2, icon: FileCheck },
    { rule: riskEval.r3, icon: Scale },
    { rule: riskEval.r4, icon: GraduationCap },
    { rule: riskEval.r5, icon: Flame },
    { rule: riskEval.r6, icon: FileSpreadsheet },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Step Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            03 RISK (해도 되는가)
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            6대 법률·행정 규제 1차 스크리닝
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            수익성이 좋아도 규제에 걸리면 영업 자체가 불가능합니다. 6개 리스크 룰을 순차 검토하여 계약 전 필수 점검 사항을 도출합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
          >
            이전
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-sm transition-all"
          >
            다음: 04 Decision 종합 판정
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Screening Status Banner */}
      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        riskEval.hasBlockingRisk
          ? 'bg-rose-50 border-rose-300 text-rose-900'
          : riskEval.hasConditionalRisk
          ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-emerald-50 border-emerald-300 text-emerald-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
            riskEval.hasBlockingRisk
              ? 'bg-rose-600'
              : riskEval.hasConditionalRisk
              ? 'bg-amber-500'
              : 'bg-emerald-600'
          }`}>
            {riskEval.hasBlockingRisk ? (
              <XCircle className="w-6 h-6" />
            ) : riskEval.hasConditionalRisk ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg">
              {riskEval.hasBlockingRisk
                ? '⚠️ 계약 차단(BLOCK) 요인 발생 - 계약 체결 보류 권고'
                : riskEval.hasConditionalRisk
                ? '⚡ 조건부 진입(CONDITIONAL) - 사전 인허가 및 특약 조항 필수'
                : '✓ 규제 리스크 전면 통과 (PASS) - 입점 저촉 요인 없음'}
            </h3>
            <p className="text-xs opacity-90 mt-0.5">
              {riskEval.hasBlockingRisk
                ? '위반건축물, 절대보호구역 등 인허가 원천 불가 사유가 존재하여 최고 등급이 [보류]로 제한됩니다.'
                : riskEval.hasConditionalRisk
                ? '용도변경, 소방설비, 환산보증금 초과 등 계약 전 명문화된 안전장치 확보가 필요합니다.'
                : '건축물 용도, 위반건축물, 교육환경 등 6개 법정 기준을 모두 완벽히 충족합니다.'}
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-xs font-bold block opacity-75">리스크 평가 감점</span>
          <span className="text-xl font-black">
            {riskEval.hasBlockingRisk ? '-15점 (0점 처리)' : `-${riskEval.totalPenalty}점`}
          </span>
        </div>
      </div>

      {/* 6 Risk Rule Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map(({ rule, icon: Icon }) => {
          const isPass = rule.status === 'PASS';
          const isBlock = rule.status === 'BLOCK';
          const isCond = rule.status === 'CONDITIONAL';
          const isRec = rule.status === 'RECOMMEND_CHECK';

          return (
            <div
              key={rule.code}
              className={`bg-white rounded-2xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                isBlock
                  ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400'
                  : isCond
                  ? 'border-amber-300 bg-amber-50/20'
                  : isRec
                  ? 'border-blue-300 bg-blue-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isBlock
                        ? 'bg-rose-100 text-rose-700'
                        : isCond
                        ? 'bg-amber-100 text-amber-800'
                        : isRec
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {rule.code} 룰
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {rule.name}
                      </h4>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                      isBlock
                        ? 'bg-rose-600 text-white'
                        : isCond
                        ? 'bg-amber-500 text-white'
                        : isRec
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isBlock && <XCircle className="w-3.5 h-3.5" />}
                    {isCond && <AlertTriangle className="w-3.5 h-3.5" />}
                    {isPass && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {rule.statusText}
                  </span>
                </div>

                {/* Detail Description */}
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {rule.detail}
                </p>

                {/* Statutory Basis & Data Source */}
                <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] text-slate-500 space-y-1 border border-slate-100">
                  <div>
                    <strong className="text-slate-700">근거 법령:</strong> {rule.legalBasis}
                  </div>
                  <div>
                    <strong className="text-slate-700">데이터 출처:</strong> {rule.dataSource}
                  </div>
                </div>
              </div>

              {/* Action Guide */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600">
                <span className="font-bold text-blue-600 block mb-0.5">
                  📌 실무 대응 가이드:
                </span>
                {rule.actionGuide}
              </div>

              {/* R4 Specific Action: Direct link to EEIS GIS with Candidate Address */}
              {rule.code === 'R4' && (
                <div className="mt-3 p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-indigo-900">연동 주소 정화구역 GIS 지도 조회</span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded font-semibold">
                      eeis.schoolkeepa.or.kr
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-700 truncate font-mono">
                      {candidate.address || '주소 정보 없음'}
                    </span>
                    <a
                      href={EEIS_GIS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (candidate.address) {
                          navigator.clipboard.writeText(candidate.address);
                          setGisCopied(true);
                          setTimeout(() => setGisCopied(false), 4000);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex-shrink-0 transition-all shadow-2xs cursor-pointer"
                    >
                      <Map className="w-3 h-3" />
                      {gisCopied ? '주소 복사됨! GIS 열림' : 'GIS 지도에서 주소 확인'}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  {gisCopied && (
                    <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 animate-fadeIn">
                      <Check className="w-3 h-3 flex-shrink-0" />
                      후보지 주소가 복사되었습니다! 열린 지도 검색창에 Ctrl+V로 붙여넣으세요.
                    </div>
                  )}
                </div>
              )}

              {/* R2 Specific Action: Direct link to Gov24 */}
              {rule.code === 'R2' && (
                <div className="mt-3 p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/80 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-700 font-medium">정부24 건축물대장 표제부 즉시 열람:</span>
                  <a
                    href="https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000026"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex-shrink-0 transition-colors shadow-2xs"
                  >
                    <FileCheck className="w-3 h-3" />
                    정부24 열람 바로가기
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* District Office Contact & Verification Notice */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-800">
            1차 스크리닝 후 최종 관할 구청 확인 안내 (Proposal 07장 명시)
          </span>
          <p className="leading-relaxed">
            본 도구의 규제 판정은 토지이용계획 및 건축법령에 기반한 1차 위험 스크리닝입니다. 실제 계약 전에는 반드시 
            관할 시·군·구청(건축과, 위생과, 경제과) 및 관할 소방서 예방과에 도면을 지참하여 최종 인허가 가능 여부를 확인하시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  );
};
