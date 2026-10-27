import { SchoolZoneType } from '../types/decision';

export interface RegulatoryPrediction {
  predictedSchoolZone: SchoolZoneType;
  schoolZoneRationale: string;
  hasViolationSuspected: boolean;
  violationRiskLevel: 'low' | 'medium' | 'high';
  violationRationale: string;
}

export interface VerificationPortal {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  url: string;
  description: string;
  howToCheck: string;
}

export const EEIS_GIS_URL = 'https://eeis.schoolkeepa.or.kr/gis/gis.do';

export const VERIFICATION_PORTALS: VerificationPortal[] = [
  {
    id: 'gov24_building_register',
    name: '정부24 건축물대장 (무료 열람/발급)',
    badge: '필수 확인 1순위',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    url: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000026',
    description: '건축물대장 표제부 및 전유부를 공인인증서 없이 즉시 무료 열람할 수 있습니다.',
    howToCheck: '발급문서 1페이지 우측 상단에 노란색 바탕 검정 글씨로 [위반건축물] 표시가 찍혀있는지 확인하세요.',
  },
  {
    id: 'schoolzone_edumac',
    name: '교육환경정보시스템 GIS 지도조회 (학교정화구역)',
    badge: '교육부 공식 GIS',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    url: EEIS_GIS_URL,
    description: '전국 초·중·고교 및 유치원의 50m(절대) / 200m(상대) 보호구역 반경 지도를 시각적으로 제공합니다.',
    howToCheck: '지도에서 후보지 주소를 검색창에 붙여넣어(Ctrl+V) 조회하면 절대보호구역(50m, 적색)/상대보호구역(200m, 청색) 중첩 여부를 실시간으로 확인할 수 있습니다.',
  },
  {
    id: 'eum_land_use',
    name: '토지e음 (교육환경보호구역 & 용도지역)',
    badge: '정부 공식 포털',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    url: 'https://www.eum.go.kr/web/am/amMain.jsp',
    description: '주소 입력만으로 토지이용계획 및 행위제한 규제(교육환경, 용도지역)를 실시간 조회합니다.',
    howToCheck: '조회 결과의 [다른 법령 등에 따른 지역·지구 등]란에 "교육환경보호구역(절대/상대)"이 등재되어 있는지 확인하세요.',
  },
  {
    id: 'eais_seumter',
    name: '세움터 건축행정시스템 (건축HUB)',
    badge: '국토교통부',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    url: 'https://cloud.eais.go.kr',
    description: '호실별 허가 도면, 정화조 용량, 동일 시설군 내 기재변경 이력 등을 정밀 검토할 수 있습니다.',
    howToCheck: '건축물 현황도 및 오수정화조 용량을 조회하여 음식점 신규 허가에 정화조 용량이 충분한지 대조하세요.',
  },
];

/**
 * 업종별 교육환경보호구역 법률(제9조) 저촉 여부 판정
 */
export function checkBusinessTypeSchoolZoneStatus(
  businessType: string,
  schoolZone: SchoolZoneType
): {
  isRestricted: boolean;
  status: 'safe' | 'caution' | 'prohibited';
  badgeText: string;
  badgeClass: string;
  rationale: string;
} {
  const isSensitiveType = businessType === 'pub' || businessType === 'entertainment';

  if (!isSensitiveType) {
    return {
      isRestricted: false,
      status: 'safe',
      badgeText: '✓ 입점 허용 (제한업종 비해당)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      rationale:
        '일반음식점, 카페, 제과점, 일반판매점 등은 교육환경보호구역 내에서도 법률상 제한을 받지 않고 정상 영업신고가 가능합니다.',
    };
  }

  // 주점 / 엔터테인먼트(노래방/PC방 등)
  if (schoolZone === 'absolute') {
    return {
      isRestricted: true,
      status: 'prohibited',
      badgeText: '🚫 절대보호구역 불허 (입점 불가)',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      rationale:
        '학교 출입문 50m 이내 절대보호구역으로 교육환경 보호에 관한 법률 제9조에 따라 유흥·단란·주점 및 노래연습장 영업이 원천 불허됩니다.',
    };
  }

  if (schoolZone === 'relative') {
    return {
      isRestricted: true,
      status: 'caution',
      badgeText: '⚠️ 상대보호구역 심의 대상',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      rationale:
        '학교 경계 200m 이내 상대보호구역으로, 관할 교육지원청 교육환경보호위원회의 사전 해제 심의 승인을 받아야만 인허가가 가능합니다.',
    };
  }

  return {
    isRestricted: false,
    status: 'safe',
    badgeText: '✓ 보호구역 밖 (정상 인허가 가능)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rationale:
      '학교 정화구역 반경(200m) 외곽에 위치하여 교육환경보호법상 행위 제한 없이 자유롭게 영업 등록이 가능합니다.',
  };
}

/**
 * 주소 텍스트 및 층수/업종 데이터를 기반으로 교육환경구역과 위반건축물 위험도를 1차 자동 추정
 */
export function predictRegulationsLocally(
  address: string,
  floor: number,
  businessType: string
): RegulatoryPrediction {
  const trimmed = address.trim();

  // 1. 교육환경보호구역 자동 판정
  let predictedSchoolZone: SchoolZoneType = 'none';
  let schoolZoneRationale = '상업·업무 밀집 지역으로 학교 정화구역 저촉 가능성이 낮습니다.';

  if (
    trimmed.includes('초등') ||
    trimmed.includes('중학') ||
    trimmed.includes('고등') ||
    trimmed.includes('학교') ||
    trimmed.includes('유치원') ||
    trimmed.includes('학원가')
  ) {
    if (trimmed.includes('정문') || trimmed.includes('출입문') || trimmed.includes('50m')) {
      predictedSchoolZone = 'absolute';
      schoolZoneRationale = '주소 주변에 학교 출입문 인접 키워드가 감지되어 절대보호구역(50m) 가능성이 높습니다.';
    } else {
      predictedSchoolZone = 'relative';
      schoolZoneRationale = '학교 및 유아교육기관 주변 상권으로 상대보호구역(200m) 심의 대상에 해당할 가능성이 높습니다.';
    }
  } else if (trimmed.includes('어울마당로') || trimmed.includes('서교동')) {
    // 홍대 주변 서교초 등 상대보호구역 저촉 사례 반영
    predictedSchoolZone = 'relative';
    schoolZoneRationale = '홍대 어울마당로 상권은 인근 초등학교(서교초 등) 반경 200m 상대보호구역 중첩 필지가 다수 존재합니다.';
  }

  // 2. 위반건축물 표기 위험도 자동 추정
  let hasViolationSuspected = false;
  let violationRiskLevel: 'low' | 'medium' | 'high' = 'low';
  let violationRationale = '일반 상업용 빌딩 내부 호실로 불법 증개축 위험도가 낮습니다.';

  if (
    trimmed.includes('루프탑') ||
    trimmed.includes('옥상') ||
    trimmed.includes('테라스') ||
    floor >= 4
  ) {
    if (trimmed.includes('어울마당로') || trimmed.includes('홍대')) {
      hasViolationSuspected = true;
      violationRiskLevel = 'high';
      violationRationale = '상층부 루프탑 및 무단 경량철골 테라스 증축 적발 사례가 많은 구역으로 위반건축물 등재 주의가 필요합니다.';
    } else {
      violationRiskLevel = 'medium';
      violationRationale = '상층부/테라스형 매물은 무단 샷시 또는 불법 차양 증축으로 인한 위반건축물 등재 이력을 반드시 정부24에서 확인해야 합니다.';
    }
  }

  return {
    predictedSchoolZone,
    schoolZoneRationale,
    hasViolationSuspected,
    violationRiskLevel,
    violationRationale,
  };
}
