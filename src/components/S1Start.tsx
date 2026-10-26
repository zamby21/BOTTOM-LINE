import React from 'react';
import { CandidateLocation } from '../types/decision';
import {
  ArrowRight,
  TrendingUp,
  Calculator,
  ShieldCheck,
  Scale,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Building,
  Briefcase,
} from 'lucide-react';

interface S1StartProps {
  candidates: CandidateLocation[];
  onSelectCandidate: (id: string) => void;
  onGoToStep: (stepId: any) => void;
  onAddNew: () => void;
}

export const S1Start: React.FC<S1StartProps> = ({
  candidates,
  onSelectCandidate,
  onGoToStep,
  onAddNew,
}) => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Hero Banner with Value Proposition */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-8 sm:p-12 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            상업용 부동산 입점 의사결정 지원 도구
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            매출만 보고 계약했다가 <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-teal-200 to-amber-200">
              폐업하는 비극을 막는 'BOTTOM LINE'
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            기존 서비스가 단편적 매출 추정(Top-Line)에 머물렀다면, BOTTOM LINE은 
            <strong> 원가·인건비·임대료 비용 구조(Bottom-Line)</strong>와 
            <strong> 6대 법률·행정 규제(Risk)</strong>까지 종합 심사하여 
            <span className="text-emerald-300 font-semibold"> 진입</span> · 
            <span className="text-amber-300 font-semibold"> 조건부 진입</span> · 
            <span className="text-rose-300 font-semibold"> 보류</span>를 과학적 근거와 함께 판정합니다.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onGoToStep('S2_INPUT')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
            >
              후보지 분석 시작하기
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onGoToStep('S7_COMPARE')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 transition-colors"
            >
              <Scale className="w-4 h-4 text-amber-300" />
              후보지 3곳 순위 역전 비교 보기
            </button>
          </div>
        </div>
      </div>

      {/* The 3 Core Questions the Tool Solves (From Proposal Page 1) */}
      <div className="space-y-4">
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            누가 어떤 질문을 가지고 사용하나요?
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            후보지의 추정 매출에서 출발해 비용 구조와 규제·임대차 위험을 차례로 통과시켜 답을 내줍니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-4">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wide">
              예비 창업자
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
              "이 자리에 내 가게가 남을까?"
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              첫 매장 후보지 2~3곳을 매출뿐 아니라 원가율, 인건비, 임대료 부담률, 초기 투자금 회수기간까지 동일한 엄격한 기준으로 비교합니다.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4">
              <Building className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
              상가 투자자 · 임대인
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
              "이 호실에 이 업종이 들어올 수 있나?"
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              건축물 용도, 위반건축물 여부, 다중이용업소 소방 기준, 환산보증금 임대차보호법 한도 등 법률 규제 위험을 사전에 완벽히 점검합니다.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-4">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
              공인중개사 · 창업 컨설턴트
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
              "고객에게 근거를 어떻게 보여줄까?"
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              감각적 추천 대신 100점 만점 스코어링 지표와 Gemini AI 심층 리포트를 계약 상담 및 고객 설득 브리핑 자료로 바로 출력하여 사용합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 4-Stage Decision Engine Framework (Proposal Page 3) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-xs font-bold tracking-wider text-blue-400 uppercase">
            4-Stage Decision Pipeline
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">
            앞 단계의 결과가 다음 단계의 입력이 되는 4단계 판정 프레임
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-400">01 TOP-LINE</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-base font-bold text-white">얼마나 팔릴까</div>
            <div className="text-xs text-slate-300">
              <span className="text-slate-400">입력:</span> 오픈업 조회 매출 or AI 추정 범위 (부가세 분리)
            </div>
            <div className="text-xs text-blue-300 font-medium">
              ➔ 출력: 월 순매출 S (공급가액)
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-400">02 BOTTOM-LINE</span>
              <Calculator className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-base font-bold text-white">그래서 남는가</div>
            <div className="text-xs text-slate-300">
              <span className="text-slate-400">입력:</span> 원가율, 인력, 임대료, 카드/배달비, 인테리어
            </div>
            <div className="text-xs text-emerald-300 font-medium">
              ➔ 출력: 월 영업이익, 손익분기점, 회수기간
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-400">03 RISK</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-base font-bold text-white">해도 되는가</div>
            <div className="text-xs text-slate-300">
              <span className="text-slate-400">입력:</span> 건축물대장, 용도지역, 층·면적, 환산보증금
            </div>
            <div className="text-xs text-amber-300 font-medium">
              ➔ 출력: 6개 룰별 차단·조건부·확인·통과
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-purple-400">04 DECISION</span>
              <Scale className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-base font-bold text-white">그래서 어떻게</div>
            <div className="text-xs text-slate-300">
              <span className="text-slate-400">입력:</span> 1~3단계 정량화 결과 종합
            </div>
            <div className="text-xs text-purple-300 font-medium">
              ➔ 출력: 100점 점수, 판정, Gemini AI 리포트
            </div>
          </div>
        </div>

        {/* Scoring standard badge list */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <strong className="text-slate-200">진입 (GO):</strong> 70점 이상 & 차단/조건부 룰 없음
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <strong className="text-slate-200">조건부 진입:</strong> 50~69점 or 조건부 룰 존재 시 최고 등급 제한
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <strong className="text-slate-200">보류 (HOLD):</strong> 치명적 차단 룰 1개 이상 or 50점 미만
          </div>
        </div>
      </div>

      {/* Preset Candidate Quick Loader (Page 4 S1: "예시 후보지 3곳 불러오기") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              실전 예시 후보지 3곳 즉시 체험하기
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              각각 '진입', '조건부 진입', '보류' 판정을 유발하는 대표적 실제 매물 시나리오입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddNew}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            + 직접 내 매물 입력
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {candidates.map((c, idx) => {
            const isA = idx === 0;
            const isB = idx === 1;
            const isC = idx === 2;

            return (
              <div
                key={c.id}
                onClick={() => {
                  onSelectCandidate(c.id);
                  onGoToStep('S6_DECISION');
                }}
                className="group relative bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      후보지 #{idx + 1}
                    </span>
                    {isA && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 진입 추천 (78점)
                      </span>
                    )}
                    {isB && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> 조건부 (58점, 매출1위)
                      </span>
                    )}
                    {isC && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> 보류 (위반건축물)
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {c.address}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">예상 월 결제액:</span>
                      <strong className="text-slate-900">{c.grossRevenue.toLocaleString()}만원</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">보증금 / 월세:</span>
                      <span className="font-medium text-slate-800">
                        {c.deposit.toLocaleString()}만 / {c.monthlyRent.toLocaleString()}만
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">면적 / 층수:</span>
                      <span>
                        {c.areaSqm}㎡ (약 {(c.areaSqm * 0.3025).toFixed(0)}평) / {c.floor}층
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                  <span>의사결정 결과 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
