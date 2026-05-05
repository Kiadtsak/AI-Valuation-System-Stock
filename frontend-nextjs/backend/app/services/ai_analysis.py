"""
AI Analysis service.
- Caches AI reports for 6 hours (saves $$$)
- Calls OpenAI if key set
- Falls back to rule-based template if no key
"""
from datetime import datetime
from typing import Any

import httpx

from app.core.config import settings
from app.core.cache import cache_get, cache_set
from app.core.logging import get_logger

logger = get_logger(__name__)


def _build_prompt(data: dict) -> str:
    latest = data.get("latest", {})
    rows = data.get("result", [])
    valuation = data.get("valuation", {}) or {}

    roe_trend = " → ".join(f"{r.get('ROE', 0):.1f}" for r in rows[-5:])
    fcf_trend = " → ".join(f"{(r.get('Free Cash Flow (FCF)', 0) or 0)/1e9:.1f}" for r in rows[-5:])

    return f"""You are a senior equity analyst at Luxe Capital. Analyze {data['symbol']} and write a polished research memo in THAI.

LATEST FINANCIALS:
- ROE: {latest.get('ROE', 0):.2f}%
- Net Margin: {latest.get('Net Profit Margin', 0):.2f}%
- Gross Margin: {latest.get('Gross Profit Margin', 0):.2f}%
- FCF: ${(latest.get('Free Cash Flow (FCF)', 0) or 0)/1e9:.2f}B
- D/E: {latest.get('Debt to Equity', 0):.2f}
- P/E: {latest.get('PE Ratio', 0):.2f}
- Altman Z: {latest.get('Altman Z-Score', 0):.2f}
- Current Price: ${latest.get('price', 0):.2f}
{f"- DCF Intrinsic: ${valuation.get('intrinsic_value_per_share', 0):.2f}" if valuation.get('intrinsic_value_per_share') else ""}

5-YEAR TRENDS:
- ROE: {roe_trend}%
- FCF ($B): {fcf_trend}

Write EXACTLY these sections in Thai (each 2-4 sentences):

## 📊 Business Overview
## 💪 Strengths
## ⚠️ Concerns
## 🎯 Valuation Thesis
## 💼 Recommendation

Be specific with numbers. Professional tone."""


async def call_openai(prompt: str) -> str:
    """Call OpenAI API. Raises on error."""
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.OPENAI_MODEL,
                "temperature": 0.4,
                "messages": [
                    {"role": "system", "content": "You are a senior equity analyst writing in Thai."},
                    {"role": "user", "content": prompt},
                ],
            },
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


def rule_based_analysis(data: dict) -> str:
    """Fallback when no OpenAI key. Uses real data, in Thai."""
    latest = data.get("latest", {})
    valuation = data.get("valuation", {}) or {}
    sym = data["symbol"]

    roe = latest.get("ROE", 0)
    nm = latest.get("Net Profit Margin", 0)
    de = latest.get("Debt to Equity", 0)
    pe = latest.get("PE Ratio", 0)
    fcf = (latest.get("Free Cash Flow (FCF)", 0) or 0) / 1e9
    z = latest.get("Altman Z-Score", 0)
    iv = valuation.get("intrinsic_value_per_share", 0) or 0
    price = latest.get("price", 0) or 0
    upside = ((iv - price) / price * 100) if price > 0 and iv > 0 else 0

    rec = "Buy" if upside > 15 else "Sell" if upside < -15 else "Hold"

    return f"""## 📊 Business Overview

{sym} เป็นบริษัทที่มี ROE {roe:.1f}% ซึ่ง{'อยู่ในระดับสูง สะท้อนความสามารถในการสร้างผลตอบแทนจากส่วนของผู้ถือหุ้น' if roe > 15 else 'อยู่ในระดับปานกลาง'} โดยมี Net Margin ที่ {nm:.1f}% {'แสดงถึงอำนาจการตั้งราคาและ economic moat ที่แข็งแกร่ง' if nm > 15 else 'ซึ่งเป็นมาตรฐานของอุตสาหกรรม'}

## 💪 Strengths

- **Profitability**: ROE {roe:.1f}% และ Net Margin {nm:.1f}%
- **Cash Generation**: FCF ${fcf:.1f}B
- **Financial Health**: Altman Z {z:.2f} {'(Safe Zone)' if z > 3 else '(Grey Zone)' if z > 1.8 else '(Distress)'}

## ⚠️ Concerns

- **Leverage**: D/E {de:.2f} {'อยู่ในระดับสูง ต้องระวังความเสี่ยงทางการเงิน' if de > 1.5 else 'อยู่ในระดับยอมรับได้'}
- **Valuation**: P/E {pe:.1f} {'สูงกว่ามาตรฐาน' if pe > 25 else 'อยู่ในระดับสมเหตุสมผล'}

## 🎯 Valuation Thesis

{f'DCF intrinsic value อยู่ที่ ${iv:.2f} ต่อหุ้น เทียบกับราคาตลาด ${price:.2f} = {upside:+.1f}%' if iv > 0 and price > 0 else 'ข้อมูล DCF ยังไม่พร้อม'}

## 💼 Recommendation

**{rec}** — {'มี margin of safety ที่น่าสนใจ' if rec == 'Buy' else 'ราคาสูงกว่าพื้นฐาน' if rec == 'Sell' else 'ราคาเหมาะสม รอจังหวะที่ดีกว่า'}

---

*การวิเคราะห์เชิงปริมาณเท่านั้น ควรพิจารณาปัจจัยเชิงคุณภาพประกอบ*"""


async def get_ai_analysis(symbol: str, financials: dict, force_refresh: bool = False) -> dict[str, Any]:
    """
    Returns:
        {"symbol": str, "analysis": str, "cached": bool, "generated_at": str}
    """
    cache_key = f"ai:analysis:{symbol.upper()}"

    if not force_refresh:
        cached = await cache_get(cache_key)
        if cached:
            logger.info(f"AI analysis cache HIT: {symbol}")
            return {**cached, "cached": True}

    prompt = _build_prompt(financials)

    try:
        if settings.OPENAI_API_KEY:
            analysis = await call_openai(prompt)
            source = "openai"
        else:
            analysis = rule_based_analysis(financials)
            source = "rule-based"
    except Exception as e:
        logger.warning(f"OpenAI failed, falling back to rule-based: {e}")
        analysis = rule_based_analysis(financials)
        source = "rule-based-fallback"

    result = {
        "symbol": symbol.upper(),
        "analysis": analysis,
        "source": source,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "cached": False,
    }

    await cache_set(cache_key, result, ttl=settings.CACHE_TTL_AI)
    return result
