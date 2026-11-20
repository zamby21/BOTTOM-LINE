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
  onOpenRegionMarket?: () => void;
  onOpenHistory?: () => void;
  historyCount?: number;
  isMobileView?: boolean;
}

export const S1Start: React.FC<S1StartProps> = ({
  candidates,
  onSelectCandidate,
  onGoToStep,
  onAddNew,
  isMobileView = false,
}) => {
  const comparedCount = candidates.filter((c) => c.addedToCompare).length;

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Hero Banner — Balanced 2-column layout eliminating empty right-hand void */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-5 sm:p-7 lg:p-8 shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-center">
          {/* Left Copy + Primary CTA */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-1.5 text-blue-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
              <span>상업용 부동산 입점 의사결정 지원 도구</span>
            </div>
            <h1
              className={`${
                isMobileView
                  ? 'text-[26px]'
                  : 'text-[26px] sm:text-4xl xl:text-[44px]'
              } font-black tracking-tight leading-[1.18]`}
            >
              매출만 보고 계약했다가
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-teal-200 to-amber-200">
                폐업하는 비극을 막는
                <br />
                <span className="whitespace-nowrap">'BOTTOM LINE'</span>
              </span>
            </h1>
            <p className="text-[13px] sm:text-[15px] text-slate-300 leading-relaxed">
              기존 서비스가 단편적 매출 추정(Top-Line)에 머물렀다면,
              <br className="hidden sm:inline" />{' '}
              BOTTOM LINE은 <strong>원가·인건비·임대료 비용 구조(Bottom-Line)</strong>와
              <br className="hidden sm:inline" />{' '}
              <strong>6대 법률·행정 규제(Risk)</strong>까지 종합 심사하여
              <br className="hidden sm:inline" />{' '}
              <span className="text-emerald-300 font-semibold">진입</span> ·{' '}
              <span className="text-amber-300 font-semibold">조건부 진입</span> ·{' '}
              <span className="text-rose-300 font-semibold">보류</span>를 과학적 근거와 함께 판정합니다.
            </p>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => onGoToStep('S2_INPUT')}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
              >
                후보지 분석 시작하기
                <ArrowRight className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
          </div>

          {/* Right Structured Analysis Summary Panel (balances wide viewports & stacks cleanly on mobile) */}
          <div className="lg:col-span-5 rounded-2xl bg-white/[0.06] border border-white/10 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
              <span className="text-xs font-extrabold text-slate-100">
                한 번에 검증하는 3대 핵심 축
              </span>
              <span className="text-[11px] font-semibold text-blue-300 tabular-nums whitespace-nowrap">
                총 8단계 프로세스
              </span>
            </div>

            <div className="divide-y divide-white/10 text-xs">
              <div className="py-2.5 first:pt-0 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white">Top-Line · 3가지 매출 추정 비교</div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    직접 입력 · 객단가 계산 · AI 상권 추정값을 독립 저장 후 선택
                  </p>
                </div>
              </div>

              <div className="py-2.5 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calculator className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white">Bottom-Line · 실질 순이익 &amp; 회수기간</div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    원가·인건비·월세·배달수수료 차감 후 손익분기점과 ROI 산출
                  </p>
                </div>
              </div>

              <div className="py-2.5 last:pb-0 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white">Risk &amp; Decision · 6대 규제 · 100점 판정</div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    건축물 용도·위반건축물·학교보호구역 점검 및 AI PDF 리포트
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onGoToStep('S7_COMPARE')}
              className="w-full pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-bold text-blue-200 hover:text-white transition-colors cursor-pointer"
            >
              <span className="tabular-nums">
                등록 후보지 {candidates.length}곳 (비교 등록 {comparedCount}곳)
              </span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                후보지 비교 보기
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* The 3 Core Questions the Tool Solves */}
      <div className="space-y-3.5">
        <div className="text-left">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            누가 어떤 질문을 가지고 사용하나요?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            주소·호실 조회부터 3가지 매출 추정, 비용·규제 심사, 후보지 비교와 AI 리포트까지 한 번에 해결합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-blue-600">
              예비 창업자
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 mb-1.5 tracking-tight">
              "이 자리, 실제로 얼마나 남을까?"
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              직접 입력·객단가 계산·AI 추정으로 매출을 비교하고, 원가·인건비·월세를 뺀 실질 순이익과 투자 회수기간을 계산해 최적의 후보지를 고릅니다.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3">
              <Building className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-indigo-600">
              상가 투자자 · 임대인
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 mb-1.5 tracking-tight">
              "이 호실, 인허가 문제는 없을까?"
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              지도와 건축물대장 호실을 불러와 건축물 용도·위반건축물·학교보호구역·환산보증금 등 6대 규제를 사전 점검하고 적정 임대 조건을 확인합니다.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-emerald-600">
              공인중개사 · 창업 컨설턴트
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 mb-1.5 tracking-tight">
              "고객에게 근거를 어떻게 설명할까?"
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              여러 후보지를 100점 정량 점수와 수익률 차트로 비교해 실속 매물을 가려내고, AI 종합 리포트를 PDF로 바로 출력해 계약 상담에 활용합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 4-Stage Decision Engine Framework (Proposal Page 3) */}
      <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 space-y-5">
        <div>
          <span className="text-xs font-bold tracking-wider text-blue-400 uppercase">
            4-Stage Decision Pipeline
          </span>
          <h2 className="text-lg sm:text-xl font-bold mt-0.5">
            앞 단계의 결과가 다음 단계의 입력이 되는 4단계 판정 프레임
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-blue-400">03 TOP-LINE</span>
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
              <span className="text-xs font-extrabold text-emerald-400">04 BOTTOM-LINE</span>
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
              <span className="text-xs font-extrabold text-amber-400">05 RISK</span>
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
              <span className="text-xs font-extrabold text-purple-400">06 DECISION</span>
              <Scale className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-base font-bold text-white">그래서 어떻게</div>
            <div className="text-xs text-slate-300">
              <span className="text-slate-400">입력:</span> 03~05단계 정량화 결과 종합
            </div>
            <div className="text-xs text-purple-300 font-medium">
              ➔ 출력: 100점 점수, 판정, Gemini AI 리포트
            </div>
          </div>
        </div>

        {/* Scoring standard cards (high-contrast 3-column criteria) */}
        <div className="pt-4 border-t border-slate-700/80 space-y-2.5">
          <div className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
            최종 판정 기준 (100점 정량 점수 + 6대 규제 심사)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-400 text-slate-950 text-[11px] font-black leading-tight">
                  진입 (GO)
                </span>
                <p className="text-xs sm:text-[13px] text-emerald-50 font-semibold leading-snug">
                  <strong className="text-white">70점 이상</strong> &amp; 차단·조건부 규제 없음
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[11px] font-black leading-tight">
                  조건부 진입 (CONDITIONAL)
                </span>
                <p className="text-xs sm:text-[13px] text-amber-50 font-semibold leading-snug">
                  <strong className="text-white">50~69점</strong> 또는 조건부 규제 존재 시
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-rose-500/15 border border-rose-400/40 px-4 py-3 flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-300 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <span className="inline-block px-2 py-0.5 rounded-md bg-rose-500 text-white text-[11px] font-black leading-tight">
                  보류 (HOLD)
                </span>
                <p className="text-xs sm:text-[13px] text-rose-50 font-semibold leading-snug">
                  <strong className="text-white">50점 미만</strong> 또는 치명적 차단 규제 1건 이상
                </p>
              </div>
            </div>
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
