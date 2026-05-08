"""
Luxe Capital — Data Harvester
══════════════════════════════════════════════════════════

Captures every stock analysis into a local data lake for:
1. AI model training (fine-tuning local LLMs instead of relying on OpenAI)
2. Backtesting (replay historical analyses on past prices)
3. Compliance / audit trail
4. RAG (retrieval-augmented generation) context

Storage layout (under backend/data_lake/):
    data_lake/
    ├── raw_financials/          # FMP API responses, partitioned by date
    │   └── 2026/05/AAPL_20260507_143205.json
    ├── analyses/                # Parquet — computed ratios + valuation
    │   └── analyses_2026_05.parquet
    ├── ai_reports/              # JSONL — AI-generated text + prompts
    │   └── ai_reports_2026_05.jsonl
    ├── price_snapshots/         # Parquet — price at moment of analysis
    │   └── prices_2026_05.parquet
    ├── interactions/            # SQLite — user queries + clicks
    │   └── interactions.db
    └── meta.json                # Index of what's been collected

Why this matters:
- OpenAI costs money + sends data to 3rd party
- Local LLM (Llama 3, Qwen) can be fine-tuned with YOUR data
- After 6 months you'll have thousands of paired (financials → analysis)
  examples — gold for fine-tuning
"""
from __future__ import annotations

import asyncio
import gzip
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

try:
    import pandas as pd
except ImportError:
    pd = None  # graceful degradation; pandas only needed for parquet

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# ─── Configuration ─────────────────────────────────────────
class HarvestConfig:
    """Where data goes and how it's organized."""

    BASE_DIR = Path(
        os.environ.get("DATA_LAKE_DIR")
        or getattr(settings, "DATA_LAKE_DIR", "")
        or "./data_lake"
    )

    RAW_FINANCIALS = BASE_DIR / "raw_financials"
    ANALYSES       = BASE_DIR / "analyses"
    AI_REPORTS     = BASE_DIR / "ai_reports"
    PRICE_SNAPS    = BASE_DIR / "price_snapshots"
    INTERACTIONS   = BASE_DIR / "interactions"

    # Compress raw responses (saves ~80%)
    GZIP_RAW = True

    # Partition strategy: by year/month
    PARTITION_FORMAT = "%Y/%m"

    @classmethod
    def ensure_dirs(cls) -> None:
        """Create all subdirs if they don't exist."""
        for path in [cls.RAW_FINANCIALS, cls.ANALYSES,
                     cls.AI_REPORTS, cls.PRICE_SNAPS, cls.INTERACTIONS]:
            path.mkdir(parents=True, exist_ok=True)


# ─── Harvester functions ───────────────────────────────────
class DataHarvester:
    """Singleton-style harvester. All write operations are async-safe."""

    _lock = asyncio.Lock()

    @classmethod
    async def save_raw_financials(
        cls,
        symbol: str,
        endpoint: str,
        raw_data: Any,
        source: str = "fmp",
    ) -> Path:
        """
        Persist raw API response.

        Args:
            symbol: e.g. "AAPL"
            endpoint: which FMP endpoint (income-statement, balance-sheet, etc.)
            raw_data: the actual API response (dict or list)
            source: "fmp", "yahoo", "setsmart", etc.

        Returns:
            Path to saved file.
        """
        HarvestConfig.ensure_dirs()
        now = datetime.now(timezone.utc)

        # Partition path
        partition = now.strftime(HarvestConfig.PARTITION_FORMAT)
        dir_path = HarvestConfig.RAW_FINANCIALS / partition / source
        dir_path.mkdir(parents=True, exist_ok=True)

        # Filename includes timestamp for uniqueness
        ts = now.strftime("%Y%m%dT%H%M%S")
        ext = ".json.gz" if HarvestConfig.GZIP_RAW else ".json"
        filename = f"{symbol}_{endpoint}_{ts}{ext}"
        filepath = dir_path / filename

        payload = {
            "symbol": symbol,
            "endpoint": endpoint,
            "source": source,
            "fetched_at": now.isoformat(),
            "data": raw_data,
        }

        async with cls._lock:
            try:
                if HarvestConfig.GZIP_RAW:
                    with gzip.open(filepath, "wt", encoding="utf-8") as f:
                        json.dump(payload, f, default=str)
                else:
                    with open(filepath, "w", encoding="utf-8") as f:
                        json.dump(payload, f, default=str, indent=2)
                logger.debug(f"Saved raw {endpoint} for {symbol} → {filepath.name}")
            except Exception as e:
                logger.warning(f"Failed to save raw financials: {e}")
                raise

        return filepath

    @classmethod
    async def save_analysis(
        cls,
        symbol: str,
        latest_year: int,
        ratios: dict,         # {ROE, ROA, Net Margin, ..., FCF, Z-Score}
        valuation: dict,      # {intrinsic_value, wacc, terminal_growth, ...}
        snapshot_price: Optional[float] = None,
        user_id: Optional[str] = None,
    ) -> None:
        """
        Append computed analysis to the parquet store.
        One row per (symbol, timestamp) — keeps every reanalysis.
        """
        if pd is None:
            logger.warning("pandas not installed — skipping analysis save")
            return

        HarvestConfig.ensure_dirs()
        now = datetime.now(timezone.utc)
        partition = now.strftime("%Y_%m")
        filepath = HarvestConfig.ANALYSES / f"analyses_{partition}.parquet"

        record = {
            "symbol": symbol,
            "analyzed_at": now.isoformat(),
            "user_id": user_id or "anon",
            "latest_year": latest_year,
            "snapshot_price": snapshot_price,
            # Ratios (flatten dict)
            "roe":              ratios.get("ROE"),
            "roa":              ratios.get("ROA"),
            "net_margin":       ratios.get("Net Profit Margin"),
            "gross_margin":     ratios.get("Gross Profit Margin"),
            "operating_margin": ratios.get("Operating Profit Margin"),
            "ebitda_margin":    ratios.get("EBITDA Margin"),
            "free_cash_flow":   ratios.get("Free Cash Flow (FCF)"),
            "operating_cf":     ratios.get("Operating Cash Flow (OCF)"),
            "debt_to_equity":   ratios.get("Debt to Equity"),
            "current_ratio":    ratios.get("Current Ratio"),
            "quick_ratio":      ratios.get("Quick Ratio"),
            "pe":               ratios.get("PE Ratio"),
            "pbv":              ratios.get("PBV Ratio"),
            "eps":               ratios.get("EPS"),
            "revenue":          ratios.get("Revenue"),
            "net_income":       ratios.get("Net Income"),
            "altman_z":         ratios.get("Altman Z-Score"),
            "wacc":             ratios.get("WACC"),
            # Valuation
            "intrinsic_value":  valuation.get("intrinsic_value_per_share"),
            "wacc_used":        valuation.get("wacc_used"),
            "terminal_growth":  valuation.get("terminal_growth_used"),
            "shares_out":       valuation.get("shares_outstanding"),
            "sector":           valuation.get("sector"),
        }

        df_new = pd.DataFrame([record])

        async with cls._lock:
            try:
                if filepath.exists():
                    df_existing = pd.read_parquet(filepath)
                    df_combined = pd.concat([df_existing, df_new], ignore_index=True)
                else:
                    df_combined = df_new
                df_combined.to_parquet(filepath, compression="snappy")
                logger.debug(f"Saved analysis for {symbol} → {filepath.name}")
            except Exception as e:
                logger.warning(f"Failed to save analysis: {e}")

    @classmethod
    async def save_ai_report(
        cls,
        symbol: str,
        prompt: str,
        response: str,
        model: str,                       # "gpt-4o", "claude-3-5-sonnet", etc.
        snapshot_metrics: dict,           # snapshot at time of generation
        tokens_used: Optional[int] = None,
        user_id: Optional[str] = None,
    ) -> None:
        """
        Append AI report to JSONL file.
        Format optimized for LLM fine-tuning (instruction → completion pairs).
        """
        HarvestConfig.ensure_dirs()
        now = datetime.now(timezone.utc)
        partition = now.strftime("%Y_%m")
        filepath = HarvestConfig.AI_REPORTS / f"ai_reports_{partition}.jsonl"

        record = {
            "id": f"{symbol}_{now.strftime('%Y%m%dT%H%M%S')}",
            "timestamp": now.isoformat(),
            "symbol": symbol,
            "user_id": user_id or "anon",
            "model": model,
            "tokens_used": tokens_used,
            "snapshot_metrics": snapshot_metrics,
            # Fine-tuning format (OpenAI / Llama compatible)
            "messages": [
                {"role": "system", "content": "You are a senior equity research analyst."},
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": response},
            ],
        }

        async with cls._lock:
            try:
                with open(filepath, "a", encoding="utf-8") as f:
                    f.write(json.dumps(record, default=str) + "\n")
                logger.debug(f"Saved AI report for {symbol} → {filepath.name}")
            except Exception as e:
                logger.warning(f"Failed to save AI report: {e}")

    @classmethod
    async def save_price_snapshot(
        cls,
        symbol: str,
        price: float,
        volume: Optional[float] = None,
        market_cap: Optional[float] = None,
        pe: Optional[float] = None,
    ) -> None:
        """Snapshot of current price at moment of analysis (for backtesting)."""
        if pd is None:
            return

        HarvestConfig.ensure_dirs()
        now = datetime.now(timezone.utc)
        partition = now.strftime("%Y_%m")
        filepath = HarvestConfig.PRICE_SNAPS / f"prices_{partition}.parquet"

        record = {
            "symbol": symbol,
            "snapshot_at": now.isoformat(),
            "price": price,
            "volume": volume,
            "market_cap": market_cap,
            "pe": pe,
        }

        df_new = pd.DataFrame([record])

        async with cls._lock:
            try:
                if filepath.exists():
                    df_existing = pd.read_parquet(filepath)
                    df_combined = pd.concat([df_existing, df_new], ignore_index=True)
                else:
                    df_combined = df_new
                df_combined.to_parquet(filepath, compression="snappy")
            except Exception as e:
                logger.warning(f"Failed to save price snapshot: {e}")


# ─── Convenience functions ─────────────────────────────────
async def harvest_full_analysis(
    symbol: str,
    raw_response: dict,
    computed: dict,           # {latest, ratios, valuation, ...}
    user_id: Optional[str] = None,
) -> None:
    """
    One-shot helper called from financials service.
    Saves raw + computed analysis + price snapshot atomically.
    """
    if not getattr(settings, "DATA_HARVEST_ENABLED", True):
        return

    try:
        latest = computed.get("latest", {})
        valuation = computed.get("valuation", {})

        await asyncio.gather(
            DataHarvester.save_raw_financials(
                symbol=symbol,
                endpoint="full",
                raw_data=raw_response,
                source=computed.get("source", "fmp"),
            ),
            DataHarvester.save_analysis(
                symbol=symbol,
                latest_year=latest.get("Year") or 0,
                ratios=latest,
                valuation=valuation,
                snapshot_price=latest.get("price"),
                user_id=user_id,
            ),
            DataHarvester.save_price_snapshot(
                symbol=symbol,
                price=latest.get("price") or 0.0,
                volume=latest.get("volume"),
                market_cap=valuation.get("market_cap"),
                pe=latest.get("PE Ratio"),
            ),
        )
    except Exception as e:
        # Never let harvest failures break user flow
        logger.warning(f"Data harvest failed for {symbol}: {e}")
