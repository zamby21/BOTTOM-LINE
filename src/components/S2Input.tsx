import React, { useState } from 'react';
import {
  CandidateLocation,
  BusinessCategory,
  BuildingUseType,
  ZoningType,
  SchoolZoneType,
  RegionConversionType,
} from '../types/decision';
import {
  INDUSTRY_BENCHMARKS,
} from '../data/presets';
import {
  BUSINESS_REQUIRED_BUILDING_USE,
  CONVERSION_DEPOSIT_LIMITS,
} from '../utils/engine';
import { detectRegionFromAddress, DetectedRegionResult } from '../utils/regionDetector';
import {
  predictRegulationsLocally,
  RegulatoryPrediction,
  EEIS_GIS_URL,
  checkBusinessTypeSchoolZoneStatus,
} from '../utils/regulatoryPredictor';
import { AddressSearchModal, AddressSearchResult } from './AddressSearchModal';
import { VerificationLinksCard } from './VerificationLinksCard';
import {
  MapPin,
  Building2,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Search,
  Sparkles,
  ExternalLink,
  Loader2,
  GraduationCap,
  FileCheck2,
  Check,
  Copy,
  Map,
} from 'lucide-react';

interface S2InputProps {
  candidate: CandidateLocation;
  onChange: (updated: CandidateLocation) => void;
  onNext: () => void;
}

const BUSINESS_OPTIONS: { category: BusinessCategory; label: string }[] = [
  { category: 'cafe', label: '카페·디저트' },
  { category: 'restaurant', label: '일반음식점 (한식/일식/양식)' },
  { category: 'pub', label: '주점·호프·이자카야' },
  { category: 'snack', label: '분식·패스트푸드' },
  { category: 'bakery', label: '제과·베이커리' },
  { category: 'retail', label: '판매·소매점' },
  { category: 'beauty', label: '미용·뷰티샵' },
  { category: 'entertainment', label: '엔터테인먼트 (PC방/노래방)' },
  { category: 'fitness', label: '피트니스·운동시설' },
];

const BUILDING_USES: BuildingUseType[] = [
  '제1종근린생활시설',
  '제2종근린생활시설',
  '일반음식점',
  '휴게음식점',
  '판매시설',
  '업무시설',
  '위락시설',
  '기타',
];

const ZONINGS: ZoningType[] = [
  '일반상업지역',
  '중심상업지역',
  '근린상업지역',
  '유통상업지역',
  '준주거지역',
  '제2종일반주거지역',
  '제3종일반주거지역',
  '제1종일반주거지역',
  '전용주거지역',
  '자연녹지지역',
];

export const S2Input: React.FC<S2InputProps> = ({
  candidate,
  onChange,
  onNext,
}) => {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAiScreening, setIsAiScreening] = useState(false);
  const [screeningNotice, setScreeningNotice] = useState<string | null>(null);
  const [gisCopyNotice, setGisCopyNotice] = useState<string | null>(null);

  const [lastAutoDetectedInfo, setLastAutoDetectedInfo] = useState<DetectedRegionResult>(() =>
    detectRegionFromAddress(candidate.address)
  );
  const [lastRegulatoryPrediction, setLastRegulatoryPrediction] = useState<RegulatoryPrediction>(() =>
    predictRegulationsLocally(candidate.address, candidate.floor, candidate.businessType)
  );

  const handleOpenEeisGis = () => {
    if (candidate.address) {
      navigator.clipboard.writeText(candidate.address);
      setGisCopyNotice(`후보지 주소("${candidate.address}")가 클립보드에 복사되었습니다! 열린 교육환경 GIS 지도 검색창에 붙여넣어(Ctrl+V) 즉시 조회하세요.`);
      setTimeout(() => setGisCopyNotice(null), 5000);
    }
    window.open(EEIS_GIS_URL, '_blank', 'noopener,noreferrer');
  };

  const handleBusinessTypeChange = (newCat: BusinessCategory) => {
    const benchmark = INDUSTRY_BENCHMARKS[newCat];
    const regPred = predictRegulationsLocally(candidate.address, candidate.floor, newCat);
    setLastRegulatoryPrediction(regPred);

    onChange({
      ...candidate,
      businessType: newCat,
      businessName: benchmark.name,
      costOfGoodsRate: benchmark.costOfGoodsRate,
      cardRatio: benchmark.cardRatio,
      deliveryRatio: benchmark.deliveryRatio,
      deliveryFeeRate: benchmark.deliveryFeeRate,
      fullTimeStaff: benchmark.standardStaffCount,
      schoolZone: regPred.predictedSchoolZone,
      hasViolation: regPred.hasViolationSuspected ? true : candidate.hasViolation,
      buildingUse: (newCat === 'restaurant' || newCat === 'pub')
        ? '제2종근린생활시설'
        : (newCat === 'cafe' ? '휴게음식점' : '제1종근린생활시설'),
    });
  };

  // 주소 변경 시 환산보증금 기준 및 교육환경구역/위반건축물 자동 감지 및 적용
  const handleAddressChange = (newAddress: string) => {
    const detected = detectRegionFromAddress(newAddress);
    const regPred = predictRegulationsLocally(newAddress, candidate.floor, candidate.businessType);

    setLastAutoDetectedInfo(detected);
    setLastRegulatoryPrediction(regPred);

    onChange({
      ...candidate,
      address: newAddress,
      regionCode: detected.regionCode,
      schoolZone: regPred.predictedSchoolZone,
      hasViolation: regPred.hasViolationSuspected,
    });
  };

  // 주소찾기 모달에서 주소 선택 완료 시
  const handleSelectAddressResult = (res: AddressSearchResult) => {
    const chosenAddress = res.roadAddress || res.fullAddress;
    const detected = detectRegionFromAddress(chosenAddress);
    const regPred = predictRegulationsLocally(chosenAddress, candidate.floor, candidate.businessType);

    setLastAutoDetectedInfo(detected);
    setLastRegulatoryPrediction(regPred);

    let updatedName = candidate.name;
    if (candidate.name.includes('신규 검토') || candidate.name.startsWith('후보지')) {
      const locationTag = res.buildingName || res.bname || '매물';
      updatedName = `${candidate.name.split(':')[0]}: ${locationTag} ${candidate.businessName}`;
    }

    onChange({
      ...candidate,
      name: updatedName,
      address: chosenAddress,
      detailAddress: res.buildingName ? res.buildingName : candidate.detailAddress,
      regionCode: detected.regionCode,
      schoolZone: regPred.predictedSchoolZone,
      hasViolation: regPred.hasViolationSuspected,
    });
  };

  // Gemini AI 정밀 행정 스크리닝 (주소 기반 교육환경구역 및 위반건축물 위험도 심층 분석)
  const handleAiScreenAddress = async () => {
    if (!candidate.address) return;
    setIsAiScreening(true);
    setScreeningNotice(null);

    try {
      const response = await fetch('/api/gemini/screen-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: candidate.address,
          businessType: candidate.businessName,
          floor: candidate.floor,
          areaSqm: candidate.areaSqm,
        }),
      });

      const json = await response.json();
      if (json.success && json.data) {
        const data = json.data;
        const newSchoolZone: SchoolZoneType = data.predictedSchoolZone || 'none';
        const newViolation = data.predictedHasViolation ?? false;

        setLastRegulatoryPrediction({
          predictedSchoolZone: newSchoolZone,
          schoolZoneRationale: data.schoolZoneRationale || 'Gemini AI 상권 인허가 분석 완료',
          hasViolationSuspected: newViolation,
          violationRiskLevel: data.violationRiskLevel || 'low',
          violationRationale: data.violationRiskRationale || '건축물대장 표제부 확인 권고',
        });

        onChange({
          ...candidate,
          schoolZone: newSchoolZone,
          hasViolation: newViolation,
        });

        setScreeningNotice('✓ Gemini AI 상권 행정 스크리닝이 주소에 맞춰 성공적으로 자동 반영되었습니다.');
      } else {
        setScreeningNotice('AI 스크리닝 서버 응답이 지연되어 로컬 규칙 기반 결과가 유지됩니다.');
      }
    } catch (err: any) {
      setScreeningNotice('AI 분석 통신 실패: 로컬 행정 기준이 적용되었습니다.');
    } finally {
      setIsAiScreening(false);
    }
  };

  const convertedDeposit = candidate.deposit + candidate.monthlyRent * 100;
  const regionLimit = CONVERSION_DEPOSIT_LIMITS[candidate.regionCode].limit;
  const isDepositOver = convertedDeposit > regionLimit;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Daum/Kakao Postcode Address Search Modal */}
      <AddressSearchModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelectAddress={handleSelectAddressResult}
      />

      {/* Step Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <MapPin className="w-3.5 h-3.5" />
            S2 후보지 기본 정보 & 임대 조건
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            후보지 매물 조건 입력
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            주소를 입력하면 <strong>환산보증금 기준, 교육환경보호구역, 위반건축물 위험도</strong>가 자동 세팅되며, 공식 사이트 링크에서 직접 확인할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-sm transition-all"
        >
          다음: 01 Top-line 매출
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Basic Location & Category Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="w-4 h-4 text-blue-600" />
          1. 매물 식별 및 업종
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              후보지 식별 별칭 / 상호
            </label>
            <input
              type="text"
              value={candidate.name}
              onChange={(e) => onChange({ ...candidate, name: e.target.value })}
              placeholder="예: 성수동 연무장길 1층 카페"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              창업 입점 업종 선택
            </label>
            <select
              value={candidate.businessType}
              onChange={(e) => handleBusinessTypeChange(e.target.value as BusinessCategory)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-medium"
            >
              {BUSINESS_OPTIONS.map((opt) => (
                <option key={opt.category} value={opt.category}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              업종 권장 건축법상 용도: {BUSINESS_REQUIRED_BUILDING_USE[candidate.businessType]}
            </div>
          </div>

          {/* Address Input with Daum/Kakao Postcode Address Finder */}
          <div className="sm:col-span-2 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-700">
                소재지 주소 (도로명 / 지번)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-2xs transition-all"
                >
                  <Search className="w-3.5 h-3.5" />
                  주소 검색 (우편번호)
                </button>
                <button
                  type="button"
                  onClick={handleAiScreenAddress}
                  disabled={isAiScreening}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-2xs transition-all disabled:opacity-50"
                >
                  {isAiScreening ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      규제 AI 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      주소 기반 규제 AI 자동 스크리닝
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={candidate.address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="주소 검색 버튼을 누르거나 도로명/지번을 입력하세요 (예: 서울특별시 성동구 연무장길 42)"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium pr-10"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>

              <input
                type="text"
                value={candidate.detailAddress || ''}
                onChange={(e) => onChange({ ...candidate, detailAddress: e.target.value })}
                placeholder="상세 호실 (예: 지상 1층 101호)"
                className="w-full sm:w-48 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Auto-detected Region Feedback Alert */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-blue-950">
                    주소 분석 기반 환산보증금 기준 자동 설정:
                  </span>
                  <span className="font-bold px-2 py-0.5 rounded bg-blue-600 text-white text-[11px]">
                    {CONVERSION_DEPOSIT_LIMITS[candidate.regionCode].label}
                  </span>
                </div>
                <p className="text-[11px] text-blue-700">
                  {lastAutoDetectedInfo.explanation}
                </p>
              </div>
            </div>

            {screeningNotice && (
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                {screeningNotice}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Building Space & Auto-Detected Regulatory Condition */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          2. 공간 규격 및 대장·인허가 환경 (주소 기반 자동 판정)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              전용면적 (㎡)
            </label>
            <div className="relative">
              <input
                type="number"
                min="5"
                step="0.1"
                value={candidate.areaSqm}
                onChange={(e) => onChange({ ...candidate, areaSqm: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">㎡</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              약 {(candidate.areaSqm * 0.3025).toFixed(1)}평
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              해당 층수
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={candidate.floor}
                onChange={(e) => {
                  const newFloor = parseInt(e.target.value, 10) || 1;
                  const regPred = predictRegulationsLocally(candidate.address, newFloor, candidate.businessType);
                  setLastRegulatoryPrediction(regPred);
                  onChange({
                    ...candidate,
                    floor: newFloor,
                    hasViolation: regPred.hasViolationSuspected,
                  });
                }}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">층</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {candidate.floor < 0 ? `지하 ${Math.abs(candidate.floor)}층` : `지상 ${candidate.floor}층`}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              건축물대장상 용도
            </label>
            <select
              value={candidate.buildingUse}
              onChange={(e) => onChange({ ...candidate, buildingUse: e.target.value as BuildingUseType })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
            >
              {BUILDING_USES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              용도지역 (토지이용계획)
            </label>
            <select
              value={candidate.zoning}
              onChange={(e) => onChange({ ...candidate, zoning: e.target.value as ZoningType })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
            >
              {ZONINGS.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Regulatory Toggles with Auto-Detection & Direct Official Check Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Violation Checkbox Card */}
          <div className={`p-4 rounded-xl border transition-all space-y-2.5 ${
            candidate.hasViolation ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <input
                  id="violation-check"
                  type="checkbox"
                  checked={candidate.hasViolation}
                  onChange={(e) => onChange({ ...candidate, hasViolation: e.target.checked })}
                  className="mt-1 w-4 h-4 text-rose-600 rounded-sm focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="violation-check" className="text-xs text-slate-700 cursor-pointer">
                  <span className="font-bold text-slate-900 block text-sm">
                    건축물대장상 위반건축물 표기 여부
                  </span>
                  <span className="text-[11px] text-slate-500">
                    체크 시 건축법 제79조에 따라 차단(Block) 판정 및 신규 인허가 불가 리스크가 반영됩니다.
                  </span>
                </label>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${
                candidate.hasViolation ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {candidate.hasViolation ? '⚠️ 위반 등재 판정' : '✓ 정상(미등재)'}
              </span>
            </div>

            {/* Prediction Rationale & Direct Link */}
            <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
              <div className="flex items-start gap-1">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span><strong>주소 기반 분석:</strong> {lastRegulatoryPrediction.violationRationale}</span>
              </div>

              <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">자동입력 미확정 시 직접 열람:</span>
                <a
                  href="https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  정부24 건축물대장 무료열람
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* School Zone Address-Linked Verification System */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <label className="text-xs font-bold text-slate-900">
                  교육환경보호구역 여부 (학교·유치원 정화구역)
                </label>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                후보지 주소 실시간 연동
              </span>
            </div>

            {/* Address Link & GIS Button */}
            <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-[11px] text-slate-700 leading-snug">
                  <span className="font-bold text-indigo-950 block">연동 후보지 주소:</span>
                  <span className="font-mono text-slate-800 font-semibold truncate block max-w-xs sm:max-w-md">
                    {candidate.address || '주소를 먼저 입력해주세요'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenEeisGis}
                  disabled={!candidate.address}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-bold text-xs shadow-xs transition-all flex-shrink-0 cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5" />
                  교육환경 GIS 지도에서 주소 확인
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {gisCopyNotice && (
                <div className="p-2 rounded bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1.5 animate-fadeIn">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{gisCopyNotice}</span>
                </div>
              )}
            </div>

            {/* Business Suitability & Rationale under Education Environment Protection Act */}
            {(() => {
              const bizStatus = checkBusinessTypeSchoolZoneStatus(candidate.businessType, candidate.schoolZone);
              return (
                <div className="space-y-2">
                  {/* Status Banner */}
                  <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    candidate.schoolZone === 'absolute' && bizStatus.isRestricted
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : candidate.schoolZone === 'relative' && bizStatus.isRestricted
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {bizStatus.status === 'prohibited' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      ) : bizStatus.status === 'caution' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[12px]">
                          {candidate.businessName}: {bizStatus.badgeText}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">교육환경법 제9조</span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {bizStatus.rationale}
                      </p>
                    </div>
                  </div>

                  {/* Address Heuristic Rationale */}
                  <div className="text-[11px] text-slate-600 bg-white/90 p-2 rounded-lg border border-slate-200/80 flex items-start gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      <strong>주소 분석 소견:</strong> {lastRegulatoryPrediction.schoolZoneRationale}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Quick 1-Click Zone Switcher Buttons */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 block">
                  GIS 지도 확인 후 결과 간편 변경 (클릭 즉시 반영):
                </span>
                <a
                  href={EEIS_GIS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5"
                >
                  GIS 시스템 직접열기
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onChange({ ...candidate, schoolZone: 'none' })}
                  className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    candidate.schoolZone === 'none'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-[11px]">🟢 비해당</span>
                  <span className="text-[9px] opacity-80 font-normal">200m 밖 정상</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ ...candidate, schoolZone: 'relative' })}
                  className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    candidate.schoolZone === 'relative'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-[11px]">🟡 상대보호</span>
                  <span className="text-[9px] opacity-80 font-normal">200m 내 (심의)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ ...candidate, schoolZone: 'absolute' })}
                  className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    candidate.schoolZone === 'absolute'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-[11px]">🔴 절대보호</span>
                  <span className="text-[9px] opacity-80 font-normal">50m 내 (원천불허)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Official Verification Portals Card Component */}
        <VerificationLinksCard currentAddress={candidate.address} />
      </div>

      {/* 3. Lease Conditions (Bottom-Line Core Inputs) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            3. 임대차 계약 조건 (만원 단위)
          </h3>
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">법정 환산보증금 적용 지역:</span>
            <select
              value={candidate.regionCode}
              onChange={(e) => onChange({ ...candidate, regionCode: e.target.value as RegionConversionType })}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-blue-800"
            >
              <option value="seoul">서울특별시 (9억원 이하)</option>
              <option value="overcrowded_busan">과밀억제권역 및 부산 (6.9억원 이하)</option>
              <option value="metropolitan">광역시·세종·특정시 (5.4억원 이하)</option>
              <option value="other">그 밖의 지역 (3.7억원 이하)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              임차 보증금
            </label>
            <div className="relative">
              <input
                type="number"
                step="100"
                value={candidate.deposit}
                onChange={(e) => onChange({ ...candidate, deposit: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10 font-semibold"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">만</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {(candidate.deposit / 10000 >= 1) ? `${(candidate.deposit / 10000).toFixed(1)}억원` : `${candidate.deposit.toLocaleString()}만원`}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              월세 (임대료)
            </label>
            <div className="relative">
              <input
                type="number"
                step="10"
                value={candidate.monthlyRent}
                onChange={(e) => onChange({ ...candidate, monthlyRent: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10 font-semibold text-rose-600"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">만</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              월 {candidate.monthlyRent.toLocaleString()}만원
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              월 관리비
            </label>
            <div className="relative">
              <input
                type="number"
                step="5"
                value={candidate.maintenanceFee}
                onChange={(e) => onChange({ ...candidate, maintenanceFee: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10 font-semibold"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">만</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              월 {candidate.maintenanceFee.toLocaleString()}만원
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              바닥/시설 권리금
            </label>
            <div className="relative">
              <input
                type="number"
                step="100"
                value={candidate.premium}
                onChange={(e) => onChange({ ...candidate, premium: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10 font-semibold text-amber-700"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">만</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              회수 불가 위험 자산
            </div>
          </div>
        </div>

        {/* Converted Deposit Status Banner */}
        <div className={`p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
          isDepositOver ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-slate-50 border border-slate-200 text-slate-700'
        }`}>
          <div>
            <span className="font-bold">
              계산된 환산보증금 (보증금 + 월세×100):
            </span>{' '}
            <strong className="text-sm font-extrabold">{convertedDeposit.toLocaleString()}만원</strong>{' '}
            <span className="text-slate-500">
              (기준 상한: {regionLimit.toLocaleString()}만원)
            </span>
          </div>
          {isDepositOver ? (
            <span className="font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-md border border-amber-200 flex items-center gap-1">
              ⚠️ 기준 초과 (차임 5% 인상 상한 배제)
            </span>
          ) : (
            <span className="font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
              ✓ 상가임대차보호법 보호 대상
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
