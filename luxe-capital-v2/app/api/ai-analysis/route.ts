/**
 * AI Analysis API endpoint
 *
 * Strategy:
 *  1. If OPENAI_API_KEY is set -> stream from OpenAI directly (best quality)
 *  2. Else if FastAPI backend has /api/ai-analysis -> proxy to it
 *  3. Else -> return a structured rule-based mock analysis (always works)
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface Payload {
  symbol: string;
  financials: {
    latest: Record<string, any>;
    years: string[];
    trend: {
      revenue: number[];
      netIncome: number[];
      fcf: number[];
      roe: number[];
      netMargin: number[];
    };
    valuation?: {
      intrinsic_value_per_share?: number;
      wacc_used?: number;
      terminal_growth_used?: number;
    };
    currentPrice?: number;
  };
}

function buildPrompt(p: Payload) {
  const f = p.financials;
  return `You are an experienced equity analyst at Luxe Capital. Analyze ${p.symbol} using the data below and write a polished, structured report in THAI language.

LATEST FINANCIALS:
- ROE: ${f.latest?.ROE?.toFixed(2)}%
- Net Margin: ${f.latest?.['Net Profit Margin']?.toFixed(2)}%
- Gross Margin: ${f.latest?.['Gross Profit Margin']?.toFixed(2)}%
- FCF: $${((f.latest?.['Free Cash Flow (FCF)'] || 0) / 1e9).toFixed(2)}B
- D/E: ${f.latest?.['Debt to Equity']?.toFixed(2)}
- P/E: ${f.latest?.['PE Ratio']?.toFixed(2)}
- Altman Z: ${f.latest?.['Altman Z-Score']?.toFixed(2)}
- Current Price: $${f.currentPrice?.toFixed(2)}
${f.valuation?.intrinsic_value_per_share ? `- DCF Intrinsic: $${f.valuation.intrinsic_value_per_share.toFixed(2)}` : ''}

5-YEAR TRENDS:
- ROE: ${f.trend.roe.map(v => v?.toFixed(1)).join(' → ')}%
- Net Margin: ${f.trend.netMargin.map(v => v?.toFixed(1)).join(' → ')}%
- FCF ($B): ${f.trend.fcf.map(v => (v/1e9).toFixed(1)).join(' → ')}

Write a report with EXACTLY these 5 sections, each 2-4 sentences in Thai:

## 📊 Business Overview
ภาพรวมธุรกิจและความได้เปรียบในการแข่งขัน

## 💪 Strengths
จุดแข็งหลัก (อ้างตัวเลข)

## ⚠️ Concerns
ประเด็นต้องระวัง (อ้างตัวเลข)

## 🎯 Valuation Thesis
มุมมองด้านมูลค่า เปรียบเทียบราคาตลาดกับ intrinsic value

## 💼 Recommendation
ข้อเสนอแนะ (Buy/Hold/Sell) พร้อมเหตุผล และช่วงราคาเป้าหมาย

Be specific, use numbers. Write professionally but naturally in Thai.`;
}

async function streamFromOpenAI(apiKey: string, payload: Payload) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      temperature: 0.4,
      messages: [
        { role: 'system', content: 'You are a senior equity analyst. Write detailed financial analysis in Thai language. Be specific with numbers.' },
        { role: 'user', content: buildPrompt(payload) },
      ],
    }),
  });

  if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = resp.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          // Parse SSE
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const j = JSON.parse(data);
              const token = j.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(encoder.encode(token));
            } catch {}
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

function generateRuleBasedAnalysis(p: Payload): string {
  const f = p.financials;
  const latest = f.latest || {};
  const roe = latest.ROE || 0;
  const netMargin = latest['Net Profit Margin'] || 0;
  const de = latest['Debt to Equity'] || 0;
  const pe = latest['PE Ratio'] || 0;
  const fcf = (latest['Free Cash Flow (FCF)'] || 0) / 1e9;
  const z = latest['Altman Z-Score'] || 0;

  const roeTrend = f.trend.roe || [];
  const roeGrowing = roeTrend.length >= 2 && roeTrend[roeTrend.length - 1] >= roeTrend[0];
  const fcfTrend = f.trend.fcf || [];
  const fcfGrowing = fcfTrend.length >= 2 && fcfTrend[fcfTrend.length - 1] >= fcfTrend[0];

  const iv = f.valuation?.intrinsic_value_per_share || 0;
  const price = f.currentPrice || 0;
  const upside = price > 0 && iv > 0 ? ((iv - price) / price) * 100 : 0;

  const rec = upside > 15 ? 'Buy' : upside < -15 ? 'Sell' : 'Hold';

  return `## 📊 Business Overview

${p.symbol} เป็นบริษัทที่มี ROE ${roe.toFixed(1)}% ซึ่ง${roe > 20 ? 'อยู่ในระดับสูงมาก สะท้อนถึงความสามารถในการสร้างผลตอบแทนจากส่วนของผู้ถือหุ้นที่ดีเยี่ยม' : roe > 10 ? 'อยู่ในระดับที่ยอมรับได้' : 'ค่อนข้างต่ำ ควรเฝ้าระวัง'} มี Net Margin ที่ ${netMargin.toFixed(1)}% แสดงให้เห็นว่าบริษัท${netMargin > 20 ? 'มีอำนาจในการตั้งราคาและ economic moat ที่แข็งแกร่ง' : netMargin > 10 ? 'มีโครงสร้างต้นทุนที่สมเหตุสมผล' : 'เผชิญกับแรงกดดันด้านอัตรากำไร'}

## 💪 Strengths

- **ความสามารถในการทำกำไร**: ${roe > 20 ? `ROE ${roe.toFixed(1)}% สูงกว่าค่าเฉลี่ยอุตสาหกรรมอย่างมีนัยสำคัญ` : `ROE ${roe.toFixed(1)}%`}
- **กระแสเงินสด**: FCF ล่าสุดอยู่ที่ $${fcf.toFixed(1)}B ${fcfGrowing ? 'และมีแนวโน้มเติบโตต่อเนื่อง 5 ปีย้อนหลัง' : 'แต่มีความผันผวนในช่วง 5 ปีที่ผ่านมา'}
- **โครงสร้างการเงิน**: Altman Z-Score อยู่ที่ ${z.toFixed(2)} ${z > 3 ? 'อยู่ใน Safe Zone บ่งชี้ความเสี่ยงล้มละลายต่ำ' : z > 1.8 ? 'อยู่ใน Grey Zone ควรติดตามอย่างต่อเนื่อง' : 'อยู่ใน Distress Zone ต้องระวังเป็นพิเศษ'}
${roeGrowing ? '- **แนวโน้มปรับตัว**: ROE มีทิศทางเติบโตตลอดช่วง 5 ปี' : ''}

## ⚠️ Concerns

- **ระดับหนี้**: D/E อยู่ที่ ${de.toFixed(2)} ${de > 2 ? 'สูงเกินค่าปกติของอุตสาหกรรม เพิ่มความเสี่ยงทางการเงิน' : de > 1 ? 'อยู่ในระดับที่ต้องจับตา' : 'อยู่ในระดับอนุรักษ์นิยม'}
- **การประเมินมูลค่า**: P/E ที่ ${pe.toFixed(1)} ${pe > 30 ? 'สะท้อนความคาดหวังการเติบโตสูง หากผลประกอบการไม่ตามที่คาดหมายอาจมีการปรับฐานแรง' : pe > 15 ? 'อยู่ในระดับปานกลาง' : 'ค่อนข้างต่ำ อาจมีโอกาสในการลงทุน'}
${!fcfGrowing ? '- **กระแสเงินสด**: FCF มีความผันผวนค่อนข้างสูง ต้องวิเคราะห์สาเหตุให้ชัดเจน' : ''}

## 🎯 Valuation Thesis

${iv > 0 && price > 0 ?
  `จากการคำนวณ DCF ได้ intrinsic value ที่ $${iv.toFixed(2)} ต่อหุ้น เทียบกับราคาตลาดปัจจุบัน $${price.toFixed(2)} สะท้อน${upside > 0 ? 'ส่วนลด' : 'ส่วนเกินมูลค่า'} ${Math.abs(upside).toFixed(1)}% ${upside > 15 ? 'เป็นโอกาสการลงทุนที่น่าสนใจเมื่อพิจารณาความปลอดภัยเชิงมูลค่า (margin of safety)' : upside < -15 ? 'ราคาปัจจุบันสะท้อนความคาดหวังที่สูงเกินพื้นฐานธุรกิจ' : 'ราคาสะท้อนมูลค่าที่เหมาะสมค่อนข้างใกล้เคียงกับปัจจัยพื้นฐาน'}` :
  `ข้อมูล DCF ยังไม่พร้อม ควรใช้ relative valuation (P/E, EV/EBITDA) เปรียบเทียบกับกลุ่มเดียวกัน`
}

## 💼 Recommendation

**คำแนะนำ: ${rec}**

${rec === 'Buy' ?
  `ราคาปัจจุบันต่ำกว่า fair value อย่างมีนัยสำคัญ ประกอบกับคุณภาพธุรกิจที่สะท้อนจาก ROE ${roe.toFixed(1)}% และ margin ที่แข็งแกร่ง น่าจะให้ผลตอบแทนที่ดีในระยะกลางถึงยาว (3-5 ปี) ช่วงราคาเป้าหมาย: $${(iv * 0.9).toFixed(0)} – $${(iv * 1.1).toFixed(0)}` :
  rec === 'Sell' ?
  `ราคาปัจจุบันสูงกว่าพื้นฐานมากเกินไป มีความเสี่ยงการปรับตัวลง ควรรอจังหวะซื้อที่ราคาต่ำกว่านี้หรือสับเปลี่ยนเข้าหุ้นที่มีส่วนลดมากกว่า` :
  `ราคาปัจจุบันสะท้อนมูลค่าเหมาะสม เหมาะสำหรับผู้ถือระยะยาวที่ต้องการคุณภาพ แต่ upside จำกัด ควร accumulate เมื่อราคาลดลง`
}

---

*การวิเคราะห์นี้อิงจากข้อมูลเชิงปริมาณเท่านั้น ควรพิจารณาปัจจัยเชิงคุณภาพเพิ่มเติม เช่น management quality, competitive landscape, regulatory risks ประกอบการตัดสินใจ*`;
}

function streamText(text: string): ReadableStream {
  const encoder = new TextEncoder();
  const chunks = text.split(/(\s+)/); // split by whitespace

  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((r) => setTimeout(r, 10)); // typing effect
      }
      controller.close();
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload: Payload = await req.json();

    // Strategy 1: OpenAI streaming
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const stream = await streamFromOpenAI(openaiKey, payload);
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Source': 'openai',
          },
        });
      } catch (e) {
        console.error('OpenAI error:', e);
        // fall through
      }
    }

    // Strategy 2: FastAPI proxy (if backend has /api/ai-analysis)
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    try {
      const r = await fetch(`${backendUrl}/api/ai-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: payload.symbol }),
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.analysis) {
          return new Response(streamText(data.analysis), {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Source': 'fastapi' },
          });
        }
      }
    } catch {}

    // Strategy 3: Rule-based fallback (always works)
    const text = generateRuleBasedAnalysis(payload);
    return new Response(streamText(text), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Source': 'rule-based',
      },
    });
  } catch (e: any) {
    return Response.json(
      { error: e.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
