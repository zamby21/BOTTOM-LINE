import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));

// Lazy Gemini client so non-Gemini routes (building register, map proxy, geocode) never fail on cold start
let cachedGeminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!cachedGeminiClient) {
    cachedGeminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedGeminiClient;
}

const DATA_GO_KR_ENV_ALIASES = [
  'DATA_GO_KR_API_KEY',
  'VITE_DATA_GO_KR_API_KEY',
  'NEXT_PUBLIC_DATA_GO_KR_API_KEY',
  'DATA_GO_KR_SERVICE_KEY',
  'DATA_GO_KR_KEY',
  'DATA_GO_KR_DECODING_KEY',
  'DATA_GO_KR_ENCODING_KEY',
  'PUBLIC_DATA_API_KEY',
  'PUBLIC_DATA_KEY',
  'PUBLIC_DATA_PORTAL_API_KEY',
  'BUILDING_REGISTER_API_KEY',
  'BUILDING_LEDGER_API_KEY',
  'BLD_RGST_API_KEY',
  'MOLIT_API_KEY',
];

function resolveDataGoKrApiKey(): string {
  for (const name of DATA_GO_KR_ENV_ALIASES) {
    const val = process.env[name];
    if (typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }
  // Fallback for accidental whitespace or case variations in secret names
  const aliasSet = new Set(DATA_GO_KR_ENV_ALIASES);
  for (const [envName, envVal] of Object.entries(process.env)) {
    const normalized = envName.trim().toUpperCase();
    if (aliasSet.has(normalized) && typeof envVal === 'string' && envVal.trim()) {
      return envVal.trim();
    }
  }
  return '';
}

// Health check endpoint (useful for verifying Vercel & Node serverless readiness)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    runtime: process.env.VERCEL ? 'vercel' : 'node',
    dataGoKrConfigured: Boolean(resolveDataGoKrApiKey()),
  });
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

    const response = await getGeminiClient().models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          '당신은 상업용 부동산 및 프랜차이즈 가맹 창업 심사 전문 최고 수석 위원입니다. 뜬구름 잡는 조언 대신 제공된 재무 수치와 법률 규제 데이터를 근거로 구체적인 원인 분석과 협상 방안을 제시하십시오.',
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

    const response = await getGeminiClient().models.generateContent({
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
    const response = await getGeminiClient().models.generateContent({
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

    const response = await getGeminiClient().models.generateContent({
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

    const response = await getGeminiClient().models.generateContent({
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

// Endpoint: Google Search Grounded Nearby Commercial Lease Listing Lookup (Same building / within 30m)
app.post('/api/gemini/search-nearby-listings', async (req: Request, res: Response) => {
  try {
    const { address, jibunAddress, buildingName, floor, areaSqm, businessName } = req.body || {};

    if (!address || typeof address !== 'string' || !address.trim()) {
      res.status(400).json({
        success: false,
        code: 'ADDRESS_REQUIRED',
        error: '후보지 주소를 먼저 입력한 뒤 매물 사례를 검색해주세요.',
      });
      return;
    }

    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
      res.status(503).json({
        success: false,
        code: 'API_KEY_MISSING',
        error:
          '서버에 GEMINI_API_KEY가 설정되어 있지 않아 자동 웹 검색을 실행할 수 없습니다. 아래 네이버 부동산·네모·직방 바로가기를 눌러 직접 매물을 확인해주세요.',
      });
      return;
    }

    const areaPyeong = typeof areaSqm === 'number' && areaSqm > 0 ? (areaSqm * 0.3025).toFixed(1) : '-';
    const prompt = `
당신은 대한민국 상업용 부동산 매물 리서치 전문가입니다.
Google 검색을 통해 아래 후보지 건물 또는 반경 약 30m 이내(동일 도로변·인접 필지 상가)의 실제 공개 매물/임대 사례(네이버 부동산, 네모, 직방, 상가114, 지역 공인중개사 매물 안내 등)를 찾아 임차보증금, 월세(임대료), 관리비, 권리금 정보를 정리해주세요.

### 조회 대상 정보:
- 후보지 주소: ${address}
${jibunAddress ? `- 지번 주소: ${jibunAddress}` : ''}
${buildingName ? `- 건물명: ${buildingName}` : ''}
- 검토 층/면적: ${floor ?? 1}층 / ${areaSqm ?? '-'}㎡ (약 ${areaPyeong}평)
- 검토 업종: ${businessName || '상가/점포'}

### 매우 중요한 원칙:
1. 반드시 Google 검색 결과에서 실제로 확인된 매물·시세 정보만 기재하세요. 검색 결과에 없는 숫자(보증금·월세·관리비·권리금)를 임의로 추측하거나 가상 예시로 만들어내지 마세요.
2. 개별 매물에서 권리금이나 관리비가 공개되어 있지 않다면 반드시 "미공개(중개사 확인 필요)"로 표기하세요.
3. 동일 건물의 매물이 검색되지 않으면, 반경 30m 이내 인접 상가 건물 또는 동일 도로변·동(읍/면) 상가 임대 매물/시세 자료 중 실제로 검색된 사례만 구분(scopeLabel)을 명확히 적어 정리하세요.

반드시 아래 JSON 형식만 순수 JSON(또는 \`\`\`json 코드블록)으로 출력하세요:
{
  "searchScopeNote": "검색된 매물 범위 및 확인 결과 요약 (1~2문장)",
  "listings": [
    {
      "scopeLabel": "동일 건물 | 반경 30m 이내 인접 | 동일 도로변·인근 상권",
      "locationHint": "검색된 건물명 또는 지번/도로명 위치 설명",
      "floor": "예: 1층",
      "areaText": "예: 전용 50㎡ (15.1평)",
      "depositManwon": "예: 5,000만원 또는 미확인",
      "monthlyRentManwon": "예: 320만원 또는 미확인",
      "maintenanceFeeManwon": "예: 25만원 또는 미공개(중개사 확인 필요)",
      "premiumManwon": "예: 3,000만원 / 무권리 / 협의 / 미공개",
      "sourceName": "예: 네이버 부동산 / 네모 / 직방 / 공인중개사 블로그 등",
      "note": "검색 결과에서 확인된 매물 특징 1문장"
    }
  ],
  "neighborhoodBenchmark": {
    "depositRange": "인근 동일 조건(또는 1층 상가) 검색상 보증금 참고 범위",
    "rentRange": "인근 검색상 월세 및 평당 임대료 참고 범위",
    "maintenanceNote": "관리비 통상 참고사항",
    "premiumNote": "인근 권리금 형성 참고사항"
  },
  "searchTips": [
    "네이버 부동산 등에서 동일 건물·30m 이내 매물을 추가 확인할 때 체크할 실무 팁"
  ]
}
`;

    const response = await getGeminiClient().models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawText = (response.text || '').trim();
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const seenUrls = new Set<string>();
    const sources: Array<{ title: string; uri: string }> = [];
    for (const chunk of rawChunks) {
      const uri = chunk?.web?.uri;
      if (uri && !seenUrls.has(uri)) {
        seenUrls.add(uri);
        sources.push({
          title: chunk?.web?.title || uri,
          uri,
        });
      }
    }
    const searchQueries: string[] =
      response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    let parsed: any = null;
    const jsonBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidateJson = jsonBlockMatch ? jsonBlockMatch[1].trim() : rawText;
    try {
      parsed = JSON.parse(candidateJson);
    } catch {
      const braceMatch = candidateJson.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          parsed = JSON.parse(braceMatch[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      parsed = {
        searchScopeNote: rawText || '검색 결과를 요약하지 못했습니다. 아래 출처 링크 및 매물 사이트에서 직접 확인해주세요.',
        listings: [],
        neighborhoodBenchmark: null,
        searchTips: [],
      };
    } else {
      parsed.listings = Array.isArray(parsed.listings) ? parsed.listings : [];
      parsed.searchTips = Array.isArray(parsed.searchTips) ? parsed.searchTips : [];
    }

    res.json({
      success: true,
      data: parsed,
      sources,
      searchQueries,
    });
  } catch (error: any) {
    console.error('Nearby lease search error:', error);
    const rawMsg = String(error?.message || '');
    const friendly =
      rawMsg.includes('API key') || rawMsg.includes('API_KEY')
        ? 'GEMINI_API_KEY가 유효하지 않거나 설정되지 않았습니다. 아래 부동산 매물 사이트 바로가기로 직접 확인해주세요.'
        : rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('quota')
        ? '웹 검색 API 호출 한도(Quota)에 일시적으로 도달했습니다. 상단의 네이버 부동산·네모·직방 바로가기 버튼을 눌러 자동 복사된 주소로 동일 건물 및 30m 이내 매물을 바로 확인해주세요.'
        : rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')
        ? '검색 요청이 일시적으로 많습니다. 잠시 후 다시 시도하거나 상단 매물 사이트 바로가기를 이용해주세요.'
        : '인근 매물 사례 웹 검색 중 일시적인 오류가 발생했습니다. 상단의 부동산 매물 사이트 바로가기로 직접 확인해주세요.';
    res.status(500).json({ success: false, error: friendly });
  }
});

// ============================================================
// 국토교통부 건축HUB 건축물대장 호실(전유부) · 표제부 · 용도지역 조회
// ============================================================

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
  if (combined.includes('휴게음식점') || combined.includes('카페') || combined.includes('커피') || combined.includes('제과')) {
    return '휴게음식점';
  }
  if (combined.includes('일반음식점') || combined.includes('음식점') || combined.includes('식당')) {
    return '일반음식점';
  }
  if (combined.includes('위락') || combined.includes('단란주점') || combined.includes('유흥주점')) {
    return '위락시설';
  }
  if (combined.includes('판매') || combined.includes('상점')) {
    return '판매시설';
  }
  if (combined.includes('업무') || combined.includes('오피스텔') || combined.includes('사무소')) {
    return '업무시설';
  }
  if (combined.includes('제2종근린생활') || combined.includes('2종근린')) {
    return '제2종근린생활시설';
  }
  if (
    combined.includes('제1종근린생활') ||
    combined.includes('1종근린') ||
    combined.includes('소매점') ||
    combined.includes('미용') ||
    combined.includes('이용원') ||
    combined.includes('의원')
  ) {
    return '제1종근린생활시설';
  }
  if (combined.includes('근린생활')) {
    if (combined.includes('음식') || combined.includes('주점') || combined.includes('학원') || combined.includes('체력단련')) {
      return '제2종근린생활시설';
    }
    return '제1종근린생활시설';
  }
  return '기타';
}

function mapZoningFromJijiguItems(jijiguItems: any[]): {
  zoning: string | null;
  rawZoningName: string;
  jijiguZones: string[];
} {
  const uniqueNames: string[] = [];
  for (const item of jijiguItems) {
    const cdNm = String(item.jijiguCdNm || '').trim();
    if (cdNm && !uniqueNames.includes(cdNm)) {
      uniqueNames.push(cdNm);
    }
  }

  // Prioritize items explicitly categorized as 용도지역 or marked as reprYn === '1'
  const sorted = [...jijiguItems].sort((a, b) => {
    const aScore = (String(a.jijiguGbCdNm || '').includes('용도지역') ? 2 : 0) + (a.reprYn === '1' ? 1 : 0);
    const bScore = (String(b.jijiguGbCdNm || '').includes('용도지역') ? 2 : 0) + (b.reprYn === '1' ? 1 : 0);
    return bScore - aScore;
  });

  const matchToAppZoning = (name: string): string | null => {
    const clean = name.replace(/\s+/g, '');
    if (!clean) return null;
    if (clean.includes('중심상업')) return '중심상업지역';
    if (clean.includes('일반상업')) return '일반상업지역';
    if (clean.includes('근린상업')) return '근린상업지역';
    if (clean.includes('유통상업')) return '유통상업지역';
    if (clean.includes('준주거')) return '준주거지역';
    if (clean.includes('제1종일반주거') || clean.includes('1종일반주거')) return '제1종일반주거지역';
    if (clean.includes('제2종일반주거') || clean.includes('2종일반주거')) return '제2종일반주거지역';
    if (clean.includes('제3종일반주거') || clean.includes('3종일반주거')) return '제3종일반주거지역';
    if (clean.includes('전용주거')) return '전용주거지역';
    if (clean.includes('자연녹지') || clean.includes('녹지지역')) return '자연녹지지역';
    if (clean.includes('상업지역')) return '일반상업지역';
    if (clean.includes('일반주거지역')) return '제2종일반주거지역';
    return null;
  };

  for (const row of sorted) {
    const rawName = String(row.jijiguCdNm || '').trim();
    const mapped = matchToAppZoning(rawName);
    if (mapped) {
      return { zoning: mapped, rawZoningName: rawName, jijiguZones: uniqueNames };
    }
  }

  return { zoning: null, rawZoningName: '', jijiguZones: uniqueNames };
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

function getEncodedKeyCandidates(rawKey: string): string[] {
  const trimmed = rawKey.trim();
  const candidates: string[] = [];
  if (trimmed.includes('%')) {
    candidates.push(trimmed);
    try {
      const decoded = decodeURIComponent(trimmed);
      if (decoded !== trimmed) {
        candidates.push(encodeURIComponent(decoded));
      }
    } catch {
      // ignore malformed percent sequence
    }
  } else {
    candidates.push(encodeURIComponent(trimmed));
    candidates.push(trimmed);
  }
  return Array.from(new Set(candidates));
}

function safeParseJsonText(rawText: string): { ok: true; value: any } | { ok: false } {
  const trimmed = (rawText || '').trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return { ok: false };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return { ok: false };
  }
}

async function fetchDataGoKrJsonOnce(
  fullUrlWithoutKey: string,
  encodedKey: string,
  timeoutMs = 8500
): Promise<{ ok: boolean; json?: any; errorCode?: string; errorMessage?: string; retryable?: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const sep = fullUrlWithoutKey.includes('?') ? '&' : '?';
    const res = await fetch(`${fullUrlWithoutKey}${sep}serviceKey=${encodedKey}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json, text/xml;q=0.9, */*;q=0.8' },
    });
    const text = await res.text();
    const trimmed = text.trim();

    if (!res.ok) {
      return {
        ok: false,
        errorCode: `HTTP_${res.status}`,
        errorMessage: `공공데이터포털 일시 응답 오류 (HTTP ${res.status})`,
        retryable: res.status >= 500 || res.status === 429,
      };
    }

    // data.go.kr gateway returns XML on auth/service errors even when _type=json is requested
    if (trimmed.startsWith('<')) {
      const authMsgMatch = trimmed.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>/i);
      const errMsgMatch = trimmed.match(/<errMsg>([^<]+)<\/errMsg>/i);
      const reasonCodeMatch = trimmed.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/i);
      const code = authMsgMatch?.[1] || reasonCodeMatch?.[1] || 'DATA_GO_KR_XML_ERROR';
      const detail = errMsgMatch?.[1] || code;
      const retryable = !code.includes('SERVICE_KEY') && !code.includes('DEADLINE') && !code.includes('ACCESS_DENIED');
      return { ok: false, errorCode: code, errorMessage: detail, retryable };
    }

    const parsedResult = safeParseJsonText(trimmed);
    if (!parsedResult.ok) {
      return {
        ok: false,
        errorCode: 'UPSTREAM_NON_JSON',
        errorMessage: '공공데이터포털(건축HUB) 서버가 일시적으로 비정상 응답을 반환했습니다.',
        retryable: true,
      };
    }

    const parsed = parsedResult.value;
    const resultCode = String(parsed?.response?.header?.resultCode ?? '00');
    const resultMsg = String(parsed?.response?.header?.resultMsg ?? '');
    if (resultCode !== '00') {
      return {
        ok: false,
        errorCode: `RESULT_${resultCode}`,
        errorMessage: resultMsg || `공공데이터 API 오류 코드 ${resultCode}`,
        retryable: resultCode === '99' || resultCode === '04' || resultCode === '05',
      };
    }
    return { ok: true, json: parsed };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      ok: false,
      errorCode: isTimeout ? 'TIMEOUT' : 'FETCH_ERROR',
      errorMessage: isTimeout
        ? '공공데이터포털(건축HUB) 응답 시간이 초과되었습니다.'
        : '공공데이터포털(건축HUB) 통신 중 일시적인 네트워크 오류가 발생했습니다.',
      retryable: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDataGoKrJson(
  fullUrlWithoutKey: string,
  encodedKey: string,
  maxAttempts = 2
): Promise<{ ok: boolean; json?: any; errorCode?: string; errorMessage?: string }> {
  let lastResult: { ok: boolean; json?: any; errorCode?: string; errorMessage?: string; retryable?: boolean } = {
    ok: false,
    errorCode: 'FETCH_ERROR',
    errorMessage: '공공데이터포털(건축HUB) 통신 오류가 발생했습니다.',
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = await fetchDataGoKrJsonOnce(fullUrlWithoutKey, encodedKey, attempt === 1 ? 8500 : 7500);
    if (lastResult.ok || !lastResult.retryable || attempt === maxAttempts) {
      return lastResult;
    }
    await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
  }
  return lastResult;
}

function translateDataGoKrError(code?: string, detail?: string): string {
  const c = String(code || '').toUpperCase();
  if (c.includes('SERVICE_KEY_IS_NOT_REGISTERED')) {
    return '등록되지 않았거나 해당 API(국토교통부_건축HUB_건축물대장정보 서비스)에 활용신청되지 않은 인증키입니다. 공공데이터포털 활용신청 상태와 Encoding/Decoding 키를 확인해주세요.';
  }
  if (c.includes('DEADLINE_HAS_EXPIRED')) {
    return '공공데이터포털 인증키의 사용 기한이 만료되었습니다. 포털에서 재발급 후 업데이트해주세요.';
  }
  if (c.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS')) {
    return '공공데이터포털 일일 호출 한도를 초과했습니다. 잠시 후 또는 익일 다시 시도해주세요.';
  }
  if (c.includes('SERVICE_ACCESS_DENIED') || c.includes('APPLICATION_ERROR')) {
    return '건축물대장 API 서비스 접근이 거부되었습니다. 공공데이터포털 활용신청 승인 여부를 확인해주세요.';
  }
  if (c === 'UPSTREAM_NON_JSON' || c === 'TIMEOUT' || c === 'FETCH_ERROR' || c.startsWith('HTTP_5')) {
    return '공공데이터포털(건축HUB) 서버 응답이 일시적으로 지연되거나 중단되었습니다. 잠시 후 [건축물대장 호실 불러오기]를 다시 눌러주세요.';
  }
  return detail || '국토교통부 건축물대장 API 응답 오류가 발생했습니다.';
}

// Endpoint: Building Register Title, Units (호실), & Zoning (지역지구구역) lookup via MOLIT BldRgstHubService
app.post('/api/building-register/units', async (req: Request, res: Response) => {
  try {
    const { address, jibunAddress, bcode } = req.body || {};

    const apiKey = resolveDataGoKrApiKey();

    let parcel = parseJibunCodes(bcode, jibunAddress, address);

    // Fallback 1: Resolve parcel via MOIS Juso Road-Name Address API if JUSO_API_KEY is configured
    if (!parcel && (address || jibunAddress) && process.env.JUSO_API_KEY) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        try {
          const jusoParams = new URLSearchParams({
            confmKey: process.env.JUSO_API_KEY.trim(),
            currentPage: '1',
            countPerPage: '1',
            keyword: String(jibunAddress || address).split('(')[0].trim(),
            resultType: 'json',
          });
          const jusoRes = await fetch(
            `https://business.juso.go.kr/addrlink/addrLinkApi.do?${jusoParams.toString()}`,
            { signal: controller.signal }
          );
          if (jusoRes.ok) {
            const parsedJuso = safeParseJsonText(await jusoRes.text());
            const first = parsedJuso.ok ? parsedJuso.value?.results?.juso?.[0] : null;
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
        } finally {
          clearTimeout(timer);
        }
      } catch {
        // Ignore Juso lookup failure and continue to next fallback
      }
    }

    // Fallback 2: Resolve parcel via Kakao Local Address API if KAKAO_REST_API_KEY is configured
    const kakaoKey = (process.env.KAKAO_REST_API_KEY || '').trim();
    if (!parcel && (address || jibunAddress) && kakaoKey && /^[\x21-\x7E]+$/.test(kakaoKey)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        try {
          const cleanKeyword = String(jibunAddress || address).split('(')[0].trim();
          const kakaoRes = await fetch(
            `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(cleanKeyword)}`,
            {
              headers: { Authorization: `KakaoAK ${kakaoKey}` },
              signal: controller.signal,
            }
          );
          if (kakaoRes.ok) {
            const parsedKakao = safeParseJsonText(await kakaoRes.text());
            const doc = parsedKakao.ok ? parsedKakao.value?.documents?.[0]?.address : null;
            if (doc?.b_code && doc?.main_address_no) {
              const cleanCode = String(doc.b_code).replace(/\D/g, '');
              if (cleanCode.length >= 10) {
                parcel = {
                  sigunguCd: cleanCode.slice(0, 5),
                  bjdongCd: cleanCode.slice(5, 10),
                  platGbCd: doc.mountain_yn === 'Y' ? '1' : '0',
                  bun: String(doc.main_address_no).padStart(4, '0'),
                  ji: String(doc.sub_address_no || '0').padStart(4, '0'),
                };
              }
            }
          }
        } finally {
          clearTimeout(timer);
        }
      } catch {
        // Ignore Kakao lookup failure and continue to next fallback
      }
    }

    // Fallback 3: If user typed a jibun address (e.g., "경기 용인시 수지구 죽전동 1335-3") and DATA_GO_KR_API_KEY is available,
    // try resolving 10-digit bcode via MOIS StanReginCd API
    if (!parcel && (jibunAddress || address) && apiKey.trim()) {
      try {
        const candidatesToParse = [jibunAddress, address]
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
          .map((v) => v.split('(')[0].trim());

        for (const addrClean of candidatesToParse) {
          const jibunMatch = addrClean.match(/^(.+?)\s+(산\s*)?(\d{1,4})(?:-(\d{1,4}))?$/);
          if (!jibunMatch) continue;
          const regionQuery = jibunMatch[1].trim();
          const keyCandidate = getEncodedKeyCandidates(apiKey)[0];
          const regRes = await fetchDataGoKrJson(
            `https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList?pageNo=1&numOfRows=5&type=json&locatadd_nm=${encodeURIComponent(regionQuery)}`,
            keyCandidate,
            1
          );
          const regItem = regRes.ok
            ? (regRes.json?.StanReginCd?.[1]?.row?.[0] || normalizeDataGoKrItems(regRes.json)[0])
            : null;
          const regionCd = String(regItem?.region_cd || '').replace(/\D/g, '');
          if (regionCd.length >= 10) {
            parcel = {
              sigunguCd: regionCd.slice(0, 5),
              bjdongCd: regionCd.slice(5, 10),
              platGbCd: jibunMatch[2] ? '1' : '0',
              bun: jibunMatch[3].padStart(4, '0'),
              ji: (jibunMatch[4] || '0').padStart(4, '0'),
            };
            break;
          }
        }
      } catch {
        // Ignore StanReginCd lookup failure
      }
    }

    if (!parcel) {
      res.json({
        success: false,
        code: 'PARCEL_CODE_REQUIRED',
        message: '정확한 필지 코드(법정동·지번) 확보를 위해 [주소 검색 열기]에서 주소를 선택하거나 "시·구·동 번지" 형식으로 입력해주세요.',
      });
      return;
    }

    if (!apiKey || !apiKey.trim()) {
      const isVercel = Boolean(process.env.VERCEL);
      res.json({
        success: false,
        code: 'API_KEY_MISSING',
        runtime: isVercel ? 'vercel' : 'node',
        parcel,
        message: isVercel
          ? 'Vercel 배포 환경변수에 DATA_GO_KR_API_KEY가 등록되어 있지 않습니다. AI Studio Secrets는 Vercel로 자동 연동되지 않으므로, Vercel 대시보드(Settings → Environment Variables)에 DATA_GO_KR_API_KEY를 추가(Production 체크)한 뒤 Redeploy 해주세요.'
          : '서버 환경변수(DATA_GO_KR_API_KEY)가 감지되지 않았습니다. AI Studio Secrets(또는 서버 환경변수)에 변수명이 정확히 DATA_GO_KR_API_KEY로 등록되어 있는지 확인하고 재실행해주세요.',
      });
      return;
    }

    const baseUrl = 'https://apis.data.go.kr/1613000/BldRgstHubService';
    const parcelParams = `sigunguCd=${parcel.sigunguCd}&bjdongCd=${parcel.bjdongCd}&platGbCd=${parcel.platGbCd}&bun=${parcel.bun}&ji=${parcel.ji}&_type=json`;

    const keyCandidates = getEncodedKeyCandidates(apiKey);
    let activeKey = keyCandidates[0];
    let titleCall = await fetchDataGoKrJson(
      `${baseUrl}/getBrTitleInfo?${parcelParams}&numOfRows=50&pageNo=1`,
      activeKey
    );

    // Retry once with alternate key encoding if auth error occurred
    if (
      !titleCall.ok &&
      keyCandidates.length > 1 &&
      String(titleCall.errorCode || '').includes('SERVICE_KEY')
    ) {
      activeKey = keyCandidates[1];
      titleCall = await fetchDataGoKrJson(
        `${baseUrl}/getBrTitleInfo?${parcelParams}&numOfRows=50&pageNo=1`,
        activeKey
      );
    }

    if (!titleCall.ok) {
      res.json({
        success: false,
        code: 'UPSTREAM_ERROR',
        upstreamCode: titleCall.errorCode,
        message: translateDataGoKrError(titleCall.errorCode, titleCall.errorMessage),
      });
      return;
    }

    const [exposCall, floorCall, jijiguCall] = await Promise.all([
      fetchDataGoKrJson(`${baseUrl}/getBrExposPubuseAreaInfo?${parcelParams}&numOfRows=1000&pageNo=1`, activeKey),
      fetchDataGoKrJson(`${baseUrl}/getBrFlrOulnInfo?${parcelParams}&numOfRows=200&pageNo=1`, activeKey),
      fetchDataGoKrJson(`${baseUrl}/getBrJijiguInfo?${parcelParams}&numOfRows=100&pageNo=1`, activeKey),
    ]);

    const titles = normalizeDataGoKrItems(titleCall.json);
    let exposItems = exposCall.ok ? normalizeDataGoKrItems(exposCall.json) : [];
    const exposTotalCount = Number(exposCall.json?.response?.body?.totalCount || 0);
    if (exposCall.ok && exposTotalCount > exposItems.length && exposItems.length >= 1000) {
      const page2Call = await fetchDataGoKrJson(
        `${baseUrl}/getBrExposPubuseAreaInfo?${parcelParams}&numOfRows=1000&pageNo=2`,
        activeKey
      );
      if (page2Call.ok) {
        exposItems = [...exposItems, ...normalizeDataGoKrItems(page2Call.json)];
      }
    }

    const floorItems = floorCall.ok ? normalizeDataGoKrItems(floorCall.json) : [];
    const jijiguItems = jijiguCall.ok ? normalizeDataGoKrItems(jijiguCall.json) : [];
    const zoningInfo = mapZoningFromJijiguItems(jijiguItems);

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
          zoning: zoningInfo.zoning,
          rawZoningName: zoningInfo.rawZoningName,
          jijiguZones: zoningInfo.jijiguZones,
        }
      : zoningInfo.zoning || zoningInfo.jijiguZones.length > 0
      ? {
          buildingName: '',
          regstrKind: '',
          mainPurpose: '',
          etcPurpose: '',
          groundFloors: 0,
          undergroundFloors: 0,
          totalAreaSqm: 0,
          approvalDate: '',
          hasViolation: false,
          zoning: zoningInfo.zoning,
          rawZoningName: zoningInfo.rawZoningName,
          jijiguZones: zoningInfo.jijiguZones,
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
        zoning?: string;
        source: 'api';
        _hasExclusiveMeta: boolean;
      }
    >();

    for (const row of exposItems) {
      const dongNm = String(row.dongNm || '').trim();
      const hoNm = String(row.hoNm || '').trim();
      if (!hoNm) continue;

      const floorNumber = parseFloorNumber(row.flrNo, row.flrGbCdNm, row.flrNoNm);
      const rawFloorLabel = String(row.flrNoNm || '').trim();
      const normalizedFloorLabel =
        rawFloorLabel && rawFloorLabel !== '각층'
          ? rawFloorLabel
          : floorNumber < 0
          ? `지하 ${Math.abs(floorNumber)}층`
          : `${floorNumber}층`;
      const key = `${dongNm}::${floorNumber}::${hoNm}`;
      const areaVal = Number(row.area || 0);
      const isExclusive = String(row.exposPubuseGbCdNm || '').includes('전유') || row.exposPubuseGbCd === '1';
      const rowMainPurpose = String(row.mainPurpsCdNm || '').trim();
      const rowEtcPurpose = String(row.etcPurps || '').trim();

      const existing = unitMap.get(key);
      if (!existing) {
        unitMap.set(key, {
          id: `api-unit-${key}`,
          kind: 'unit',
          dongNm,
          hoNm,
          floorNumber,
          floorLabel: normalizedFloorLabel,
          exclusiveAreaSqm: isExclusive ? areaVal : 0,
          commonAreaSqm: isExclusive ? 0 : areaVal,
          mainPurpose: rowMainPurpose,
          etcPurpose: rowEtcPurpose,
          mappedBuildingUse: mapBuildingUseFromPurpose(rowMainPurpose, rowEtcPurpose),
          zoning: zoningInfo.zoning || undefined,
          source: 'api',
          _hasExclusiveMeta: isExclusive && Boolean(rowMainPurpose || rowEtcPurpose),
        });
      } else {
        if (isExclusive) {
          existing.exclusiveAreaSqm = Math.round((existing.exclusiveAreaSqm + areaVal) * 100) / 100;
          // Prefer exclusive-part (전유) floor label & purpose over common-part (공용) metadata
          if (!existing._hasExclusiveMeta && (rowMainPurpose || rowEtcPurpose)) {
            existing.mainPurpose = rowMainPurpose;
            existing.etcPurpose = rowEtcPurpose;
            existing.mappedBuildingUse = mapBuildingUseFromPurpose(rowMainPurpose, rowEtcPurpose);
            existing._hasExclusiveMeta = true;
          }
          if (rawFloorLabel && rawFloorLabel !== '각층') {
            existing.floorLabel = rawFloorLabel;
          }
        } else {
          existing.commonAreaSqm = Math.round((existing.commonAreaSqm + areaVal) * 100) / 100;
        }
      }
    }

    let units: any[] = Array.from(unitMap.values())
      .filter((u) => u.exclusiveAreaSqm > 0)
      .map(({ _hasExclusiveMeta, ...rest }) => rest);

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
            zoning: zoningInfo.zoning || undefined,
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
    res.json({
      success: false,
      code: 'SERVER_ERROR',
      message: '건축물대장 호실 조회 중 일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
});

// ============================================================
// 국토교통부 국토지리정보원 영상지도 · 배경지도 API 프록시 & 지오코딩
// ============================================================

const ALLOWED_NGII_LAYERS = new Set([
  'korean_map',
  'satellite_map',
  'air',
  'hybrid_map',
  'white_map',
  'color_map',
  'lowV_map',
]);

const geocodeCache = new Map<
  string,
  {
    lat: number;
    lng: number;
    matchedQuery: string;
    precision: 'exact' | 'road' | 'dong' | 'sigungu';
    source: string;
  }
>();

function expandKoreanSidoAbbrev(addr: string): string {
  return addr
    .replace(/^서울\s+/, '서울특별시 ')
    .replace(/^부산\s+/, '부산광역시 ')
    .replace(/^대구\s+/, '대구광역시 ')
    .replace(/^인천\s+/, '인천광역시 ')
    .replace(/^광주\s+/, '광주광역시 ')
    .replace(/^대전\s+/, '대전광역시 ')
    .replace(/^울산\s+/, '울산광역시 ')
    .replace(/^세종\s+/, '세종특별자치시 ')
    .replace(/^경기\s+/, '경기도 ')
    .replace(/^강원\s+/, '강원특별자치도 ')
    .replace(/^충북\s+/, '충청북도 ')
    .replace(/^충남\s+/, '충청남도 ')
    .replace(/^전북\s+/, '전북특별자치도 ')
    .replace(/^전남\s+/, '전라남도 ')
    .replace(/^경북\s+/, '경상북도 ')
    .replace(/^경남\s+/, '경상남도 ')
    .replace(/^제주\s+/, '제주특별자치도 ');
}

function buildKoreanGeocodeCandidates(
  address: string,
  jibunAddress?: string,
  buildingName?: string
): Array<{ query: string; precision: 'exact' | 'road' | 'dong' | 'sigungu' }> {
  const candidates: Array<{ query: string; precision: 'exact' | 'road' | 'dong' | 'sigungu' }> = [];
  const seen = new Set<string>();
  const push = (q: string, precision: 'exact' | 'road' | 'dong' | 'sigungu') => {
    const clean = q.replace(/\s+/g, ' ').trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      candidates.push({ query: clean, precision });
    }
  };

  const rawRoad = (address || '').split('(')[0].trim();
  const rawJibun = (jibunAddress || '').split('(')[0].trim();
  const expRoad = expandKoreanSidoAbbrev(rawRoad);
  const expJibun = expandKoreanSidoAbbrev(rawJibun);

  // 1. Exact road / jibun addresses
  if (expRoad) push(expRoad, 'exact');
  if (expJibun) push(expJibun, 'exact');

  // 2. Road name without building number (e.g., "경기도 용인시 수지구 죽전로")
  const roadWithoutNum = expRoad.replace(/\s+\d+(?:-\d+)?\s*$/, '').trim();
  if (roadWithoutNum && roadWithoutNum !== expRoad) {
    push(roadWithoutNum, 'road');
  }

  // 3. Dong / Eup / Myeon from jibun or road
  const jibunWithoutNum = expJibun.replace(/\s+(?:산\s*)?\d+(?:-\d+)?\s*$/, '').trim();
  if (jibunWithoutNum && jibunWithoutNum !== expJibun) {
    push(jibunWithoutNum, 'dong');
  }

  // Extract dong/eup/myeon inside parentheses if present e.g. "(죽전동)"
  const parenMatch = (address || '').match(/\(([^)]+)\)/);
  if (parenMatch) {
    const tokens = parenMatch[1].split(/[,\s]+/).filter(Boolean);
    const dongToken = tokens.find((t) => /(?:동|읍|면|가)$/.test(t));
    if (dongToken) {
      const prefixTokens = expRoad.split(/\s+/).slice(0, 3);
      push(`${prefixTokens.join(' ')} ${dongToken}`, 'dong');
    }
  }

  // 4. Building name + sigungu
  if (buildingName && buildingName.trim()) {
    const prefix = expRoad.split(/\s+/).slice(0, 2).join(' ');
    push(`${prefix} ${buildingName.trim()}`, 'road');
  }

  // 5. Fallback to sigungu / first 2-3 administrative tokens
  const adminTokens = expRoad.split(/\s+/).filter(Boolean);
  if (adminTokens.length >= 3) {
    push(adminTokens.slice(0, 3).join(' '), 'dong');
  }
  if (adminTokens.length >= 2) {
    push(adminTokens.slice(0, 2).join(' '), 'sigungu');
  }
  if (adminTokens.length >= 1) {
    push(adminTokens[0], 'sigungu');
  }

  return candidates;
}

let cachedMapProbe: {
  checkedAt: number;
  ngiiConfigured: boolean;
  ngiiReachable: boolean;
  vworldConfigured: boolean;
  vworldReachable: boolean;
} | null = null;

async function probeNgiiTileReachable(ngiiKey: string): Promise<boolean> {
  const params = new URLSearchParams({
    service: 'WMTS',
    request: 'GetTile',
    version: '1.0.0',
    layer: 'korean_map',
    style: 'korean',
    format: 'image/png',
    tilematrixset: 'korean',
    tilematrix: 'L15',
    tilerow: '3973',
    tilecol: '2234',
    apikey: ngiiKey,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(`https://map.ngii.go.kr/openapi/Gettile.do?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://map.ngii.go.kr/',
      },
    });
    const ct = res.headers.get('content-type') || '';
    return res.ok && ct.startsWith('image/');
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function probeVworldTileReachable(vworldKey: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(
      `https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(vworldKey)}/Base/15/12703/27956.png`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }
    );
    const ct = res.headers.get('content-type') || '';
    return res.ok && ct.startsWith('image/');
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/map/config', async (_req: Request, res: Response) => {
  const ngiiKey = (process.env.NGII_API_KEY || process.env.NGII_MAP_API_KEY || '').trim();
  const vworldKey = (process.env.VWORLD_API_KEY || '').trim();
  const ngiiConfigured = Boolean(ngiiKey);
  const vworldConfigured = Boolean(vworldKey);

  const now = Date.now();
  if (
    !cachedMapProbe ||
    now - cachedMapProbe.checkedAt > 5 * 60 * 1000 ||
    cachedMapProbe.ngiiConfigured !== ngiiConfigured ||
    cachedMapProbe.vworldConfigured !== vworldConfigured
  ) {
    const [ngiiReachable, vworldReachable] = await Promise.all([
      ngiiConfigured ? probeNgiiTileReachable(ngiiKey) : Promise.resolve(false),
      vworldConfigured ? probeVworldTileReachable(vworldKey) : Promise.resolve(false),
    ]);
    cachedMapProbe = {
      checkedAt: now,
      ngiiConfigured,
      ngiiReachable,
      vworldConfigured,
      vworldReachable,
    };
  }

  const tileMode = cachedMapProbe.ngiiReachable
    ? 'ngii'
    : cachedMapProbe.vworldReachable
    ? 'vworld'
    : 'public';

  const providerName =
    tileMode === 'ngii'
      ? '국토교통부 국토지리정보원 WMTS (바로e맵)'
      : tileMode === 'vworld'
      ? '국토교통부 VWorld 공간정보 WMTS'
      : ngiiConfigured || vworldConfigured
      ? '표준 배경·위성지도 (국토지리정보원/VWorld 서버 외부 접근 제한으로 자동 전환)'
      : '표준 배경·위성지도 (NGII_API_KEY 등록 시 국토지리정보원 WMTS 자동 연동)';

  res.json({
    success: true,
    ngiiConfigured,
    ngiiReachable: cachedMapProbe.ngiiReachable,
    vworldConfigured,
    vworldReachable: cachedMapProbe.vworldReachable,
    tileMode,
    providerName,
  });
});

app.get('/api/map/ngii-tile', async (req: Request, res: Response) => {
  try {
    const ngiiKey = (process.env.NGII_API_KEY || process.env.NGII_MAP_API_KEY || '').trim();
    if (!ngiiKey) {
      res.status(503).json({
        success: false,
        code: 'NGII_API_KEY_MISSING',
        error: '서버에 NGII_API_KEY가 설정되어 있지 않습니다.',
      });
      return;
    }

    const layer = String(req.query.layer || 'korean_map').trim();
    const tilematrix = String(req.query.tilematrix || 'L15').trim();
    const tilerow = String(req.query.tilerow || '').trim();
    const tilecol = String(req.query.tilecol || '').trim();

    if (!ALLOWED_NGII_LAYERS.has(layer)) {
      res.status(400).send('Invalid layer');
      return;
    }
    if (!/^L\d{2}$/.test(tilematrix) || !/^\d+$/.test(tilerow) || !/^\d+$/.test(tilecol)) {
      res.status(400).send('Invalid tile parameters');
      return;
    }

    const fetchNgiiLayer = async (targetLayer: string) => {
      const format =
        targetLayer === 'satellite_map' || targetLayer === 'air' ? 'image/jpeg' : 'image/png';
      const params = new URLSearchParams({
        service: 'WMTS',
        request: 'GetTile',
        version: '1.0.0',
        layer: targetLayer,
        style: 'korean',
        format,
        tilematrixset: 'korean',
        tilematrix,
        tilerow,
        tilecol,
        apikey: ngiiKey,
      });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const upstream = await fetch(
          `https://map.ngii.go.kr/openapi/Gettile.do?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
              Referer: 'https://map.ngii.go.kr/',
            },
          }
        );
        const contentType = upstream.headers.get('content-type') || '';
        if (upstream.ok && contentType.startsWith('image/')) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          return { ok: true as const, buf, contentType };
        }
        return { ok: false as const, status: upstream.status };
      } finally {
        clearTimeout(timer);
      }
    };

    let tileRes = await fetchNgiiLayer(layer);
    if (!tileRes.ok && layer === 'satellite_map') {
      tileRes = await fetchNgiiLayer('air');
    }

    if (!tileRes.ok) {
      res.status(502).send('NGII tile unavailable');
      return;
    }

    res.setHeader('Content-Type', tileRes.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(tileRes.buf);
  } catch (err: any) {
    res.status(502).send(err?.message || 'NGII tile proxy error');
  }
});

app.get('/api/map/vworld-tile', async (req: Request, res: Response) => {
  try {
    const vworldKey = (process.env.VWORLD_API_KEY || '').trim();
    if (!vworldKey) {
      res.status(503).send('VWORLD_API_KEY missing');
      return;
    }
    const layer = String(req.query.layer || 'Base').trim();
    const z = String(req.query.z || '').trim();
    const y = String(req.query.y || '').trim();
    const x = String(req.query.x || '').trim();

    if (!['Base', 'Satellite', 'Hybrid'].includes(layer) || !/^\d+$/.test(z) || !/^\d+$/.test(y) || !/^\d+$/.test(x)) {
      res.status(400).send('Invalid VWorld tile params');
      return;
    }

    const ext = layer === 'Satellite' ? 'jpeg' : 'png';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const upstream = await fetch(
        `https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(vworldKey)}/${layer}/${z}/${y}/${x}.${ext}`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        }
      );
      const contentType = upstream.headers.get('content-type') || '';
      if (!upstream.ok || !contentType.startsWith('image/')) {
        res.status(502).send('VWorld tile unavailable');
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buf);
    } finally {
      clearTimeout(timer);
    }
  } catch (err: any) {
    res.status(502).send(err?.message || 'VWorld tile proxy error');
  }
});

function mapArcGisPrecision(
  addrType?: string,
  fallback: 'exact' | 'road' | 'dong' | 'sigungu' = 'road'
): 'exact' | 'road' | 'dong' | 'sigungu' {
  const t = String(addrType || '').toLowerCase();
  if (t === 'pointaddress' || t === 'subaddress' || t === 'buildingname' || t === 'poi') {
    return 'exact';
  }
  if (t === 'streetaddress' || t === 'streetname' || t === 'streetint') {
    return 'road';
  }
  if (t === 'locality' || t === 'neighborhood' || t === 'postal') {
    return 'dong';
  }
  if (t === 'subregion' || t === 'region') {
    return 'sigungu';
  }
  return fallback;
}

app.post('/api/map/geocode', async (req: Request, res: Response) => {
  try {
    const { address, jibunAddress, buildingName } = req.body || {};
    const rawAddress = String(address || '').trim();
    const rawJibun = String(jibunAddress || '').trim();
    const rawBuilding = String(buildingName || '').trim();

    if (!rawAddress && !rawJibun) {
      res.status(400).json({ success: false, error: '주소가 비어 있습니다.' });
      return;
    }

    const cacheKey = `${rawAddress}||${rawJibun}||${rawBuilding}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
      res.json({ success: true, ...cached });
      return;
    }

    // 1. Kakao Local Address API (sub-meter accuracy for Korean road & jibun addresses)
    const kakaoKey = (process.env.KAKAO_REST_API_KEY || '').trim();
    if (kakaoKey && /^[\x21-\x7E]+$/.test(kakaoKey)) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      try {
        const kakaoQuery = rawAddress.split('(')[0].trim() || rawJibun;
        const kakaoRes = await fetch(
          `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(kakaoQuery)}`,
          {
            signal: controller.signal,
            headers: { Authorization: `KakaoAK ${kakaoKey}` },
          }
        );
        if (kakaoRes.ok) {
          const kakaoJson: any = await kakaoRes.json();
          const doc = kakaoJson?.documents?.[0];
          if (doc?.y && doc?.x) {
            const result = {
              lat: parseFloat(doc.y),
              lng: parseFloat(doc.x),
              matchedQuery: doc.address_name || kakaoQuery,
              precision: 'exact' as const,
              source: 'Kakao Local',
            };
            geocodeCache.set(cacheKey, result);
            res.json({ success: true, ...result });
            return;
          }
        }
      } catch {
        // Proceed to next geocoder
      } finally {
        clearTimeout(timer);
      }
    }

    // 2. ArcGIS World Geocoding Service (exact PointAddress accuracy for Korean road & parcel addresses)
    const arcgisQueries = buildKoreanGeocodeCandidates(rawAddress, rawJibun, rawBuilding);
    for (const item of arcgisQueries.slice(0, 4)) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      try {
        const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(
          item.query
        )}&countryCode=KOR&outFields=Addr_type,Match_addr&maxLocations=1&f=json`;
        const arcRes = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'BottomLineCommercialRealEstateApp/1.0' },
        });
        if (arcRes.ok) {
          const arcJson: any = await arcRes.json();
          const best = arcJson?.candidates?.[0];
          if (
            best?.location &&
            typeof best.location.y === 'number' &&
            typeof best.location.x === 'number' &&
            Number(best.score || 0) >= 85
          ) {
            const precision = mapArcGisPrecision(best?.attributes?.Addr_type, item.precision);
            if (item.precision === 'exact' && precision === 'sigungu' && arcgisQueries.length > 1) {
              continue;
            }
            const result = {
              lat: best.location.y,
              lng: best.location.x,
              matchedQuery: best?.attributes?.Match_addr || best.address || item.query,
              precision,
              source: 'ArcGIS Geocoder',
            };
            geocodeCache.set(cacheKey, result);
            res.json({ success: true, ...result });
            return;
          }
        }
      } catch {
        // Proceed to next candidate / provider
      } finally {
        clearTimeout(timer);
      }
    }

    // 3. VWorld Official MOLIT Geocoder API (if VWORLD_API_KEY configured & reachable)
    const vworldKey = (process.env.VWORLD_API_KEY || '').trim();
    if (vworldKey) {
      for (const [type, addrVal] of [
        ['road', rawAddress.split('(')[0].trim()],
        ['parcel', rawJibun.split('(')[0].trim()],
      ] as const) {
        if (!addrVal) continue;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        try {
          const vwParams = new URLSearchParams({
            service: 'address',
            request: 'getcoord',
            version: '2.0',
            crs: 'epsg:4326',
            address: addrVal,
            refine: 'true',
            simple: 'false',
            format: 'json',
            type,
            key: vworldKey,
          });
          const vwRes = await fetch(`https://api.vworld.kr/req/address?${vwParams.toString()}`, {
            signal: controller.signal,
          });
          if (vwRes.ok) {
            const vwJson: any = await vwRes.json();
            const point = vwJson?.response?.result?.point;
            if (vwJson?.response?.status === 'OK' && point?.y && point?.x) {
              const result = {
                lat: parseFloat(point.y),
                lng: parseFloat(point.x),
                matchedQuery: addrVal,
                precision: 'exact' as const,
                source: '국토교통부 VWorld',
              };
              geocodeCache.set(cacheKey, result);
              res.json({ success: true, ...result });
              return;
            }
          }
        } catch {
          // Proceed to next geocoder
        } finally {
          clearTimeout(timer);
        }
      }
    }

    // 4. OpenStreetMap Nominatim progressive Korean query cascade (final fallback)
    for (const item of arcgisQueries) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(
          item.query
        )}`;
        const nomRes = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'BottomLineCommercialRealEstateApp/1.0',
          },
        });
        if (nomRes.ok) {
          const list: any = await nomRes.json();
          const first = Array.isArray(list) ? list[0] : null;
          if (first?.lat && first?.lon) {
            const result = {
              lat: parseFloat(first.lat),
              lng: parseFloat(first.lon),
              matchedQuery: item.query,
              precision: item.precision,
              source: 'OSM Nominatim',
            };
            geocodeCache.set(cacheKey, result);
            res.json({ success: true, ...result });
            return;
          }
        }
      } catch {
        // continue to next broadened query
      } finally {
        clearTimeout(timer);
      }
    }

    res.json({
      success: false,
      error: '입력된 주소의 좌표를 찾지 못했습니다. 도로명이나 행정동 이름을 확인하거나 지도에서 직접 위치를 클릭해 지정하세요.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || '좌표 변환 중 오류가 발생했습니다.',
    });
  }
});

// Express JSON error guard for /api/* routes (prevents HTML/plain-text error leaks)
app.use('/api', (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API error:', err);
  if (res.headersSent) return;
  res.status(200).json({
    success: false,
    code: 'SERVER_ERROR',
    message: 'API 요청 처리 중 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  });
});

export default app;
