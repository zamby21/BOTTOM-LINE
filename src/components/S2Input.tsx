import React, { useState, useEffect, useRef } from 'react';
import {
  CandidateLocation,
  BusinessCategory,
  BuildingUseType,
  ZoningType,
  SchoolZoneType,
  RegionConversionType,
  BuildingUnitOption,
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
  copyTextToClipboard,
} from '../utils/regulatoryPredictor';
import { AddressSearchModal, AddressSearchResult } from './AddressSearchModal';
import { VerificationLinksCard } from './VerificationLinksCard';
import { NgiiCandidateMap } from './NgiiCandidateMap';
import {
  KOREA_REGIONS,
  searchKoreaRegions,
  matchRegionFromAddressString,
  RegionFlatMatch,
} from '../data/koreaRegions';
import {
  TAX_INDUSTRY_TAXONOMY,
  TAX_MAJOR_CATEGORIES,
  getTaxMediumCategories,
  getTaxSubCategories,
  searchTaxIndustries,
  findTaxIndustryForCandidate,
  TaxIndustryItem,
} from '../data/taxIndustryTaxonomy';
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
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  Globe,
  Scale,
} from 'lucide-react';

interface NearbyListingItem {
  scopeLabel: string;
  locationHint: string;
  floor: string;
  areaText: string;
  depositManwon: string;
  monthlyRentManwon: string;
  maintenanceFeeManwon: string;
  premiumManwon: string;
  sourceName: string;
  note: string;
}

interface NearbySearchData {
  searchScopeNote: string;
  listings: NearbyListingItem[];
  neighborhoodBenchmark?: {
    depositRange?: string;
    rentRange?: string;
    maintenanceNote?: string;
    premiumNote?: string;
  } | null;
  searchTips?: string[];
}

interface NearbySearchState {
  data: NearbySearchData;
  sources: Array<{ title: string; uri: string }>;
  searchQueries?: string[];
}

function extractManwonNumber(raw?: string): string {
  if (!raw) return '';
  const text = String(raw).replace(/\s+/g, '');
  if (!text || /미공개|미확인|협의|문의|별도|없음/.test(text)) {
    if (/무권리/.test(text)) return '0';
    return '';
  }
  const eokMatch = text.match(/(\d+(?:\.\d+)?)억(?:(\d+(?:,\d+)*))?/);
  if (eokMatch) {
    const eok = parseFloat(eokMatch[1]) * 10000;
    const rem = eokMatch[2] ? parseInt(eokMatch[2].replace(/,/g, ''), 10) : 0;
    const total = Math.round(eok + rem);
    return total > 0 ? String(total) : '';
  }
  const numMatch = text.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
  if (!numMatch) return '';
  const val = parseFloat(numMatch[1].replace(/,/g, ''));
  return Number.isFinite(val) ? String(Math.round(val)) : '';
}

function extractSqmNumber(raw?: string): string {
  if (!raw) return '';
  const sqmMatch = String(raw).match(/(\d+(?:\.\d+)?)\s*(?:㎡|m²|m2)/i);
  if (sqmMatch) return sqmMatch[1];
  const pyeongMatch = String(raw).match(/(\d+(?:\.\d+)?)\s*평/);
  if (pyeongMatch) {
    return (parseFloat(pyeongMatch[1]) / 0.3025).toFixed(1);
  }
  return '';
}

function buildPropertyPortalQuery(address: string, jibunAddress?: string, buildingName?: string) {
  const cleanRoad = (address || '').split('(')[0].trim();
  const cleanJibun = (jibunAddress || '').split('(')[0].trim();
  const cleanBuilding = (buildingName || '').trim();
  const fullCopyText = cleanBuilding && !cleanRoad.includes(cleanBuilding)
    ? `${cleanRoad} (${cleanBuilding})`
    : cleanRoad || cleanJibun;

  // Short keyword best suited for Nemo / Naver keyword search (dong/road + number)
  const sourceStr = cleanJibun || cleanRoad;
  const tokens = sourceStr.split(/\s+/).filter(Boolean);
  const shortKeyword =
    tokens.length >= 2 ? tokens.slice(-2).join(' ') : sourceStr;

  return {
    fullCopyText,
    cleanRoad,
    cleanJibun,
    shortKeyword,
  };
}

interface S2InputProps {
  candidate: CandidateLocation;
  onChange: (updated: CandidateLocation) => void;
  onNext: () => void;
}

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

  // 건축물대장 연동 호실 조회 상태
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [buildingTitle, setBuildingTitle] = useState<{
    buildingName: string;
    regstrKind: string;
    mainPurpose: string;
    etcPurpose: string;
    groundFloors: number;
    undergroundFloors: number;
    totalAreaSqm: number;
    approvalDate: string;
    hasViolation: boolean;
    zoning?: ZoningType | null;
    rawZoningName?: string;
    jijiguZones?: string[];
  } | null>(null);
  const [apiUnits, setApiUnits] = useState<BuildingUnitOption[]>([]);
  const [unitStatusCode, setUnitStatusCode] = useState<string | null>(null);
  const [unitStatusMessage, setUnitStatusMessage] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState('');
  const [showManualUnitForm, setShowManualUnitForm] = useState(false);
  const [manualHo, setManualHo] = useState('101호');
  const [manualFloor, setManualFloor] = useState(1);
  const [manualArea, setManualArea] = useState(49.5);
  const [manualUse, setManualUse] = useState<BuildingUseType>('제1종근린생활시설');
  const [manualZoning, setManualZoning] = useState<ZoningType>(candidate.zoning);
  const candidateRef = useRef<CandidateLocation>(candidate);
  candidateRef.current = candidate;

  // 위치 입력 방법 상태 (인라인 다음 주소 검색 + 시·도/시·군·구/읍·면·동/리 색인)
  const [isInlinePostcodeOpen, setIsInlinePostcodeOpen] = useState(false);
  const [inlineDaumLoaded, setInlineDaumLoaded] = useState(false);
  const inlinePostcodeRef = useRef<HTMLDivElement>(null);
  const [showRegionIndex, setShowRegionIndex] = useState(true);
  const [showLocationAutocomplete, setShowLocationAutocomplete] = useState(false);
  const [selectedSido, setSelectedSido] = useState<string>(() => matchRegionFromAddressString(candidate.address).sido);
  const [selectedSigungu, setSelectedSigungu] = useState<string>(() => matchRegionFromAddressString(candidate.address).sigungu);
  const [selectedDong, setSelectedDong] = useState<string>(() => matchRegionFromAddressString(candidate.address).dong);
  const [selectedRi, setSelectedRi] = useState<string>(() => matchRegionFromAddressString(candidate.address).ri);

  // 국세청 세무서 업종분류(대·중·소분류) 상태
  const [industrySearchQuery, setIndustrySearchQuery] = useState('');
  const [showIndustryAutocomplete, setShowIndustryAutocomplete] = useState(false);
  const [showIndustryHierarchy, setShowIndustryHierarchy] = useState(true);
  const initialTaxMatch = findTaxIndustryForCandidate(
    candidate.businessName,
    candidate.businessType,
    candidate.taxIndustryCode
  );
  const [selectedTaxMajor, setSelectedTaxMajor] = useState<string>(
    candidate.taxIndustryMajor || initialTaxMatch?.major || ''
  );
  const [selectedTaxMedium, setSelectedTaxMedium] = useState<string>(
    candidate.taxIndustryMedium || initialTaxMatch?.medium || ''
  );
  const [selectedTaxItemId, setSelectedTaxItemId] = useState<string>(initialTaxMatch?.id || '');

  // 동일 건물 · 반경 30m 이내 임대 사례 참고 (매물 사이트 검색 & 웹 검색) 상태
  const [nearbyCopyNotice, setNearbyCopyNotice] = useState<string | null>(null);
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [nearbySearchResult, setNearbySearchResult] = useState<NearbySearchState | null>(null);
  const [nearbySearchError, setNearbySearchError] = useState<string | null>(null);
  const [compareListing, setCompareListing] = useState<{
    label: string;
    deposit: string;
    monthlyRent: string;
    maintenanceFee: string;
    premium: string;
    areaSqm: string;
  }>({
    label: '',
    deposit: '',
    monthlyRent: '',
    maintenanceFee: '',
    premium: '',
    areaSqm: '',
  });

  useEffect(() => {
    setBuildingTitle(null);
    setApiUnits([]);
    setUnitStatusCode(null);
    setUnitStatusMessage(null);
    setUnitFilter('');
    setShowManualUnitForm(false);
    setIsInlinePostcodeOpen(false);
    setShowLocationAutocomplete(false);
    setIndustrySearchQuery('');
    setShowIndustryAutocomplete(false);
    setNearbyCopyNotice(null);
    setNearbySearchResult(null);
    setNearbySearchError(null);
    setCompareListing({
      label: '',
      deposit: '',
      monthlyRent: '',
      maintenanceFee: '',
      premium: '',
      areaSqm: '',
    });
    setLastAutoDetectedInfo(detectRegionFromAddress(candidate.address));
    setLastRegulatoryPrediction(
      predictRegulationsLocally(candidate.address, candidate.floor, candidate.businessType)
    );
    const regionMatch = matchRegionFromAddressString(candidate.address);
    setSelectedSido(regionMatch.sido);
    setSelectedSigungu(regionMatch.sigungu);
    setSelectedDong(regionMatch.dong);
    setSelectedRi(regionMatch.ri);

    const taxMatch = findTaxIndustryForCandidate(
      candidate.businessName,
      candidate.businessType,
      candidate.taxIndustryCode
    );
    setSelectedTaxMajor(candidate.taxIndustryMajor || taxMatch?.major || '');
    setSelectedTaxMedium(candidate.taxIndustryMedium || taxMatch?.medium || '');
    setSelectedTaxItemId(taxMatch?.id || '');
  }, [candidate.id]);

  // 인라인 다음(카카오) 우편번호 검색 임베드
  useEffect(() => {
    if (!isInlinePostcodeOpen) return;

    const mountPostcode = () => {
      if ((window as any).daum?.Postcode && inlinePostcodeRef.current) {
        setInlineDaumLoaded(true);
        inlinePostcodeRef.current.innerHTML = '';
        new (window as any).daum.Postcode({
          oncomplete: (data: any) => {
            const roadAddr = data.roadAddress || data.autoRoadAddress || data.address;
            const extraAddr = data.buildingName ? ` (${data.buildingName})` : '';
            const fullAddress = `${roadAddr}${extraAddr}`;
            handleSelectAddressResult({
              fullAddress,
              roadAddress: roadAddr,
              jibunAddress: data.jibunAddress || data.autoJibunAddress || '',
              buildingName: data.buildingName || '',
              bname: data.bname || '',
              sido: data.sido || '',
              sigungu: data.sigungu || '',
              bcode: data.bcode || '',
              sigunguCode: data.sigunguCode || '',
              buildingCode: data.buildingCode || '',
            });
            setIsInlinePostcodeOpen(false);
          },
          width: '100%',
          height: '100%',
        }).embed(inlinePostcodeRef.current);
        return true;
      }
      return false;
    };

    const timer = setTimeout(() => {
      if (!mountPostcode()) {
        const scriptId = 'daum-postcode-script-loader';
        const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
        if (!existing) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
          script.onload = () => {
            mountPostcode();
          };
          document.body.appendChild(script);
        } else {
          const prevOnload = existing.onload;
          existing.onload = (ev) => {
            if (typeof prevOnload === 'function') prevOnload.call(existing, ev);
            mountPostcode();
          };
        }
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [isInlinePostcodeOpen]);

  const handleCopyEeisAddress = () => {
    if (candidate.address) {
      copyTextToClipboard(candidate.address);
      setGisCopyNotice(`후보지 주소("${candidate.address}")가 클립보드에 복사되었습니다! 열린 교육환경보호구역 지도 검색창에 붙여넣어(Ctrl+V) 즉시 조회하세요.`);
      setTimeout(() => setGisCopyNotice(null), 5000);
    }
  };

  // 국세청 세무서 업종분류 소분류 선택 핸들러
  const handleSelectTaxIndustryItem = (item: TaxIndustryItem) => {
    const newCat = item.mappedCategory;
    const benchmark = INDUSTRY_BENCHMARKS[newCat];
    const regPred = predictRegulationsLocally(candidate.address, candidate.floor, newCat);
    setLastRegulatoryPrediction(regPred);

    setSelectedTaxMajor(item.major);
    setSelectedTaxMedium(item.medium);
    setSelectedTaxItemId(item.id);
    setIndustrySearchQuery('');
    setShowIndustryAutocomplete(false);

    onChange({
      ...candidate,
      businessType: newCat,
      businessName: item.name,
      taxIndustryCode: item.taxCode,
      taxIndustryMajor: item.major,
      taxIndustryMedium: item.medium,
      costOfGoodsRate: item.benchmarkOverrides?.costOfGoodsRate ?? benchmark.costOfGoodsRate,
      cardRatio: item.benchmarkOverrides?.cardRatio ?? benchmark.cardRatio,
      deliveryRatio: item.benchmarkOverrides?.deliveryRatio ?? benchmark.deliveryRatio,
      deliveryFeeRate: item.benchmarkOverrides?.deliveryFeeRate ?? benchmark.deliveryFeeRate,
      fullTimeStaff: item.benchmarkOverrides?.standardStaffCount ?? benchmark.standardStaffCount,
      schoolZone: regPred.predictedSchoolZone,
      hasViolation: regPred.hasViolationSuspected ? true : candidate.hasViolation,
      buildingUse: item.recommendedBuildingUse,
    });
  };

  // 주소 변경 시 환산보증금 기준 및 교육환경구역/위반건축물 자동 감지 및 적용
  const handleAddressChange = (newAddress: string, skipIndexSync = false) => {
    const detected = detectRegionFromAddress(newAddress);
    const regPred = predictRegulationsLocally(newAddress, candidate.floor, candidate.businessType);

    setLastAutoDetectedInfo(detected);
    setLastRegulatoryPrediction(regPred);
    setBuildingTitle(null);
    setApiUnits([]);
    setUnitStatusCode(null);
    setUnitStatusMessage(null);
    setNearbySearchResult(null);
    setNearbySearchError(null);
    setNearbyCopyNotice(null);

    if (!skipIndexSync) {
      const matched = matchRegionFromAddressString(newAddress);
      setSelectedSido(matched.sido);
      setSelectedSigungu(matched.sigungu);
      setSelectedDong(matched.dong);
      setSelectedRi(matched.ri);
    }

    onChange({
      ...candidate,
      address: newAddress,
      regionCode: detected.regionCode,
      schoolZone: regPred.predictedSchoolZone,
      hasViolation: regPred.hasViolationSuspected,
      parcelInfo: undefined,
      selectedUnitId: undefined,
    });
  };

  const handleCopyPortalAddress = (copyTarget: string, portalName?: string) => {
    if (!copyTarget) return;
    copyTextToClipboard(copyTarget);
    setNearbyCopyNotice(
      portalName
        ? `검색어("${copyTarget}")를 복사했습니다. 열린 ${portalName} 검색창에 붙여넣기(Ctrl+V)하여 동일 건물 및 30m 이내 매물을 확인하세요.`
        : `검색어("${copyTarget}")가 클립보드에 복사되었습니다.`
    );
    setTimeout(() => setNearbyCopyNotice(null), 5000);
  };

  const handleSearchNearbyListings = async () => {
    if (!candidate.address.trim()) {
      setNearbySearchError('상단 [1. 후보지 기본정보]에서 후보지 주소를 먼저 입력해주세요.');
      return;
    }
    setIsSearchingNearby(true);
    setNearbySearchError(null);
    try {
      const res = await fetch('/api/gemini/search-nearby-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: candidate.address,
          jibunAddress: candidate.parcelInfo?.jibunAddress || '',
          buildingName: buildingTitle?.buildingName || candidate.parcelInfo?.buildingName || '',
          floor: candidate.floor,
          areaSqm: candidate.areaSqm,
          businessName: candidate.businessName,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setNearbySearchResult(null);
        setNearbySearchError(json.error || '인근 매물 사례 검색에 실패했습니다.');
        return;
      }
      setNearbySearchResult({
        data: json.data,
        sources: Array.isArray(json.sources) ? json.sources : [],
        searchQueries: Array.isArray(json.searchQueries) ? json.searchQueries : [],
      });
    } catch (err: any) {
      setNearbySearchResult(null);
      setNearbySearchError(err?.message || '인근 매물 사례 웹 검색 중 통신 오류가 발생했습니다.');
    } finally {
      setIsSearchingNearby(false);
    }
  };

  const applyRegionIndexSelection = (sido: string, sigungu: string, dong: string, ri: string) => {
    const cleanSigungu = sigungu === '세종시 전체' ? '' : sigungu;
    const combined = [sido, cleanSigungu, dong, ri].filter(Boolean).join(' ');
    if (combined) {
      handleAddressChange(combined, true);
    }
  };

  const handleSelectSido = (newSido: string) => {
    setSelectedSido(newSido);
    setSelectedSigungu('');
    setSelectedDong('');
    setSelectedRi('');
    if (newSido) {
      applyRegionIndexSelection(newSido, '', '', '');
    }
  };

  const handleSelectSigungu = (newSigungu: string) => {
    setSelectedSigungu(newSigungu);
    setSelectedDong('');
    setSelectedRi('');
    applyRegionIndexSelection(selectedSido, newSigungu, '', '');
  };

  const handleSelectDong = (newDong: string) => {
    setSelectedDong(newDong);
    setSelectedRi('');
    applyRegionIndexSelection(selectedSido, selectedSigungu, newDong, '');
  };

  const handleSelectRi = (newRi: string) => {
    setSelectedRi(newRi);
    applyRegionIndexSelection(selectedSido, selectedSigungu, selectedDong, newRi);
  };

  const handlePickLocationAutocomplete = (match: RegionFlatMatch) => {
    setSelectedSido(match.sido);
    setSelectedSigungu(match.sigungu);
    setSelectedDong(match.dong);
    setSelectedRi(match.ri);
    setShowLocationAutocomplete(false);
    handleAddressChange(match.fullLabel, true);
  };

  const fetchBuildingRegisterUnits = async (
    targetAddress: string,
    targetJibun?: string,
    targetBcode?: string
  ) => {
    if (!targetAddress.trim()) return;
    setIsLoadingUnits(true);
    setUnitStatusMessage(null);
    setUnitStatusCode(null);

    try {
      const response = await fetch('/api/building-register/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: targetAddress,
          jibunAddress: targetJibun || '',
          bcode: targetBcode || '',
        }),
      });
      const json = await response.json();
      if (json.success) {
        const titleData = json.buildingTitle || null;
        setBuildingTitle(titleData);
        const fetchedUnits: BuildingUnitOption[] = Array.isArray(json.units) ? json.units : [];
        setApiUnits(fetchedUnits);

        // Apply fetched zoning, jijiguZones & violation flag onto latest candidate snapshot
        const latest = candidateRef.current;
        const resolvedZoning = (titleData?.zoning as ZoningType | undefined) || latest.zoning;
        const nextParcelInfo = {
          ...(latest.parcelInfo || {}),
          zoning: resolvedZoning,
          jijiguZones: Array.isArray(titleData?.jijiguZones) ? titleData.jijiguZones : latest.parcelInfo?.jijiguZones,
        };
        if (titleData?.zoning || titleData?.hasViolation || nextParcelInfo.jijiguZones?.length) {
          onChange({
            ...latest,
            zoning: resolvedZoning,
            hasViolation: titleData?.hasViolation ? true : latest.hasViolation,
            parcelInfo: nextParcelInfo,
          });
        }

        if (fetchedUnits.length === 0) {
          setUnitStatusCode('NO_UNITS');
          setUnitStatusMessage('해당 필지에 등록된 전유 호실/층별 데이터가 없습니다. 정부24에서 대장을 직접 확인하거나 아래에 호실을 등록하세요.');
        } else {
          setUnitStatusCode('READY');
          setUnitStatusMessage(null);
        }
      } else {
        setBuildingTitle(null);
        setApiUnits([]);
        setUnitStatusCode(json.code || 'SERVER_ERROR');
        setUnitStatusMessage(json.message || '건축물대장 호실 정보를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      setBuildingTitle(null);
      setApiUnits([]);
      setUnitStatusCode('SERVER_ERROR');
      setUnitStatusMessage(err?.message || '건축물대장 API 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingUnits(false);
    }
  };

  const handleSelectBuildingUnit = (unit: BuildingUnitOption) => {
    const regPred = predictRegulationsLocally(candidate.address, unit.floorNumber, candidate.businessType);
    setLastRegulatoryPrediction(regPred);

    const formattedDetail = [
      unit.dongNm ? `${unit.dongNm}` : '',
      unit.floorLabel,
      unit.hoNm !== `${unit.floorLabel} 전체` ? unit.hoNm : '',
    ]
      .filter(Boolean)
      .join(' ');

    onChange({
      ...candidate,
      detailAddress: formattedDetail || unit.hoNm,
      areaSqm: unit.exclusiveAreaSqm,
      floor: unit.floorNumber,
      buildingUse: unit.mappedBuildingUse,
      zoning: unit.zoning || buildingTitle?.zoning || candidate.zoning,
      selectedUnitId: unit.id,
      hasViolation: buildingTitle?.hasViolation ? true : candidate.hasViolation,
    });
  };

  const handleAddManualUnit = () => {
    const cleanHo = manualHo.trim() || '101호';
    const floorLabel = manualFloor < 0 ? `지하 ${Math.abs(manualFloor)}층` : `${manualFloor}층`;
    const newUnit: BuildingUnitOption = {
      id: `manual-unit-${Date.now()}`,
      kind: 'manual',
      hoNm: cleanHo,
      floorNumber: manualFloor,
      floorLabel,
      exclusiveAreaSqm: manualArea > 0 ? manualArea : 33,
      mainPurpose: manualUse,
      mappedBuildingUse: manualUse,
      zoning: manualZoning,
      source: 'manual',
    };
    const nextManualUnits = [...(candidate.manualUnits || []), newUnit];
    const regPred = predictRegulationsLocally(candidate.address, newUnit.floorNumber, candidate.businessType);
    setLastRegulatoryPrediction(regPred);

    onChange({
      ...candidate,
      manualUnits: nextManualUnits,
      detailAddress: `${newUnit.floorLabel} ${newUnit.hoNm}`,
      areaSqm: newUnit.exclusiveAreaSqm,
      floor: newUnit.floorNumber,
      buildingUse: newUnit.mappedBuildingUse,
      zoning: newUnit.zoning || candidate.zoning,
      selectedUnitId: newUnit.id,
    });
    setShowManualUnitForm(false);
  };

  const handleRemoveManualUnit = (unitId: string) => {
    const nextManual = (candidate.manualUnits || []).filter((u) => u.id !== unitId);
    onChange({
      ...candidate,
      manualUnits: nextManual,
      selectedUnitId: candidate.selectedUnitId === unitId ? undefined : candidate.selectedUnitId,
    });
  };

  // 주소찾기 모달에서 주소 선택 완료 시
  const handleSelectAddressResult = (res: AddressSearchResult) => {
    const chosenAddress = res.roadAddress || res.fullAddress;
    const detected = detectRegionFromAddress(chosenAddress);
    const regPred = predictRegulationsLocally(chosenAddress, candidate.floor, candidate.businessType);

    setLastAutoDetectedInfo(detected);
    setLastRegulatoryPrediction(regPred);

    const matched = matchRegionFromAddressString(chosenAddress);
    if (matched.sido) {
      setSelectedSido(matched.sido);
      setSelectedSigungu(matched.sigungu);
      setSelectedDong(matched.dong);
      setSelectedRi(matched.ri);
    }
    setShowLocationAutocomplete(false);

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
      parcelInfo: {
        bcode: res.bcode || '',
        jibunAddress: res.jibunAddress || '',
        buildingCode: res.buildingCode || '',
        buildingName: res.buildingName || '',
      },
      selectedUnitId: undefined,
    });

    if (res.bcode && res.jibunAddress) {
      fetchBuildingRegisterUnits(chosenAddress, res.jibunAddress, res.bcode);
    } else {
      setBuildingTitle(null);
      setApiUnits([]);
      setUnitStatusCode('PARCEL_CODE_REQUIRED');
      setUnitStatusMessage('선택한 상권 프리셋에는 세부 지번 코드가 없습니다. [주소 검색 (우편번호)]으로 실제 주소를 지정하면 건축물대장과 연동됩니다.');
    }
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
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
            후보지 기본정보
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            위치(주소 검색 또는 지역 색인)와 세무서 기준 업종을 지정하면 <strong>환산보증금 기준, 교육환경보호구역, 위반건축물 위험도</strong>가 자동 세팅됩니다.
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

      {/* 1. 후보지 기본정보 (위치 및 세무서 기준 업종) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            1. 후보지 식별 · 위치(주소검색/색인) 및 세무서 기준 업종
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              핵심상권 퀵선택
            </button>
            <button
              type="button"
              onClick={handleAiScreenAddress}
              disabled={isAiScreening}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isAiScreening ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  규제 AI 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  규제 AI 자동 스크리닝
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2-Column Layout: Left = All Candidate Inputs (별칭 → 위치 → 상세 호실 → 세무서 기준 업종), Right = 국토지리정보원 영상·배경지도 뷰 */}
        {(() => {
          const locationMatches = showLocationAutocomplete ? searchKoreaRegions(candidate.address, 10) : [];
          const currentSidoObj = KOREA_REGIONS.find((s) => s.name === selectedSido);
          const sigunguList = currentSidoObj?.sigungus || [];
          const currentSigunguObj = sigunguList.find((g) => g.name === selectedSigungu);
          const dongList = currentSigunguObj?.dongs || [];
          const currentDongObj = dongList.find((d) => d.name === selectedDong);
          const riList = currentDongObj?.ri || [];

          const industryMatches = showIndustryAutocomplete ? searchTaxIndustries(industrySearchQuery, 12) : [];
          const mediumList = getTaxMediumCategories(selectedTaxMajor);
          const subList = getTaxSubCategories(selectedTaxMajor, selectedTaxMedium);
          const selectedTaxItem = TAX_INDUSTRY_TAXONOMY.find((i) => i.id === selectedTaxItemId);

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* LEFT COLUMN: 후보지 별칭 → 분석 지역(위치) → 상세 호실 → 세무서 기준 업종 */}
              <div className="lg:col-span-6 space-y-4">
                {/* 후보지 식별 별칭 / 상호 */}
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

                {/* 분석 지역 / 후보지 위치 (주소검색 또는 지역 색인) */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    분석 지역 (후보지 위치) <span className="text-rose-500">*</span>
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={candidate.address}
                        onFocus={() => setShowLocationAutocomplete(true)}
                        onBlur={() => setTimeout(() => setShowLocationAutocomplete(false), 180)}
                        onChange={(e) => {
                          handleAddressChange(e.target.value);
                          setShowLocationAutocomplete(true);
                        }}
                        placeholder="예: 성수동2가, 강남구, 부산 해운대구"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                      />
                      {locationMatches.length > 0 && (
                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {locationMatches.map((m, i) => (
                            <button
                              key={`${m.fullLabel}-${i}`}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handlePickLocationAutocomplete(m);
                              }}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <span className="font-semibold text-slate-800">{m.fullLabel}</span>
                              <span className="text-[10px] text-emerald-700 font-bold">색인 선택</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsInlinePostcodeOpen((prev) => !prev)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
                        isInlinePostcodeOpen
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-emerald-500 bg-white hover:bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isInlinePostcodeOpen ? '주소 검색 닫기' : '주소 검색 열기'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                    <span>직접 입력하여 검색하거나 목록에서 선택하세요.</span>
                    <span>주소 검색으로 자동 입력</span>
                  </div>

                  {/* Inline Embedded Kakao Postcode Box */}
                  {isInlinePostcodeOpen && (
                    <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs">
                      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                        <span>도로명이나 지번을 검색하고 주소를 선택해주세요. (건축물대장 호실 자동 연동)</span>
                        <button
                          type="button"
                          onClick={() => setIsInlinePostcodeOpen(false)}
                          className="text-slate-400 hover:text-slate-700 font-bold"
                        >
                          닫기
                        </button>
                      </div>
                      <div className="relative w-full h-[380px]">
                        <div ref={inlinePostcodeRef} className="w-full h-full" />
                        {!inlineDaumLoaded && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-500 text-xs gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                            <span>카카오 우편번호 검색창을 불러오는 중...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 지역 목록에서 선택 (시·도 / 시·군·구 / 읍·면·동 / 리 색인) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setShowRegionIndex((prev) => !prev)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${showRegionIndex ? '' : '-rotate-90'}`}
                      />
                      지역 목록에서 선택 (행정구역 색인)
                    </button>

                    {showRegionIndex && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <select
                          value={selectedSido}
                          onChange={(e) => handleSelectSido(e.target.value)}
                          aria-label="시·도 선택"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">시·도 선택</option>
                          {KOREA_REGIONS.map((s) => (
                            <option key={s.name} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={selectedSigungu}
                          onChange={(e) => handleSelectSigungu(e.target.value)}
                          disabled={!selectedSido}
                          aria-label="시·군·구 선택"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white disabled:bg-slate-100 disabled:text-slate-400 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">시·군·구 선택</option>
                          {sigunguList.map((g) => (
                            <option key={g.name} value={g.name}>
                              {g.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={selectedDong}
                          onChange={(e) => handleSelectDong(e.target.value)}
                          disabled={!selectedSigungu}
                          aria-label="읍·면·동 선택"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white disabled:bg-slate-100 disabled:text-slate-400 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">{selectedSigungu ? '시·군·구 전체' : '읍·면·동 선택'}</option>
                          {dongList.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={selectedRi}
                          onChange={(e) => handleSelectRi(e.target.value)}
                          disabled={riList.length === 0}
                          aria-label="리 선택"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white disabled:bg-slate-100 disabled:text-slate-400 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">{riList.length > 0 ? '리 전체 선택' : '리 선택 없음'}</option>
                          {riList.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* 상세 호실 (층·호수) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    상세 호실 (층·호수)
                  </label>
                  <input
                    type="text"
                    value={candidate.detailAddress || ''}
                    onChange={(e) => onChange({ ...candidate, detailAddress: e.target.value })}
                    placeholder="예: 지상 1층 101호 (하단 건축물대장 호실 선택 시 자동입력)"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* 업종 (세무서 업종분류 기준: 검색 + 대/중/소분류) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      업종 (세무서 업종분류 기준) <span className="text-rose-500">*</span>
                    </label>
                    {candidate.taxIndustryCode && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        국세청 업종코드 {candidate.taxIndustryCode}
                      </span>
                    )}
                  </div>

                  {/* 업종 키워드 / 업종코드 직접 검색 */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={industrySearchQuery}
                      onFocus={() => setShowIndustryAutocomplete(true)}
                      onBlur={() => setTimeout(() => setShowIndustryAutocomplete(false), 180)}
                      onChange={(e) => {
                        setIndustrySearchQuery(e.target.value);
                        setShowIndustryAutocomplete(true);
                      }}
                      placeholder="예: 카페, 한식, 국밥, 미용실, 편의점, 552301"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    />
                    {industryMatches.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {industryMatches.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectTaxIndustryItem(item);
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">{item.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {item.major} &gt; {item.medium}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 flex-shrink-0">
                              {item.taxCode}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 px-0.5">
                    직접 입력하여 검색하거나 목록에서 선택하세요. (세무서 사업자등록 업태·종목 기준)
                  </div>

                  {/* 업종 목록에서 선택 (대분류 → 중분류 → 세부 업종(소분류)) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setShowIndustryHierarchy((prev) => !prev)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${showIndustryHierarchy ? '' : '-rotate-90'}`}
                      />
                      업종 목록에서 선택
                    </button>

                    {showIndustryHierarchy && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <select
                            value={selectedTaxMajor}
                            onChange={(e) => {
                              setSelectedTaxMajor(e.target.value);
                              setSelectedTaxMedium('');
                              setSelectedTaxItemId('');
                            }}
                            aria-label="대분류 선택"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="">대분류 선택</option>
                            {TAX_MAJOR_CATEGORIES.map((major) => (
                              <option key={major} value={major}>
                                {major}
                              </option>
                            ))}
                          </select>

                          <select
                            value={selectedTaxMedium}
                            onChange={(e) => {
                              setSelectedTaxMedium(e.target.value);
                              setSelectedTaxItemId('');
                            }}
                            disabled={!selectedTaxMajor}
                            aria-label="중분류 선택"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white disabled:bg-slate-100 disabled:text-slate-400 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="">중분류 선택</option>
                            {mediumList.map((med) => (
                              <option key={med} value={med}>
                                {med}
                              </option>
                            ))}
                          </select>
                        </div>

                        <select
                          value={selectedTaxItemId}
                          onChange={(e) => {
                            const found = subList.find((item) => item.id === e.target.value);
                            if (found) handleSelectTaxIndustryItem(found);
                          }}
                          disabled={!selectedTaxMedium}
                          aria-label="실제 운영할 세부 업종 선택"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white disabled:bg-slate-100 disabled:text-slate-400 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">실제 운영할 세부 업종 선택</option>
                          {subList.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} (코드 {item.taxCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-[11px] text-blue-900 space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>
                        선택 업종: {candidate.businessName}
                        {selectedTaxItem ? ` (${selectedTaxItem.major} > ${selectedTaxItem.medium} · ${selectedTaxItem.taxCode})` : ''}
                      </span>
                    </div>
                    <div className="text-blue-700 pl-5">
                      권장 건축법상 용도:{' '}
                      {selectedTaxItem?.buildingUseNote || BUSINESS_REQUIRED_BUILDING_USE[candidate.businessType]}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: 국토교통부 국토지리정보원 영상지도 · 배경지도 API 후보지 지도 뷰 */}
              <div className="lg:col-span-6 flex flex-col">
                <NgiiCandidateMap
                  address={candidate.address}
                  jibunAddress={candidate.parcelInfo?.jibunAddress}
                  buildingName={buildingTitle?.buildingName || candidate.parcelInfo?.buildingName}
                  candidateName={candidate.name}
                />
              </div>
            </div>
          );
        })()}

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

      {/* 2. Building Space & Auto-Detected Regulatory Condition */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          2. 공간 규격 및 대장·인허가 환경 (주소 기반 자동 판정)
        </h3>

        {/* Building Register Unit (호실) Lookup & Selector Panel */}
        {(() => {
          const combinedUnits: BuildingUnitOption[] = [...apiUnits, ...(candidate.manualUnits || [])];
          const filteredUnits = unitFilter.trim()
            ? combinedUnits.filter((u) =>
                `${u.dongNm || ''} ${u.floorLabel} ${u.hoNm} ${u.mainPurpose} ${u.etcPurpose || ''}`
                  .toLowerCase()
                  .includes(unitFilter.trim().toLowerCase())
              )
            : combinedUnits;

          return (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      위치 연동 건축물대장 · 호실(전유부) 선택
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {candidate.parcelInfo?.jibunAddress
                      ? `연동 지번: ${candidate.parcelInfo.jibunAddress}`
                      : '주소 검색 또는 지번 입력 후 [건축물대장 호실 불러오기]를 누르면 호실별 전용면적·층수·용도·용도지역이 자동 연동됩니다.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      fetchBuildingRegisterUnits(
                        candidate.address,
                        candidate.parcelInfo?.jibunAddress,
                        candidate.parcelInfo?.bcode
                      )
                    }
                    disabled={isLoadingUnits || !candidate.address}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                  >
                    {isLoadingUnits ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        대장 조회 중...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        건축물대장 호실 불러오기
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setManualZoning(candidate.zoning);
                      setShowManualUnitForm(!showManualUnitForm);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    확인 호실 직접 등록
                  </button>
                </div>
              </div>

              {/* Building Title Summary from Official Register */}
              {buildingTitle && (
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs space-y-2 tabular-nums">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {buildingTitle.buildingName || '표제부 건축물'} · {buildingTitle.regstrKind || '건축물대장'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        주용도: {buildingTitle.mainPurpose || '-'} · 지하 {buildingTitle.undergroundFloors}층 / 지상 {buildingTitle.groundFloors}층 · 연면적 {buildingTitle.totalAreaSqm.toLocaleString()}㎡
                        {buildingTitle.approvalDate ? ` · 사용승인 ${buildingTitle.approvalDate}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(buildingTitle.zoning || buildingTitle.rawZoningName) && (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          용도지역: {buildingTitle.rawZoningName || buildingTitle.zoning}
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        buildingTitle.hasViolation
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {buildingTitle.hasViolation ? '위반건축물 표기 감지' : '대장상 위반 표기 없음'}
                      </span>
                    </div>
                  </div>
                  {buildingTitle.jijiguZones && buildingTitle.jijiguZones.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-[10px]">
                      <span className="font-bold text-slate-500">지역·지구·구역:</span>
                      {buildingTitle.jijiguZones.map((z, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {z}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Status Notice (Missing Key / Missing Parcel Code / Empty) */}
              {unitStatusMessage && (
                <div className="p-3 rounded-xl bg-white border border-amber-200 text-xs text-slate-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{unitStatusMessage}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pl-6 text-[11px]">
                    {unitStatusCode === 'PARCEL_CODE_REQUIRED' && (
                      <button
                        type="button"
                        onClick={() => setIsAddressModalOpen(true)}
                        className="font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        우편번호 주소 검색 열기 ➔
                      </button>
                    )}
                    <a
                      href="https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000026"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                    >
                      정부24 건축물대장 열람
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://www.eum.go.kr/web/am/amMain.jsp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:underline"
                    >
                      토지e음 용도지역 조회
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {unitStatusCode === 'API_KEY_MISSING' && (
                      <a
                        href="https://www.data.go.kr/data/15134735/openapi.do"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-slate-600 hover:underline"
                      >
                        공공데이터포털 건축HUB API 신청
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <a
                      href="https://cloud.eais.go.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                    >
                      세움터 건축HUB 조회
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Manual Inspected Unit Quick Adder */}
              {showManualUnitForm && (
                <div className="p-3.5 rounded-xl bg-white border border-indigo-200 space-y-3 text-xs">
                  <div className="font-bold text-slate-900">
                    정부24·세움터에서 확인한 호실 정보 추가 (비교 선택용)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">호실명</label>
                      <input
                        type="text"
                        value={manualHo}
                        onChange={(e) => setManualHo(e.target.value)}
                        placeholder="예: 101호"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">층수 (지하는 음수)</label>
                      <input
                        type="number"
                        value={manualFloor}
                        onChange={(e) => setManualFloor(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">전용면적 (㎡)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={manualArea}
                        onChange={(e) => setManualArea(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">대장상 용도</label>
                      <select
                        value={manualUse}
                        onChange={(e) => setManualUse(e.target.value as BuildingUseType)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        {BUILDING_USES.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">용도지역</label>
                      <select
                        value={manualZoning}
                        onChange={(e) => setManualZoning(e.target.value as ZoningType)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        {ZONINGS.map((z) => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualUnitForm(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 font-semibold text-xs"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleAddManualUnit}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer"
                    >
                      목록에 추가 및 적용
                    </button>
                  </div>
                </div>
              )}

              {/* Unit Selector List (API units + Manual checked units) */}
              {combinedUnits.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700">
                      선택 가능한 호실 ({filteredUnits.length}개) — 클릭 시 상세호실·전용면적·층수·용도·용도지역이 자동 입력됩니다
                    </span>
                    {combinedUnits.length > 6 && (
                      <input
                        type="text"
                        value={unitFilter}
                        onChange={(e) => setUnitFilter(e.target.value)}
                        placeholder="호수·층·용도 검색 (예: 101호, 1층)"
                        className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white w-full sm:w-52"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                    {filteredUnits.map((unit) => {
                      const isSelected = candidate.selectedUnitId === unit.id;
                      const pyeong = (unit.exclusiveAreaSqm * 0.3025).toFixed(1);
                      return (
                        <div
                          key={unit.id}
                          className={`p-2.5 rounded-xl border text-xs transition-all flex items-start justify-between gap-2 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                              : 'bg-white border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectBuildingUnit(unit)}
                            className="text-left flex-1 min-w-0 space-y-0.5 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-900 truncate">
                                {unit.dongNm ? `${unit.dongNm} ` : ''}{unit.floorLabel} {unit.hoNm}
                              </strong>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                            </div>
                            <div className="text-[11px] font-semibold text-blue-700 tabular-nums">
                              전용 {unit.exclusiveAreaSqm}㎡ (약 {pyeong}평)
                              {unit.commonAreaSqm ? ` · 공용 ${unit.commonAreaSqm}㎡` : ''}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {unit.etcPurpose || unit.mainPurpose}
                              {unit.zoning ? ` · ${unit.zoning}` : ''} ({unit.source === 'api' ? '대장연동' : '직접등록'})
                            </div>
                          </button>

                          {unit.source === 'manual' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveManualUnit(unit.id)}
                              title="목록에서 삭제"
                              className="p-1 text-slate-400 hover:text-rose-600 flex-shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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

                <a
                  href={EEIS_GIS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCopyEeisAddress}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all flex-shrink-0 cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5" />
                  교육환경 GIS 지도에서 주소 확인
                  <ExternalLink className="w-3 h-3" />
                </a>
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
                  onClick={handleCopyEeisAddress}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  GIS 시스템 직접열기 (주소 자동복사)
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

        {/* Lease Cash Burden Summary (PropScope Enhancement) */}
        {(() => {
          const monthlyTotal = (candidate.monthlyRent || 0) + (candidate.maintenanceFee || 0);
          const annualTotal = monthlyTotal * 12;
          const areaPyeong = candidate.areaSqm > 0 ? candidate.areaSqm * 0.3025 : 0;
          const rentPerPyeong = areaPyeong > 0 ? monthlyTotal / areaPyeong : 0;
          const initialLeaseCash = (candidate.deposit || 0) + (candidate.premium || 0);
          return (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-200">
                  입력 임대조건의 현금 부담 정리
                </span>
                <span className="text-[11px] text-slate-400">
                  부가세·공과금·영업비용 제외 단순 임차 부담 합계
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">월 고정 임차료 (월세+관리비)</span>
                  <strong className="text-base font-bold text-white mt-0.5 block">
                    {monthlyTotal.toLocaleString()}만원
                  </strong>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">연간 월세·관리비 합계</span>
                  <strong className="text-base font-bold text-amber-300 mt-0.5 block">
                    {annualTotal.toLocaleString()}만원
                  </strong>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">평당 임차료 ({areaPyeong.toFixed(1)}평 기준)</span>
                  <strong className="text-base font-bold text-blue-300 mt-0.5 block">
                    {rentPerPyeong.toFixed(1)}만원/평
                  </strong>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">계약 시 보증금+권리금</span>
                  <strong className="text-base font-bold text-emerald-300 mt-0.5 block">
                    {initialLeaseCash.toLocaleString()}만원
                  </strong>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Same-Building & 30m Radius Real Estate Portal Search & Lease Reference */}
        {(() => {
          const portalQuery = buildPropertyPortalQuery(
            candidate.address,
            candidate.parcelInfo?.jibunAddress,
            buildingTitle?.buildingName || candidate.parcelInfo?.buildingName
          );
          const hasAddress = Boolean(candidate.address.trim());
          const matchedRegion = matchRegionFromAddressString(candidate.address);
          const regionQueryCore = [matchedRegion.sigungu, matchedRegion.dong]
            .filter(Boolean)
            .join(' ')
            .trim();
          const shortNaverQuery = regionQueryCore
            ? `${regionQueryCore} 상가 임대`
            : portalQuery.shortKeyword
            ? `${portalQuery.shortKeyword} 상가 임대`
            : '상가 임대 월세';
          const portalCards = [
            {
              id: 'naver-land',
              name: '네이버페이 부동산 (상가 지도)',
              badge: '지도·매물 1순위',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              url: 'https://land.naver.com',
              copyText: portalQuery.cleanRoad || portalQuery.cleanJibun || candidate.address,
              hint: '열린 네이버 부동산 상단 검색창에 복사된 주소를 붙여넣고(Ctrl+V) [상가·업무] 탭에서 반경 30m 매물 확인',
            },
            {
              id: 'naver-web-listings',
              name: '네이버 상가매물 통합검색',
              badge: '호실·권리금 검색',
              badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
              url: `https://search.naver.com/search.naver?where=nexearch&sm=top_hty&ie=utf8&query=${encodeURIComponent(shortNaverQuery)}`,
              copyText: portalQuery.cleanRoad || portalQuery.cleanJibun || candidate.address,
              hint: '해당 동·상권의 상가 임대 위젯 및 보증금·월세·관리비·권리금 중개사 매물 글을 바로 조회',
            },
            {
              id: 'nemo',
              name: '네모 (NEMO) 상가·점포',
              badge: '권리금·월세 특화',
              badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
              url: 'https://www.nemoapp.kr/store',
              copyText: portalQuery.shortKeyword || portalQuery.cleanRoad || candidate.address,
              hint: '네모 상가 지도 검색창에 복사된 지역·주소(Ctrl+V)를 입력해 인접 30m 점포 권리금·월세·관리비 확인',
            },
            {
              id: 'zigbang',
              name: '직방 상가·점포 시세',
              badge: '시세 교차검증',
              badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
              url: 'https://www.zigbang.com',
              copyText: portalQuery.cleanRoad || portalQuery.cleanJibun || candidate.address,
              hint: '직방 상단 검색창에 복사된 주소(Ctrl+V)를 붙여넣어 동일·인접 건물 임대 매물 교차 확인',
            },
          ];

          const myMonthlyFixed = (candidate.monthlyRent || 0) + (candidate.maintenanceFee || 0);
          const myAreaPyeong = candidate.areaSqm > 0 ? candidate.areaSqm * 0.3025 : 0;
          const myRentPerPyeong = myAreaPyeong > 0 ? myMonthlyFixed / myAreaPyeong : 0;
          const myInitialCash = (candidate.deposit || 0) + (candidate.premium || 0);

          const hasCompareInput = Boolean(
            compareListing.deposit !== '' ||
              compareListing.monthlyRent !== '' ||
              compareListing.maintenanceFee !== '' ||
              compareListing.premium !== ''
          );
          const cmpDeposit = parseFloat(compareListing.deposit) || 0;
          const cmpRent = parseFloat(compareListing.monthlyRent) || 0;
          const cmpMaint = parseFloat(compareListing.maintenanceFee) || 0;
          const cmpPremium = parseFloat(compareListing.premium) || 0;
          const cmpAreaSqm = parseFloat(compareListing.areaSqm) || candidate.areaSqm || 0;
          const cmpAreaPyeong = cmpAreaSqm > 0 ? cmpAreaSqm * 0.3025 : 0;
          const cmpMonthlyFixed = cmpRent + cmpMaint;
          const cmpRentPerPyeong = cmpAreaPyeong > 0 ? cmpMonthlyFixed / cmpAreaPyeong : 0;
          const cmpInitialCash = cmpDeposit + cmpPremium;

          const monthlyDiff = myMonthlyFixed - cmpMonthlyFixed;
          const perPyeongDiff = myRentPerPyeong - cmpRentPerPyeong;
          const initialCashDiff = myInitialCash - cmpInitialCash;

          return (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
              {/* Header & Address Copy Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      동일 건물 · 반경 30m 이내 임대 사례 참고 (매물 사이트 검색)
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      네이버 부동산 · 네모 · 직방 연동
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    후보지 건물 또는 반경 30m 이내 상가의 실제 <strong>임차보증금·임대료·관리비·권리금</strong> 매물을 검색해 현재 계약 조건이 적정한지 바로 비교하세요.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSearchNearbyListings}
                  disabled={isSearchingNearby || !hasAddress}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold shadow-xs transition-colors flex-shrink-0 cursor-pointer"
                >
                  {isSearchingNearby ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      웹 매물 사례 조회 중...
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5 text-emerald-400" />
                      30m 이내 매물 사례 웹 검색
                    </>
                  )}
                </button>
              </div>

              {/* Search Keyword Quick-Copy Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="text-slate-500 font-semibold flex-shrink-0">매물 검색 기준 위치:</span>
                  <span className="font-mono font-bold text-slate-800 truncate">
                    {portalQuery.fullCopyText || '상단에서 후보지 주소를 먼저 입력하세요'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    disabled={!hasAddress}
                    onClick={() => handleCopyPortalAddress(portalQuery.fullCopyText)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    주소 복사
                  </button>
                  <a
                    href="https://rt.molit.go.kr"
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    onClick={() => handleCopyPortalAddress(portalQuery.cleanJibun || portalQuery.cleanRoad || candidate.address, '국토부 실거래가')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] transition-colors"
                  >
                    국토부 실거래가
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {nearbyCopyNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{nearbyCopyNotice}</span>
                </div>
              )}

              {/* Direct Real-Estate Portal Search Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {portalCards.map((portal) => (
                  <a
                    key={portal.id}
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    onClick={() => handleCopyPortalAddress(portal.copyText, portal.name)}
                    className="group flex flex-col justify-between p-3 rounded-xl bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-400 transition-all shadow-2xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${portal.badgeColor}`}>
                          {portal.badge}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 flex-shrink-0" />
                      </div>
                      <div className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-800">
                        {portal.name}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {portal.hint}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-bold text-emerald-700 flex items-center justify-between">
                      <span>클릭 시 주소 자동 복사 & 이동</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </a>
                ))}
              </div>

              {/* Web Search Grounded Results Error or Display */}
              {nearbySearchError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold">웹 매물 사례 자동 조회 안내</div>
                    <div className="text-[11px] leading-relaxed">{nearbySearchError}</div>
                  </div>
                </div>
              )}

              {nearbySearchResult && (
                <div className="rounded-xl bg-white border border-emerald-200 p-4 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      검색 기반 동일 건물 · 30m 이내 인근 임대 사례 요약
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      공개 웹 색인 기반 참고자료 · 실제 계약 시 중개사·임대인 확인 필수
                    </span>
                  </div>

                  {nearbySearchResult.data.searchScopeNote && (
                    <p className="text-xs text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 leading-relaxed">
                      {nearbySearchResult.data.searchScopeNote}
                    </p>
                  )}

                  {nearbySearchResult.data.listings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {nearbySearchResult.data.listings.map((item, idx) => {
                        const parsedDep = extractManwonNumber(item.depositManwon);
                        const parsedRent = extractManwonNumber(item.monthlyRentManwon);
                        const parsedMaint = extractManwonNumber(item.maintenanceFeeManwon);
                        const parsedPrem = extractManwonNumber(item.premiumManwon);
                        const parsedSqm = extractSqmNumber(item.areaText);
                        const canFillCompare = Boolean(parsedDep || parsedRent);

                        return (
                          <div
                            key={`${item.locationHint}-${idx}`}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                  {item.scopeLabel || '인근 매물'}
                                </span>
                                <div className="font-extrabold text-slate-900 pt-0.5">
                                  {item.locationHint}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {[item.floor, item.areaText, item.sourceName].filter(Boolean).join(' · ')}
                                </div>
                              </div>
                              {canFillCompare && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCompareListing({
                                      label: item.locationHint || item.scopeLabel,
                                      deposit: parsedDep,
                                      monthlyRent: parsedRent,
                                      maintenanceFee: parsedMaint,
                                      premium: parsedPrem,
                                      areaSqm: parsedSqm || String(candidate.areaSqm || ''),
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex-shrink-0 transition-colors cursor-pointer"
                                >
                                  내 조건과 비교
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] tabular-nums">
                              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-400 block">보증금</span>
                                <strong className="text-slate-900 font-bold">{item.depositManwon || '-'}</strong>
                              </div>
                              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-400 block">월세</span>
                                <strong className="text-rose-700 font-bold">{item.monthlyRentManwon || '-'}</strong>
                              </div>
                              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-400 block">관리비</span>
                                <strong className="text-slate-800 font-bold">{item.maintenanceFeeManwon || '-'}</strong>
                              </div>
                              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                                <span className="text-[10px] text-slate-400 block">권리금</span>
                                <strong className="text-amber-700 font-bold">{item.premiumManwon || '-'}</strong>
                              </div>
                            </div>

                            {item.note && (
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                {item.note}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200">
                      해당 주소의 공개 웹 색인에서 호실별 보증금·월세 수치가 직접 포함된 개별 매물 글은 확인되지 않았습니다. 상단의 <strong>네이버 부동산 / 네모 / 직방</strong> 바로가기로 지도 위 인접 30m 매물을 직접 열어 확인해주세요.
                    </div>
                  )}

                  {nearbySearchResult.data.neighborhoodBenchmark && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] pt-1">
                      {nearbySearchResult.data.neighborhoodBenchmark.depositRange && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 block">인근 참고 보증금</span>
                          <span className="font-semibold text-slate-800">
                            {nearbySearchResult.data.neighborhoodBenchmark.depositRange}
                          </span>
                        </div>
                      )}
                      {nearbySearchResult.data.neighborhoodBenchmark.rentRange && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 block">인근 참고 월세·시세</span>
                          <span className="font-semibold text-slate-800">
                            {nearbySearchResult.data.neighborhoodBenchmark.rentRange}
                          </span>
                        </div>
                      )}
                      {nearbySearchResult.data.neighborhoodBenchmark.maintenanceNote && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 block">관리비 참고</span>
                          <span className="font-semibold text-slate-800">
                            {nearbySearchResult.data.neighborhoodBenchmark.maintenanceNote}
                          </span>
                        </div>
                      )}
                      {nearbySearchResult.data.neighborhoodBenchmark.premiumNote && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 block">권리금 형성 참고</span>
                          <span className="font-semibold text-slate-800">
                            {nearbySearchResult.data.neighborhoodBenchmark.premiumNote}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {nearbySearchResult.data.searchTips && nearbySearchResult.data.searchTips.length > 0 && (
                    <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                      {nearbySearchResult.data.searchTips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  )}

                  {nearbySearchResult.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-600 block">
                        웹 검색 참고 출처 ({nearbySearchResult.sources.length}건)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {nearbySearchResult.sources.map((src, i) => (
                          <a
                            key={`${src.uri}-${i}`}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[11px] font-medium max-w-xs truncate"
                          >
                            <span className="truncate">{src.title}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Direct Real Estate Listing Comparison Calculator */}
              <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                    <Scale className="w-4 h-4 text-blue-600" />
                    매물 사이트 확인 사례 vs 내 후보지 직접 비교하기
                  </div>
                  {hasCompareInput && (
                    <button
                      type="button"
                      onClick={() =>
                        setCompareListing({
                          label: '',
                          deposit: '',
                          monthlyRent: '',
                          maintenanceFee: '',
                          premium: '',
                          areaSqm: '',
                        })
                      }
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      비교 입력 초기화
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  네이버 부동산·네모 등에서 찾은 동일 건물이나 30m 이내 비교 매물의 조건을 입력하면 현재 검토 조건과 차이를 즉시 계산합니다.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">비교 매물 메모</label>
                    <input
                      type="text"
                      value={compareListing.label}
                      onChange={(e) => setCompareListing({ ...compareListing, label: e.target.value })}
                      placeholder="예: 옆건물 1층 15평"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">보증금 (만원)</label>
                    <input
                      type="number"
                      step="100"
                      value={compareListing.deposit}
                      onChange={(e) => setCompareListing({ ...compareListing, deposit: e.target.value })}
                      placeholder="예: 5000"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">월세 (만원)</label>
                    <input
                      type="number"
                      step="10"
                      value={compareListing.monthlyRent}
                      onChange={(e) => setCompareListing({ ...compareListing, monthlyRent: e.target.value })}
                      placeholder="예: 300"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">관리비 (만원)</label>
                    <input
                      type="number"
                      step="5"
                      value={compareListing.maintenanceFee}
                      onChange={(e) => setCompareListing({ ...compareListing, maintenanceFee: e.target.value })}
                      placeholder="예: 25"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">권리금 (만원)</label>
                    <input
                      type="number"
                      step="100"
                      value={compareListing.premium}
                      onChange={(e) => setCompareListing({ ...compareListing, premium: e.target.value })}
                      placeholder="예: 3000"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">전용면적 (㎡)</label>
                    <input
                      type="number"
                      step="1"
                      value={compareListing.areaSqm}
                      onChange={(e) => setCompareListing({ ...compareListing, areaSqm: e.target.value })}
                      placeholder={candidate.areaSqm ? `${candidate.areaSqm}` : '예: 49.5'}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                    />
                  </div>
                </div>

                {hasCompareInput && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs tabular-nums">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          월 고정 임차료 비교{compareListing.label ? ` (${compareListing.label})` : ''}
                        </span>
                        <span className="font-bold text-slate-800">
                          내 조건 {myMonthlyFixed.toLocaleString()}만 vs 사례 {cmpMonthlyFixed.toLocaleString()}만
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${
                          monthlyDiff > 0
                            ? 'bg-rose-100 text-rose-700'
                            : monthlyDiff < 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {monthlyDiff > 0
                          ? `+${monthlyDiff.toLocaleString()}만 비쌈`
                          : monthlyDiff < 0
                          ? `${Math.abs(monthlyDiff).toLocaleString()}만 저렴`
                          : '동일'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          평당 월 임차료 비교 ({cmpAreaPyeong.toFixed(1)}평 기준)
                        </span>
                        <span className="font-bold text-slate-800">
                          내 조건 {myRentPerPyeong.toFixed(1)}만 vs 사례 {cmpRentPerPyeong.toFixed(1)}만
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${
                          perPyeongDiff > 0.2
                            ? 'bg-rose-100 text-rose-700'
                            : perPyeongDiff < -0.2
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {perPyeongDiff > 0.2
                          ? `+${perPyeongDiff.toFixed(1)}만/평`
                          : perPyeongDiff < -0.2
                          ? `${perPyeongDiff.toFixed(1)}만/평`
                          : '유사'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">초기 현금 (보증금+권리금)</span>
                        <span className="font-bold text-slate-800">
                          내 조건 {myInitialCash.toLocaleString()}만 vs 사례 {cmpInitialCash.toLocaleString()}만
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${
                          initialCashDiff > 0
                            ? 'bg-rose-100 text-rose-700'
                            : initialCashDiff < 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {initialCashDiff > 0
                          ? `+${initialCashDiff.toLocaleString()}만 부담`
                          : initialCashDiff < 0
                          ? `${Math.abs(initialCashDiff).toLocaleString()}만 절감`
                          : '동일'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
