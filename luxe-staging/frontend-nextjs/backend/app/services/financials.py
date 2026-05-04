"""
Financial data fetching with caching and validation.
Wraps FMP API calls + applies CashFlowModel calculations.
"""
import asyncio
import json
from pathlib import Path
from typing import Any, Optional

import httpx
from app.core.config import settings
from app.core.cache import cache_get, cache_set
from app.core.logging import get_logger

logger = get_logger(__name__)

# Try to import the patched local model (if user has it)
try:
    from Blackend.CashFlowModel import CashFlowModel
    from Blackend.calculater_all import calculate_ratios_by_year
    LOCAL_MODEL_AVAILABLE = True
except ImportError:
    LOCAL_MODEL_AVAILABLE = False
    logger.warning("Local CashFlowModel not found — using simplified calculations")


class FMPClient:
    """Async client for FinancialModelingPrep with caching."""

    def __init__(self):
        self.base = settings.FMP_BASE_URL
        self.key = settings.FMP_API_KEY
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()

    async def _fetch(self, endpoint: str, **params) -> Any:
        """Cached GET to FMP API."""
        cache_key = f"fmp:{endpoint}:{json.dumps(params, sort_keys=True)}"

        # Try cache first
        cached = await cache_get(cache_key)
        if cached is not None:
            logger.debug(f"FMP cache HIT: {endpoint}")
            return cached

        if not self.key:
            raise ValueError("FMP_API_KEY not configured")

        url = f"{self.base}/{endpoint}"
        params["apikey"] = self.key

        try:
            client = await self._get_client()
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"FMP HTTP {e.response.status_code}: {endpoint}")
            raise
        except Exception as e:
            logger.error(f"FMP fetch failed: {endpoint}: {e}")
            raise

        # Cache for 24 hours
        await cache_set(cache_key, data, ttl=settings.CACHE_TTL_SECONDS)
        logger.info(f"FMP cache MISS: {endpoint} (cached for 24h)")
        return data

    async def income_statement(self, symbol: str, limit: int = 5) -> list[dict]:
        return await self._fetch(f"income-statement/{symbol}", limit=limit)

    async def balance_sheet(self, symbol: str, limit: int = 5) -> list[dict]:
        return await self._fetch(f"balance-sheet-statement/{symbol}", limit=limit)

    async def cash_flow(self, symbol: str, limit: int = 5) -> list[dict]:
        return await self._fetch(f"cash-flow-statement/{symbol}", limit=limit)

    async def quote(self, symbol: str) -> dict:
        data = await self._fetch(f"quote/{symbol}")
        return data[0] if data else {}

    async def profile(self, symbol: str) -> dict:
        data = await self._fetch(f"profile/{symbol}")
        return data[0] if data else {}

    async def get_all(self, symbol: str, limit: int = 5) -> dict:
        """Fetch all 4 endpoints concurrently."""
        try:
            results = await asyncio.gather(
                self.income_statement(symbol, limit),
                self.balance_sheet(symbol, limit),
                self.cash_flow(symbol, limit),
                self.profile(symbol),
                return_exceptions=True,
            )
        except Exception as e:
            logger.error(f"FMP get_all failed for {symbol}: {e}")
            raise

        # Check all results
        labels = ["income", "balance", "cashflow", "profile"]
        out: dict[str, Any] = {}
        for label, result in zip(labels, results):
            if isinstance(result, Exception):
                logger.warning(f"FMP {label} failed for {symbol}: {result}")
                out[label] = [] if label != "profile" else {}
            else:
                out[label] = result
        return out


# Singleton
fmp_client = FMPClient()


def _normalize_fmp_to_yearly(raw: dict) -> tuple[dict, dict, dict, dict]:
    """
    Convert FMP's list-of-dicts format (one per year) to year-keyed dicts.
    Returns: (income_data, balance_data, cashflow_data, basic_info)
    """
    def by_year(rows: list[dict]) -> dict:
        out = {}
        for r in rows:
            year = r.get("calendarYear") or r.get("date", "")[:4]
            if year:
                out[str(year)] = r
        return out

    return (
        by_year(raw.get("income", [])),
        by_year(raw.get("balance", [])),
        by_year(raw.get("cashflow", [])),
        raw.get("profile", {}) or {},
    )


def _map_fmp_to_local_keys(income: dict, balance: dict, cashflow: dict, profile: dict) -> tuple[dict, dict, dict]:
    """
    FMP uses different key names than local CashFlowModel expects.
    This adapter maps them so calculate_ratios_by_year works.
    """
    def map_income(d: dict) -> dict:
        if not d:
            return {}
        return {
            "Revenue": d.get("revenue", 0),
            "Cost of Goods Sold": d.get("costOfRevenue", 0),
            "Gross Profit": d.get("grossProfit", 0),
            "Operating Income": d.get("operatingIncome", 0),
            "EBIT": d.get("operatingIncome", 0),
            "EBITDA": d.get("ebitda", 0),
            "Net Income": d.get("netIncome", 0),
            "EPS": d.get("eps", 0),
            "Weighted Average Shares": d.get("weightedAverageShsOut", 0),
            "Weighted Average Shares Diluted": d.get("weightedAverageShsOutDil", 0),
            "Interest Expense": d.get("interestExpense", 0),
            "Depreciation and Amortization": d.get("depreciationAndAmortization", 0),
            "price": profile.get("price", 0),
        }

    def map_balance(d: dict) -> dict:
        if not d:
            return {}
        return {
            "Total Assets": d.get("totalAssets", 0),
            "Total Current Assets": d.get("totalCurrentAssets", 0),
            "Total Liabilities": d.get("totalLiabilities", 0),
            "Total Current Liabilities": d.get("totalCurrentLiabilities", 0),
            "Total Shareholder Equity": d.get("totalStockholdersEquity", 0),
            "Total Equity": d.get("totalEquity", 0),
            "Total Debt": d.get("totalDebt", 0),
            "Cash and Cash Equivalents": d.get("cashAndCashEquivalents", 0),
            "Short Term Investments": d.get("shortTermInvestments", 0),
            "Inventory": d.get("inventory", 0),
            "Accounts Receivable": d.get("netReceivables", 0),
            "Retained Earnings": d.get("retainedEarnings", 0),
        }

    def map_cf(d: dict) -> dict:
        if not d:
            return {}
        return {
            "Operating Cash Flow": d.get("operatingCashFlow", 0),
            "Free Cash Flow": d.get("freeCashFlow", 0),
            "Capital Expenditure": d.get("capitalExpenditure", 0),
            "Stock Based Compensation": d.get("stockBasedCompensation", 0),
            "Other Non Cash Items": d.get("otherNonCashItems", 0),
            "Change in Working Capital": d.get("changeInWorkingCapital", 0),
            "Depreciation and Amortization": d.get("depreciationAndAmortization", 0),
            "Interest Paid": abs(d.get("interestPaid", 0) or 0),
        }

    return (
        {y: map_income(v) for y, v in income.items()},
        {y: map_balance(v) for y, v in balance.items()},
        {y: map_cf(v) for y, v in cashflow.items()},
    )


async def fetch_financials(symbol: str, refresh: bool = False) -> dict:
    """
    Main entry point. Returns full FinancialsResponse-shaped dict.
    Caches at the high level (per symbol, 24h).
    """
    cache_key = f"financials:full:{symbol.upper()}"

    if not refresh:
        cached = await cache_get(cache_key)
        if cached:
            logger.info(f"Financials cache HIT: {symbol}")
            return cached

    # Fetch raw from FMP
    raw = await fmp_client.get_all(symbol)
    income_data, balance_data, cashflow_data, profile = _normalize_fmp_to_yearly(raw)

    if not (income_data and balance_data and cashflow_data):
        raise ValueError(f"No financial data available for {symbol}")

    # Map to local model's expected keys
    income_mapped, balance_mapped, cashflow_mapped = _map_fmp_to_local_keys(
        income_data, balance_data, cashflow_data, profile
    )

    # Calculate ratios using local CashFlowModel
    if LOCAL_MODEL_AVAILABLE:
        results_dict = calculate_ratios_by_year(
            income_mapped, balance_mapped, cashflow_mapped, profile
        ) or {}
    else:
        results_dict = {}

    # Convert to row format expected by frontend
    result_rows = []
    for year in sorted(results_dict.keys()):
        row = {"Stock Symbol": symbol.upper(), "Year": int(year)}
        row.update(results_dict[year])
        # add price from profile
        row["price"] = profile.get("price", 0)
        # add raw revenue/net income for AI analysis
        row["Revenue"] = income_mapped.get(year, {}).get("Revenue", 0)
        row["Net Income"] = income_mapped.get(year, {}).get("Net Income", 0)
        result_rows.append(row)

    # Build pivot ratios
    ratios: dict[str, dict[str, float]] = {}
    for row in result_rows:
        for k, v in row.items():
            if k in ("Year", "Stock Symbol") or not isinstance(v, (int, float)):
                continue
            ratios.setdefault(k, {})[str(row["Year"])] = v

    response = {
        "symbol": symbol.upper(),
        "years": [str(r["Year"]) for r in result_rows],
        "result": result_rows,
        "ratios": ratios,
        "latest": result_rows[-1] if result_rows else {},
        "valuation": {
            "symbol": symbol.upper(),
            "sector": profile.get("sector"),
            "shares_outstanding": profile.get("mktCap", 0) / max(profile.get("price", 1), 1),
            "wacc_used": result_rows[-1].get("WACC") if result_rows else None,
            "terminal_growth_used": 0.03,
        },
        "source_file": None,
    }

    await cache_set(cache_key, response, ttl=settings.CACHE_TTL_SECONDS)
    return response
