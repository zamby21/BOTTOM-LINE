import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Generate comprehensive commercial real estate decision report
app.post('/api/gemini/report', async (req: Request, res: Response) => {
  try {
    const { candidate, metrics, riskResults, scoreBreakdown, verdict } = req.body;

    const prompt = `
당신은 대한민국 상업용 부동산 입점 심사 및 수익성 분석 분야 최고 권위의 부동산 컨설턴트이자 창업 전략가입니다.
아래 상업용 부동산 후보지("BOTTOM LINE" 시스템 분석 결과) 데이터를 검토하고, 예비 창업자 및 투자자를 위한 고품질 [입점 의사결정 종합 판정 리포트]를 작성해주세요.

### 후보지 기본 정보:
- 매물명: ${candidate.name}
- 주소: ${candidate.address} ${candidate.detailAddress || ''}
- 업종: ${candidate.businessName} (건축법상 용도: ${candidate.buildingUse})
- 층수/면적: ${candidate.floor}층 / ${candidate.areaSqm}㎡ (약 ${(candidate.areaSqm * 0.3025).toFixed(1)}평)
- 임대 조건: 보증금 ${(candidate.deposit).toLocaleString()}만원, 월세 ${(candidate.monthlyRent).toLocaleString()}만원, 관리비 ${(candidate.maintenanceFee).toLocaleString()}만원, 권리금 ${(candidate.premium).toLocaleString()}만원
- 환산보증금: ${(candidate.deposit + candidate.monthlyRent * 100).toLocaleString()}만원 (기준 초과 여부: ${riskResults.r6.exceeded ? '초과 (상가임대차보호법 차임증액상한 등 일부 배제)' : '보호 범위 내'})

### 재무 및 수익성 지표 (Bottom-Line):
- 월 매출(공급가액): ${Math.round(metrics.monthlyRevenue).toLocaleString()}만원 (${candidate.isVatIncluded ? '부가세 제외 환산' : '공급가액'})
- 변동비율: ${(metrics.variableCostRate * 100).toFixed(1)}% (원가율 ${(candidate.costOfGoodsRate)}% 포함)
- 월 고정비: ${Math.round(metrics.totalFixedCost).toLocaleString()}만원 (임대+관리비 ${Math.round(candidate.monthlyRent + candidate.maintenanceFee).toLocaleString()}만, 인건비 ${Math.round(metrics.laborCost).toLocaleString()}만, 감가상각 ${Math.round(metrics.monthlyDepreciation).toLocaleString()}만, 대표급여 ${candidate.ownerSalary}만)
- 월 순영업이익: ${Math.round(metrics.monthlyOperatingProfit).toLocaleString()}만원 (영업이익률: ${(metrics.operatingProfitMargin * 100).toFixed(1)}%)
- 손익분기점(BEP) 매출: ${Math.round(metrics.breakEvenRevenue).toLocaleString()}만원
- 안전여유율: ${(metrics.marginOfSafety * 100).toFixed(1)}%
- 임대료 부담률(임대+관리비/매출): ${(metrics.rentBurdenRate * 100).toFixed(1)}%
- 총 초기 투자금(보증금 별도): ${Math.round(metrics.initialInvestment).toLocaleString()}만원
- 원금 회수기간: ${metrics.paybackPeriodMonths === 999 ? '회수 불가(적자)' : metrics.paybackPeriodMonths.toFixed(1) + '개월'}
- 연 환산 투자수익률(ROI): ${(metrics.annualRoi * 100).toFixed(1)}%

### 6대 법률/행정 규제 심사 (Risk):
- R1 건축물 용도: ${riskResults.r1.statusText} (${riskResults.r1.detail})
- R2 위반건축물: ${riskResults.r2.statusText} (${riskResults.r2.detail})
- R3 용도지역: ${riskResults.r3.statusText} (${riskResults.r3.detail})
- R4 교육환경보호구역: ${riskResults.r4.statusText} (${riskResults.r4.detail})
- R5 다중이용업소: ${riskResults.r5.statusText} (${riskResults.r5.detail})
- R6 환산보증금: ${riskResults.r6.statusText} (${riskResults.r6.detail})

### 종합 평가 점수:
- 총점: ${scoreBreakdown.totalScore}점 / 100점
- 최종 판정: ${verdict.title} (${verdict.code}: ${verdict.summary})
- 배점 내역: 수익성 ${scoreBreakdown.profitScore}점(35만점), 회수기간 ${scoreBreakdown.paybackScore}점(20만점), 안전여유율 ${scoreBreakdown.safetyScore}점(20만점), 임대료부담률 ${scoreBreakdown.rentScore}점(10만점), 규제·임대차 ${scoreBreakdown.riskScore}점(15만점)

---
[작성 요청 형식]:
반드시 정돈된 Markdown 형식으로 다음 항목을 순서대로 명확하고 전문적인 어조로 작성해주세요:
1. 🎯 총평 및 최종 의사결정 제언 (한 줄 결론 및 판정 배경 요약)
2. 💡 재무 구조(Bottom-Line) 정밀 분석 (수익성, 회수 가능성, 임대료 감당 수준의 건전성 평가)
3. ⚠️ 핵심 리스크 및 법률/행정 규제 대응 전략 (R1~R6 지적 사항 및 관할 구청/보건소 사전 확인 체크리스트)
4. 🤝 임대인/양도인과의 실전 협상 포인트 (임대료 인하, 렌트프리 요구, 특약 조항 작성 팁)
5. 📋 실행 로드맵 & 단계별 조치 가이드
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: '당신은 상업용 부동산 및 프랜차이즈 가맹 창업 심사 전문 최고 수석 위원입니다. 뜬구름 잡는 조언 대신 제공된 재무 수치와 법률 규제 데이터를 근거로 구체적인 원인 분석과 협상 방안을 제시하십시오.',
        temperature: 0.7,
      },
    });

    res.json({
      success: true,
      report: response.text,
    });
  } catch (error: any) {
    console.error('Gemini report error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || '리포트 생성 중 오류가 발생했습니다.',
    });
  }
});

// Endpoint: AI revenue estimation helper
app.post('/api/gemini/estimate-revenue', async (req: Request, res: Response) => {
  try {
    const { address, businessType, areaSqm, floor } = req.body;

    const prompt = `
상권 데이터 분석가로서 다음 상가 매물의 예상 월 매출(공급가액 기준) 범위를 추정해주세요.
- 주소: ${address}
- 업종: ${businessType}
- 전용면적: ${areaSqm}㎡ (약 ${(areaSqm * 0.3025).toFixed(1)}평)
- 층수: ${floor}층

JSON 형식으로 응답해주세요:
{
  "minMonthlyRevenue": number (만원 단위 최솟값),
  "maxMonthlyRevenue": number (만원 단위 최댓값),
  "recommendedRevenue": number (만원 단위 권장 중앙값),
  "averageOrderValue": number (원 단위 추정 객단가),
  "dailyTransactions": number (일평균 예상 결제건수),
  "peakHours": string (주요 피크 시간대),
  "rationale": string (추정 근거 요약)
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Revenue estimation error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || '매출 추정 중 오류가 발생했습니다.',
    });
  }
});

// Endpoint: Quick AI advice
app.post('/api/gemini/quick-advice', async (req: Request, res: Response) => {
  try {
    const { question, candidateSummary } = req.body;
    const prompt = `
후보 매물 정보:
${JSON.stringify(candidateSummary, null, 2)}

사용자 질문:
${question}

상업용 부동산 전문 컨설턴트로서 핵심만 명쾌하고 실전적인 3~4문장으로 답변해주세요.
`;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.5,
      },
    });

    res.json({ success: true, answer: response.text });
  } catch (error: any) {
    console.error('Quick advice error:', error);
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Endpoint: Address-based Regulatory Screening (School zone & Violation risk)
app.post('/api/gemini/screen-address', async (req: Request, res: Response) => {
  try {
    const { address, businessType, floor, areaSqm } = req.body;

    const prompt = `
당신은 대한민국 상업용 부동산 행정 인허가 및 건축법·교육환경법 전문 행정사입니다.
다음 상가 매물 주소와 업종 정보를 분석하여:
1. 교육환경보호구역(절대보호구역 50m / 상대보호구역 200m / 비해당) 여부 추정
2. 건축물대장상 위반건축물(옥상 증축, 무단 테라스, 발코니 확장, 불법 증개축) 등재 위험도 및 판정 제언

매물 주소: ${address}
입점 업종: ${businessType}
층수: ${floor}층
면적: ${areaSqm}㎡

반드시 아래 JSON 스키마로만 응답하세요:
{
  "predictedSchoolZone": "none" | "relative" | "absolute",
  "schoolZoneRationale": string (1~2문장의 간결한 분석 근거),
  "violationRiskLevel": "low" | "medium" | "high",
  "predictedHasViolation": boolean,
  "violationRiskRationale": string (1~2문장의 간결한 분석 근거)
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Screen address error:', error);
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Endpoint: Regional Commercial Market & Rental Trend Briefing
app.post('/api/gemini/market-trends', async (req: Request, res: Response) => {
  try {
    const { address, businessName, rentPerPyeong, areaPyeong, monthlyRent } = req.body || {};

    if (!address || typeof address !== 'string' || !address.trim()) {
      res.status(400).json({
        success: false,
        error: '후보지 주소를 먼저 입력한 뒤 상권 분석을 실행해주세요.',
      });
      return;
    }

    const prompt = `
당신은 대한민국 상업용 부동산 상권 분석 및 임대 시장 리서치 전문가입니다.
아래 주소와 업종 조건을 바탕으로 해당 지역·상권의 상업 임대 동향 및 입지 특성을 분석해주세요.
(실제 한국부동산원 R-ONE이나 소상공인365 공식 통계 수치가 아닌, 상권 구조 기반 정성/정량 참고 분석임을 전제로 작성하세요.)

- 주소: ${address}
- 희망 업종: ${businessName || '일반 상업시설'}
- 전용면적: ${typeof areaPyeong === 'number' ? areaPyeong.toFixed(1) : '-'}평
- 현재 검토 중인 평당 월 임차료(월세+관리비): ${typeof rentPerPyeong === 'number' ? rentPerPyeong.toFixed(1) : '-'}만원/평 (월 ${monthlyRent ?? '-'}만원)

반드시 아래 JSON 형식으로 응답하세요:
{
  "districtName": string (예: "성동구 성수동 연무장길 상권"),
  "commercialCharacter": string (상권 성격 요약 1~2문장),
  "footTrafficProfile": string (주요 유동인구 연령대, 평일/주말 비중, 피크 시간대),
  "rentBenchmarkRange": string (해당 권역 1층 소규모 상가 참고 평당 월세 범위, 예: "평당 18~28만원 수준"),
  "rentAssessment": string (현재 검토 매물 평당 임차료의 적정성 평가 1~2문장),
  "vacancyAndCompetitionRisk": string (공실 추이 및 동종 업종 경쟁 밀집도 유의사항 1~2문장),
  "checkPoints": [string, string, string] (현장 방문 및 공식 통계 대조 시 꼭 확인할 3가지)
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Market trends error:', error);
    const rawMsg = String(error?.message || '');
    const friendly =
      rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')
        ? 'AI 분석 서버 요청량이 일시적으로 많습니다. 잠시 후 다시 시도해주세요.'
        : rawMsg || '지역 상권 분석 중 오류가 발생했습니다.';
    res.status(500).json({ success: false, error: friendly });
  }
});

function parseJibunCodes(bcode?: string, jibunAddress?: string, fallbackAddress?: string) {
  const cleanBcode = (bcode || '').replace(/\D/g, '');
  const sigunguCd = cleanBcode.length >= 5 ? cleanBcode.slice(0, 5) : '';
  const bjdongCd = cleanBcode.length >= 10 ? cleanBcode.slice(5, 10) : '';

  const addrText = (jibunAddress || fallbackAddress || '').trim();
  const match = addrText.match(/(산\s*)?(\d{1,4})(?:-(\d{1,4}))?\s*(?:\(|$)/);
  if (!sigunguCd || !bjdongCd || !match) {
    return null;
  }

  const platGbCd = match[1] ? '1' : '0';
  const bun = match[2].padStart(4, '0');
  const ji = (match[3] || '0').padStart(4, '0');
  return { sigunguCd, bjdongCd, platGbCd, bun, ji };
}

function mapBuildingUseFromPurpose(mainPurps?: string, etcPurps?: string): string {
  const combined = `${mainPurps || ''} ${etcPurps || ''}`;
  if (combined.includes('휴게음식점')) return '휴게음식점';
  if (combined.includes('일반음식점')) return '일반음식점';
  if (combined.includes('위락')) return '위락시설';
  if (combined.includes('판매')) return '판매시설';
  if (combined.includes('업무') || combined.includes('오피스텔')) return '업무시설';
  if (combined.includes('제2종근린생활') || combined.includes('2종근린')) return '제2종근린생활시설';
  if (combined.includes('제1종근린생활') || combined.includes('1종근린') || combined.includes('소매점')) {
    return '제1종근린생활시설';
  }
  return '기타';
}

function parseFloorNumber(flrNo: unknown, flrGbCdNm?: string, flrNoNm?: string): number {
  const rawNum = Number(flrNo);
  const label = `${flrGbCdNm || ''} ${flrNoNm || ''}`;
  if (!Number.isNaN(rawNum) && rawNum !== 0) {
    if (label.includes('지하') || label.includes('B')) {
      return -Math.abs(rawNum);
    }
    return rawNum;
  }
  const match = String(flrNoNm || '').match(/\d+/);
  if (match) {
    const n = parseInt(match[0], 10);
    return label.includes('지하') || label.includes('B') ? -n : n;
  }
  return 1;
}

function normalizeDataGoKrItems(json: any): any[] {
  const item = json?.response?.body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

// Endpoint: Building Register Title & Units (호실) lookup via MOLIT BldRgstHubService
app.post('/api/building-register/units', async (req: Request, res: Response) => {
  try {
    const { address, jibunAddress, bcode } = req.body || {};

    let parcel = parseJibunCodes(bcode, jibunAddress, address);

    // Optional fallback: resolve PNU from road/jibun address via MOIS Juso API if JUSO_API_KEY is present
    if (!parcel && address && process.env.JUSO_API_KEY) {
      const jusoParams = new URLSearchParams({
        confmKey: process.env.JUSO_API_KEY,
        currentPage: '1',
        countPerPage: '1',
        keyword: String(address).split('(')[0].trim(),
        resultType: 'json',
      });
      const jusoRes = await fetch(`https://business.juso.go.kr/addrlink/addrLinkApi.do?${jusoParams.toString()}`);
      if (jusoRes.ok) {
        const jusoJson: any = await jusoRes.json();
        const first = jusoJson?.results?.juso?.[0];
        if (first?.admCd && first?.lnbrMnnm) {
          parcel = {
            sigunguCd: String(first.admCd).slice(0, 5),
            bjdongCd: String(first.admCd).slice(5, 10),
            platGbCd: first.mtYn === '1' ? '1' : '0',
            bun: String(first.lnbrMnnm).padStart(4, '0'),
            ji: String(first.lnbrSlno || '0').padStart(4, '0'),
          };
        }
      }
    }

    if (!parcel) {
      res.json({
        success: false,
        code: 'PARCEL_CODE_REQUIRED',
        message: '정확한 필지 코드(법정동·지번) 확보를 위해 [주소 검색 (우편번호)] 버튼으로 주소를 선택해주세요.',
      });
      return;
    }

    const apiKey = process.env.DATA_GO_KR_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      res.json({
        success: false,
        code: 'API_KEY_MISSING',
        parcel,
        message: '서버에 공공데이터포털 건축물대장 인증키(DATA_GO_KR_API_KEY)가 설정되어 있지 않습니다. 정부24·세움터에서 확인한 호실을 아래에서 직접 등록해 선택할 수 있습니다.',
      });
      return;
    }

    const encodedKey = apiKey.includes('%') ? apiKey.trim() : encodeURIComponent(apiKey.trim());
    const buildQuery = (rows: number) =>
      `serviceKey=${encodedKey}&sigunguCd=${parcel!.sigunguCd}&bjdongCd=${parcel!.bjdongCd}&platGbCd=${parcel!.platGbCd}&bun=${parcel!.bun}&ji=${parcel!.ji}&numOfRows=${rows}&pageNo=1&_type=json`;

    const baseUrl = 'https://apis.data.go.kr/1613000/BldRgstHubService';
    const [titleRes, exposRes, floorRes] = await Promise.all([
      fetch(`${baseUrl}/getBrTitleInfo?${buildQuery(20)}`),
      fetch(`${baseUrl}/getBrExposPubuseAreaInfo?${buildQuery(300)}`),
      fetch(`${baseUrl}/getBrFlrOulnInfo?${buildQuery(100)}`),
    ]);

    if (!titleRes.ok || !exposRes.ok) {
      res.status(502).json({
        success: false,
        code: 'UPSTREAM_ERROR',
        message: '국토교통부 건축물대장 API 응답 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
      return;
    }

    const [titleJson, exposJson, floorJson] = await Promise.all([
      titleRes.json(),
      exposRes.json(),
      floorRes.ok ? floorRes.json() : Promise.resolve(null),
    ]);

    const titles = normalizeDataGoKrItems(titleJson);
    const exposItems = normalizeDataGoKrItems(exposJson);
    const floorItems = floorJson ? normalizeDataGoKrItems(floorJson) : [];

    const primaryTitle = titles[0] || null;
    const buildingTitle = primaryTitle
      ? {
          buildingName: String(primaryTitle.bldNm || '').trim(),
          regstrKind: String(primaryTitle.regstrKindCdNm || '').trim(),
          mainPurpose: String(primaryTitle.mainPurpsCdNm || '').trim(),
          etcPurpose: String(primaryTitle.etcPurps || '').trim(),
          groundFloors: Number(primaryTitle.grndFlrCnt || 0),
          undergroundFloors: Number(primaryTitle.ugrndFlrCnt || 0),
          totalAreaSqm: Number(primaryTitle.totArea || 0),
          approvalDate: String(primaryTitle.useAprDay || '').trim(),
          hasViolation: titles.some(
            (t) =>
              t.vltnBldYn === '1' ||
              t.vltnBldYn === 'Y' ||
              String(t.vltnYn || '').toUpperCase() === 'Y' ||
              String(t.etcStrct || '').includes('위반')
          ),
        }
      : null;

    // Aggregate exclusive & common areas per 호실 (dongNm + hoNm + flrNo)
    const unitMap = new Map<
      string,
      {
        id: string;
        kind: 'unit';
        dongNm: string;
        hoNm: string;
        floorNumber: number;
        floorLabel: string;
        exclusiveAreaSqm: number;
        commonAreaSqm: number;
        mainPurpose: string;
        etcPurpose: string;
        mappedBuildingUse: string;
        source: 'api';
      }
    >();

    for (const row of exposItems) {
      const dongNm = String(row.dongNm || '').trim();
      const hoNm = String(row.hoNm || '').trim();
      if (!hoNm) continue;

      const floorNumber = parseFloorNumber(row.flrNo, row.flrGbCdNm, row.flrNoNm);
      const floorLabel =
        String(row.flrNoNm || '').trim() ||
        (floorNumber < 0 ? `지하 ${Math.abs(floorNumber)}층` : `${floorNumber}층`);
      const key = `${dongNm}::${floorNumber}::${hoNm}`;
      const areaVal = Number(row.area || 0);
      const isExclusive = String(row.exposPubuseGbCdNm || '').includes('전유') || row.exposPubuseGbCd === '1';

      const existing = unitMap.get(key);
      if (!existing) {
        const mainPurpose = String(row.mainPurpsCdNm || '').trim();
        const etcPurpose = String(row.etcPurps || '').trim();
        unitMap.set(key, {
          id: `api-unit-${key}`,
          kind: 'unit',
          dongNm,
          hoNm,
          floorNumber,
          floorLabel,
          exclusiveAreaSqm: isExclusive ? areaVal : 0,
          commonAreaSqm: isExclusive ? 0 : areaVal,
          mainPurpose,
          etcPurpose,
          mappedBuildingUse: mapBuildingUseFromPurpose(mainPurpose, etcPurpose),
          source: 'api',
        });
      } else {
        if (isExclusive) {
          existing.exclusiveAreaSqm = Math.round((existing.exclusiveAreaSqm + areaVal) * 100) / 100;
          if (!existing.mainPurpose && row.mainPurpsCdNm) {
            existing.mainPurpose = String(row.mainPurpsCdNm).trim();
            existing.etcPurpose = String(row.etcPurps || '').trim();
            existing.mappedBuildingUse = mapBuildingUseFromPurpose(existing.mainPurpose, existing.etcPurpose);
          }
        } else {
          existing.commonAreaSqm = Math.round((existing.commonAreaSqm + areaVal) * 100) / 100;
        }
      }
    }

    let units: any[] = Array.from(unitMap.values()).filter((u) => u.exclusiveAreaSqm > 0);

    // Fallback to floor summary (일반건축물 층별개요) if no strata 호실 exists
    if (units.length === 0 && floorItems.length > 0) {
      units = floorItems
        .map((row, idx) => {
          const floorNumber = parseFloorNumber(row.flrNo, row.flrGbCdNm, row.flrNoNm);
          const floorLabel =
            String(row.flrNoNm || '').trim() ||
            (floorNumber < 0 ? `지하 ${Math.abs(floorNumber)}층` : `${floorNumber}층`);
          const mainPurpose = String(row.mainPurpsCdNm || '').trim();
          const etcPurpose = String(row.etcPurps || '').trim();
          return {
            id: `api-floor-${floorNumber}-${idx}`,
            kind: 'floor',
            dongNm: String(row.dongNm || '').trim(),
            hoNm: `${floorLabel} 전체`,
            floorNumber,
            floorLabel,
            exclusiveAreaSqm: Math.round(Number(row.area || 0) * 100) / 100,
            commonAreaSqm: 0,
            mainPurpose,
            etcPurpose,
            mappedBuildingUse: mapBuildingUseFromPurpose(mainPurpose, etcPurpose),
            source: 'api',
          };
        })
        .filter((u) => u.exclusiveAreaSqm > 0);
    }

    units.sort((a, b) => {
      if (a.floorNumber !== b.floorNumber) return a.floorNumber - b.floorNumber;
      return String(a.hoNm).localeCompare(String(b.hoNm), 'ko', { numeric: true });
    });

    res.json({
      success: true,
      parcel,
      buildingTitle,
      units,
    });
  } catch (error: any) {
    console.error('Building register lookup error:', error);
    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: error?.message || '건축물대장 호실 조회 중 오류가 발생했습니다.',
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BOTTOM LINE server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
