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
