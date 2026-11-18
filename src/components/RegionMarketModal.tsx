import React, { useState } from 'react';
import { CandidateLocation } from '../types/decision';
import { calculateFinancialMetrics } from '../utils/engine';
import { EEIS_GIS_URL, copyTextToClipboard } from '../utils/regulatoryPredictor';
import {
  X,
  BarChart3,
  ExternalLink,
  Sparkles,
  Loader2,
  MapPin,
  Building2,
  TrendingUp,
  Check,
  AlertCircle,
  Store,
  Landmark,
  FileSearch,
  Map,
} from 'lucide-react';

interface RegionMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateLocation;
}

interface MarketTrendsResult {
  districtName: string;
  commercialCharacter: string;
  footTrafficProfile: string;
  rentBenchmarkRange: string;
  rentAssessment: string;
  vacancyAndCompetitionRisk: string;
  checkPoints: string[];
}

const OFFICIAL_PORTALS = [
  {
    id: 'reb',
    name: '한국부동산원 R-ONE (임대료·공실률·투자수익률)',
    desc: '분기별 중대형/소규모/집합 상가 임대료 지수, 공실률, 투자수익률 공식 추이 조회',
    url: 'https://www.reb.or.kr/r-one/portal/stat/easyStatPage.do',
    badge: '공식 임대 통계',
    icon: BarChart3,
  },
  {
    id: 'semas',
    name: '소상공인365 / 상권정보시스템',
    desc: '시군구·법정동 기준 동종 업종 점포수, 유동인구, 상권 변화 지표 무료 열람',
    url: 'https://bigdata.sbiz.or.kr/',
    badge: '점포·유동인구',
    icon: Store,
  },
  {
    id: 'molit',
    name: '국토교통부 실거래가 공개시스템 (상업·업무용)',
    desc: '인근 상업용 빌딩/집합상가 매매 실거래 및 지분·해제 거래 이력 확인',
    url: 'https://rt.molit.go.kr/',
    badge: '실거래 자료',
    icon: Landmark,
  },
  {
    id: 'eum',
    name: '토지e음 (토지이용계획) & 정부24 건축물대장',
    desc: '용도지역·지구 행위제한 및 건축물대장 원본 표제부·위반 여부 확인',
    url: 'https://www.eum.go.kr/web/ar/lu/luLandDet.jsp',
    badge: '공부·규제 열람',
    icon: FileSearch,
  },
  {
    id: 'eeis',
    name: '교육환경정보시스템 GIS (학교정화구역)',
    desc: '후보지 주소 기준 50m 절대보호구역 / 200m 상대보호구역 반경 지도 확인',
    url: EEIS_GIS_URL,
    badge: '정화구역 GIS',
    icon: Map,
  },
];

export const RegionMarketModal: React.FC<RegionMarketModalProps> = ({
  isOpen,
  onClose,
  candidate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [trendData, setTrendData] = useState<MarketTrendsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const metrics = calculateFinancialMetrics(candidate);
  const rentPerSqmThousand = candidate.areaSqm > 0
    ? ((candidate.monthlyRent + candidate.maintenanceFee) * 10) / candidate.areaSqm
    : 0;

  const handleFetchTrends = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/gemini/market-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: candidate.address,
          businessName: candidate.businessName,
          rentPerPyeong: metrics.rentPerPyeong,
          areaPyeong: metrics.areaPyeong,
          monthlyRent: candidate.monthlyRent,
        }),
      });
      const json = await response.json();
      if (json.success && json.data) {
        setTrendData(json.data);
      } else {
        setErrorMsg(json.error || '지역 상권 분석에 실패했습니다.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPortalAddress = (portalName: string) => {
    if (candidate.address) {
      copyTextToClipboard(candidate.address);
      setCopiedNotice(`후보지 주소("${candidate.address}")를 클립보드에 복사했습니다. ${portalName}에서 붙여넣기(Ctrl+V)하세요.`);
      setTimeout(() => setCopiedNotice(null), 4500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Sticky Modal Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 sm:px-7 py-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <BarChart3 className="w-4 h-4" />
              <span>지역 · 상권 데이터 & 임대 수준 비교 허브</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 truncate max-w-md sm:max-w-xl">
              {candidate.address || '주소 미입력'} ({candidate.businessName})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* 1. Candidate Unit Rent Metrics (For direct comparison with R-ONE stats) */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-blue-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                검토 매물 단위면적당 임대료 지표 (통계 대조 기준값)
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                전용 {candidate.areaSqm}㎡ (약 {metrics.areaPyeong.toFixed(1)}평) · {candidate.floor}층
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block">㎡당 월 임차료 (천원)</span>
                <strong className="text-lg font-black text-white mt-0.5 block">
                  {rentPerSqmThousand.toFixed(1)}천원/㎡
                </strong>
                <span className="text-[10px] text-slate-400">한국부동산원 통계 비교 단위</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block">평당 월 임차료</span>
                <strong className="text-lg font-black text-blue-300 mt-0.5 block">
                  {metrics.rentPerPyeong.toFixed(1)}만원/평
                </strong>
                <span className="text-[10px] text-slate-400">월세+관리비 포함 기준</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block">연간 임대·관리비 총액</span>
                <strong className="text-lg font-black text-amber-300 mt-0.5 block">
                  {metrics.annualRentTotal.toLocaleString()}만원
                </strong>
                <span className="text-[10px] text-slate-400">월 {metrics.monthlyRentAndMaintenance.toLocaleString()}만원 × 12</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block">매출 대비 임대부담률</span>
                <strong className={`text-lg font-black mt-0.5 block ${
                  metrics.rentBurdenRate <= 0.12 ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  {(metrics.rentBurdenRate * 100).toFixed(1)}%
                </strong>
                <span className="text-[10px] text-slate-400">권장 기준 10~12% 이하</span>
              </div>
            </div>
          </div>

          {/* 2. Gemini AI Commercial District & Rental Trend Briefing */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  AI 상권·임대동향 리서치 브리핑
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  입력한 주소와 평당 임차료를 바탕으로 상권 성격, 유동인구, 임대료 적정성을 요약합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFetchTrends}
                disabled={isLoading || !candidate.address}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all flex-shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    상권 데이터 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    {trendData ? '상권 리서치 다시 실행' : '이 주소 상권·임대동향 분석'}
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {trendData ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-purple-950 text-sm flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      {trendData.districtName}
                    </span>
                    <span className="text-xs font-bold text-purple-800">
                      권역 참고 임대 시세: {trendData.rentBenchmarkRange}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {trendData.commercialCharacter}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 block">유동인구 및 배후수요</span>
                    <p className="text-slate-600 leading-relaxed">{trendData.footTrafficProfile}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 block">검토 임대료 적정성 평가</span>
                    <p className="text-slate-600 leading-relaxed">{trendData.rentAssessment}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-slate-800 block">공실 추이 및 경쟁 리스크</span>
                    <p className="text-slate-600 leading-relaxed">{trendData.vacancyAndCompetitionRisk}</p>
                  </div>
                </div>

                {trendData.checkPoints && trendData.checkPoints.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1.5 text-xs">
                    <span className="font-bold text-blue-950 block">현장 실사 및 공식 통계 대조 포인트 3가지:</span>
                    <ul className="space-y-1 text-slate-700">
                      {trendData.checkPoints.map((cp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-bold text-blue-600">{i + 1}.</span>
                          <span>{cp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[11px] text-slate-400">
                  * 본 AI 리서치는 상권 구조 기반의 참고 브리핑이며, 한국부동산원·소상공인시장진흥공단의 실시간 공식 통계 수치와 구분됩니다. 아래 공식 포털에서 원천 데이터를 반드시 교차 확인하십시오.
                </p>
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                상단의 <strong>[이 주소 상권·임대동향 분석]</strong> 버튼을 누르면 현재 후보지 주소와 평당 임차료를 기준으로 AI 상권 리서치 브리핑을 생성합니다.
              </div>
            )}
          </div>

          {/* 3. Direct Links to 5 Official Korean Public Data Portals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                공식 공공데이터 원천 통계 · 대장 직접 조회 (후보지 주소 자동 복사)
              </h3>
            </div>

            {copiedNotice && (
              <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{copiedNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {OFFICIAL_PORTALS.map((portal) => {
                const Icon = portal.icon;
                return (
                  <a
                    key={portal.id}
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleCopyPortalAddress(portal.name)}
                    className="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-blue-700">
                          {portal.badge}
                        </div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {portal.name}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          {portal.desc}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0 mt-1" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
