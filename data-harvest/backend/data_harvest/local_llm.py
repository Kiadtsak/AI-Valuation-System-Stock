"""
Local LLM provider — replace OpenAI with Ollama / LM Studio / vLLM.

After collecting enough training data, you can:
1. Fine-tune a local model with your harvested data
2. Replace OpenAI calls with this provider
3. Run completely offline / private

Supported backends:
- Ollama (easiest — http://localhost:11434)
- LM Studio (http://localhost:1234)
- vLLM (http://localhost:8000)

Setup Ollama on Mac:
    brew install ollama
    ollama pull llama3.2:3b      # small/fast
    ollama pull qwen2.5:7b       # better quality
    ollama serve                  # runs on :11434

Or fine-tune your own:
    # 1. Export training data
    python -m app.data_harvest.export_training --format alpaca --out training.jsonl

    # 2. Fine-tune (using axolotl/unsloth)
    accelerate launch -m axolotl.cli.train your-config.yml

    # 3. Convert to GGUF for Ollama
    python convert.py --outtype f16 --outfile model.gguf model_dir/
    ollama create luxe-analyst -f Modelfile
"""
from __future__ import annotations

import json
from typing import AsyncIterator, Optional

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class LocalLLMProvider:
    """
    Drop-in replacement for OpenAI client.
    Uses Ollama-compatible API (most local LLM servers support this).
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 120.0,
    ):
        self.base_url = base_url or getattr(settings, "LOCAL_LLM_URL", "http://localhost:11434")
        self.model = model or getattr(settings, "LOCAL_LLM_MODEL", "llama3.2:3b")
        self.timeout = timeout

    async def health_check(self) -> bool:
        """Check if local LLM server is up."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 2000,
    ) -> str:
        """
        Single-shot chat completion (non-streaming).
        Equivalent to: openai.chat.completions.create(...)
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                r = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens,
                        },
                    },
                )
                r.raise_for_status()
                data = r.json()
                return data.get("message", {}).get("content", "")
            except httpx.HTTPError as e:
                logger.error(f"Local LLM chat failed: {e}")
                raise

    async def stream(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 2000,
    ) -> AsyncIterator[str]:
        """
        Streaming chat — yields text chunks.
        Compatible with FastAPI StreamingResponse / SSE.
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    },
                },
            ) as response:
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                        content = chunk.get("message", {}).get("content", "")
                        if content:
                            yield content
                        if chunk.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue


# ─── AI provider router ────────────────────────────────────
async def get_llm_provider():
    """
    Smart provider selector:
    - Try local LLM first (free, private)
    - Fall back to OpenAI if local unavailable
    - Fall back to rule-based if nothing works
    """
    use_local = getattr(settings, "USE_LOCAL_LLM", False)

    if use_local:
        local = LocalLLMProvider()
        if await local.health_check():
            return ("local", local)
        else:
            logger.warning("Local LLM not reachable, falling back to OpenAI")

    if getattr(settings, "OPENAI_API_KEY", ""):
        return ("openai", None)  # caller imports OpenAI directly

    return ("rule_based", None)


# ─── Example: AI report generation with auto-fallback ───────
async def generate_analysis_report(
    symbol: str,
    metrics: dict,
    user_id: Optional[str] = None,
) -> tuple[str, str]:
    """
    Generate an AI equity research report.
    Returns (report_text, source) where source is 'local' | 'openai' | 'rule_based'.

    Auto-saves to data lake for future training.
    """
    from .harvester import DataHarvester

    prompt = _build_prompt(symbol, metrics)

    provider_type, provider = await get_llm_provider()

    if provider_type == "local":
        try:
            response = await provider.chat([
                {"role": "system", "content": "You are a senior equity research analyst."},
                {"role": "user", "content": prompt},
            ])
            await DataHarvester.save_ai_report(
                symbol=symbol,
                prompt=prompt,
                response=response,
                model=provider.model,
                snapshot_metrics=metrics,
                user_id=user_id,
            )
            return response, "local"
        except Exception as e:
            logger.error(f"Local LLM failed: {e}, falling back to OpenAI")

    if provider_type == "openai":
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            r = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a senior equity research analyst."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
            )
            response = r.choices[0].message.content or ""

            await DataHarvester.save_ai_report(
                symbol=symbol,
                prompt=prompt,
                response=response,
                model="gpt-4o",
                snapshot_metrics=metrics,
                tokens_used=r.usage.total_tokens if r.usage else None,
                user_id=user_id,
            )
            return response, "openai"
        except Exception as e:
            logger.error(f"OpenAI failed: {e}, falling back to rule-based")

    # Rule-based fallback (always works)
    response = _rule_based_analysis(symbol, metrics)
    await DataHarvester.save_ai_report(
        symbol=symbol, prompt=prompt, response=response,
        model="rule_based", snapshot_metrics=metrics, user_id=user_id,
    )
    return response, "rule_based"


def _build_prompt(symbol: str, m: dict) -> str:
    return f"""Analyze {symbol} based on these latest financials:

Profitability:
- ROE: {m.get('ROE', 'N/A'):.2f}%
- ROA: {m.get('ROA', 'N/A'):.2f}%
- Net Margin: {m.get('Net Profit Margin', 'N/A'):.2f}%

Valuation:
- P/E: {m.get('PE Ratio', 'N/A'):.2f}
- P/BV: {m.get('PBV Ratio', 'N/A'):.2f}

Health:
- Debt/Equity: {m.get('Debt to Equity', 'N/A'):.2f}
- Current Ratio: {m.get('Current Ratio', 'N/A'):.2f}
- Altman Z-Score: {m.get('Altman Z-Score', 'N/A'):.2f}

Cash:
- Free Cash Flow: ${(m.get('Free Cash Flow (FCF)', 0) / 1e9):.2f}B

Provide a concise institutional-grade analysis with these sections:
1. Investment Thesis (2-3 sentences)
2. Strengths (bullet points)
3. Risks (bullet points)
4. Verdict (BUY / HOLD / SELL with reasoning)"""


def _rule_based_analysis(symbol: str, m: dict) -> str:
    """Simple template-based fallback. Always works, no API needed."""
    roe = m.get("ROE", 0)
    de = m.get("Debt to Equity", 0)
    z = m.get("Altman Z-Score", 0)
    fcf = m.get("Free Cash Flow (FCF)", 0)

    verdict = "HOLD"
    if roe > 20 and de < 1.0 and z > 2.6 and fcf > 0:
        verdict = "BUY"
    elif roe < 5 or de > 2.5 or z < 1.8:
        verdict = "SELL"

    return f"""## Investment Thesis
{symbol} demonstrates {'strong' if roe > 15 else 'modest'} profitability \
with ROE of {roe:.1f}%. Balance sheet shows D/E of {de:.2f} \
({'concerning' if de > 2 else 'manageable'}).

## Strengths
- ROE: {roe:.2f}% — {'top quartile' if roe > 20 else 'industry average' if roe > 10 else 'below average'}
- Free Cash Flow: ${fcf/1e9:.2f}B {'(positive)' if fcf > 0 else '(negative — concern)'}
- Altman Z-Score: {z:.2f} {'(safe)' if z > 2.6 else '(grey zone)' if z > 1.8 else '(distressed)'}

## Risks
- {'High debt load' if de > 1.5 else 'Manageable leverage'}
- {'Profitability under pressure' if roe < 10 else 'Profitability healthy'}

## Verdict: {verdict}
This is a rule-based assessment. For deeper analysis, enable AI provider.
"""
