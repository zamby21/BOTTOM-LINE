import { RegionConversionType } from '../types/decision';
import { CONVERSION_DEPOSIT_LIMITS } from './engine';

export interface DetectedRegionResult {
  regionCode: RegionConversionType;
  regionLabel: string;
  limitWon: number; // 만원 단위 (e.g. 90000)
  detectedDistrict: string;
  legalCategoryName: string;
  explanation: string;
}

// 수도권 과밀억제권역 시 목록 (상가건물 임대차보호법 시행령 제2조 제1항 제2호 및 수도권정비계획법 시행령 별표1)
const OVERCROWDED_CITIES = [
  '인천',
  '수원',
  '성남',
  '안양',
  '부천',
  '광명',
  '과천',
  '의왕',
  '군포',
  '시흥',
  '고양',
  '구리',
  '남양주',
  '하남',
  '의정부',
];

// 광역시(부산 제외), 세종, 및 파주·화성·안산·용인·김포·경기광주 (동법 시행령 제2조 제1항 제3호)
const METROPOLITAN_OR_SPECIFIC_CITIES = [
  '대구',
  '대전',
  '울산',
  '세종',
  '파주',
  '화성',
  '안산',
  '용인',
  '김포',
];

/**
 * 주소 텍스트(도로명 또는 지번)를 분석하여 상가임대차보호법상 지역 환산보증금 기준을 자동 판정
 */
export function detectRegionFromAddress(address: string): DetectedRegionResult {
  const trimmed = address.trim();

  // 1. 서울특별시 (9억원 이하)
  if (trimmed.includes('서울') || trimmed.includes('서울특별시')) {
    const limit = CONVERSION_DEPOSIT_LIMITS.seoul.limit;
    return {
      regionCode: 'seoul',
      regionLabel: '서울특별시',
      limitWon: limit,
      detectedDistrict: '서울특별시',
      legalCategoryName: '서울특별시 (1호)',
      explanation: '서울특별시 전역은 환산보증금 상한 9억원 기준이 적용됩니다.',
    };
  }

  // 2. 부산광역시 (6.9억원 이하)
  if (trimmed.includes('부산') || trimmed.includes('부산광역시')) {
    const limit = CONVERSION_DEPOSIT_LIMITS.overcrowded_busan.limit;
    return {
      regionCode: 'overcrowded_busan',
      regionLabel: '부산광역시',
      limitWon: limit,
      detectedDistrict: '부산광역시',
      legalCategoryName: '수도권 과밀억제권역 및 부산광역시 (2호)',
      explanation: '부산광역시는 환산보증금 상한 6억 9천만원 기준이 적용됩니다.',
    };
  }

  // 3. 수도권 과밀억제권역 (6.9억원 이하)
  for (const city of OVERCROWDED_CITIES) {
    if (trimmed.includes(city)) {
      const limit = CONVERSION_DEPOSIT_LIMITS.overcrowded_busan.limit;
      return {
        regionCode: 'overcrowded_busan',
        regionLabel: `과밀억제권역 (${city})`,
        limitWon: limit,
        detectedDistrict: city,
        legalCategoryName: '수도권 과밀억제권역 및 부산광역시 (2호)',
        explanation: `${city}시는 수도권정비계획법상 과밀억제권역으로 환산보증금 상한 6억 9천만원이 적용됩니다.`,
      };
    }
  }

  // 4. 경기도 광주시 (경기 광주 vs 광주광역시 구분)
  if (trimmed.includes('경기') && trimmed.includes('광주')) {
    const limit = CONVERSION_DEPOSIT_LIMITS.metropolitan.limit;
    return {
      regionCode: 'metropolitan',
      regionLabel: '경기도 광주시',
      limitWon: limit,
      detectedDistrict: '광주시(경기)',
      legalCategoryName: '광역시 등 주요시 (3호)',
      explanation: '경기도 광주시는 환산보증금 상한 5억 4천만원 기준이 적용됩니다.',
    };
  }

  // 광주광역시
  if (trimmed.includes('광주광역시') || (trimmed.includes('광주') && !trimmed.includes('경기'))) {
    const limit = CONVERSION_DEPOSIT_LIMITS.metropolitan.limit;
    return {
      regionCode: 'metropolitan',
      regionLabel: '광주광역시',
      limitWon: limit,
      detectedDistrict: '광주광역시',
      legalCategoryName: '광역시 등 주요시 (3호)',
      explanation: '광주광역시는 환산보증금 상한 5억 4천만원 기준이 적용됩니다.',
    };
  }

  // 5. 기타 광역시 및 특정 시 (5.4억원 이하)
  for (const city of METROPOLITAN_OR_SPECIFIC_CITIES) {
    if (trimmed.includes(city)) {
      const limit = CONVERSION_DEPOSIT_LIMITS.metropolitan.limit;
      return {
        regionCode: 'metropolitan',
        regionLabel: `${city}시`,
        limitWon: limit,
        detectedDistrict: city,
        legalCategoryName: '광역시·세종·특정시 (3호)',
        explanation: `${city}는 상가임대차보호법 시행령 제2조 제1항 제3호에 따라 환산보증금 상한 5억 4천만원이 적용됩니다.`,
      };
    }
  }

  // 6. 그 밖의 지역 (3.7억원 이하)
  const limit = CONVERSION_DEPOSIT_LIMITS.other.limit;
  return {
    regionCode: 'other',
    regionLabel: '그 밖의 지역',
    limitWon: limit,
    detectedDistrict: '기타 시·군',
    legalCategoryName: '그 밖의 지역 (4호)',
    explanation: '그 밖의 지역(지방 시·군 및 기준 외 지역)은 환산보증금 상한 3억 7천만원 기준이 적용됩니다.',
  };
}
