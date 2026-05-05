"""
SET (Stock Exchange of Thailand) data provider.

Strategy:
1. Primary: SETSMART API (paid, official) — if API key configured
2. Fallback: SETTRADE.com public endpoints (parsed)
3. Adapter layer to normalize to same shape as FMP data

Common Thai tickers:
- PTT, KBANK, SCB, AOT, CPALL, ADVANC, BBL, BDMS, etc.
- Suffix .BK for Yahoo Finance compatibility (e.g., PTT.BK)
"""
import asyncio
from typing import Optional
import httpx

from app.core.config import settings
from app.core.cache import cache_get, cache_set
from app.core.logging import get_logger

logger = get_logger(__name__)


# ─── Common Thai Sector Tickers ─────────────────────────
THAI_TICKER_INFO = {
    # Banks
    "KBANK": {"name": "Kasikornbank", "sector": "Banking"},
    "SCB":   {"name": "SCB X", "sector": "Banking"},
    "BBL":   {"name": "Bangkok Bank", "sector": "Banking"},
    "KTB":   {"name": "Krung Thai Bank", "sector": "Banking"},
    # Energy
    "PTT":   {"name": "PTT", "sector": "Energy"},
    "PTTEP": {"name": "PTT E&P", "sector": "Energy"},
    "GULF":  {"name": "Gulf Energy", "sector": "Utilities"},
    # Retail
    "CPALL": {"name": "CP All", "sector": "Retail"},
    "CPF":   {"name": "Charoen Pokphand Foods", "sector": "Food"},
    "CPN":   {"name": "Central Pattana", "sector": "Real Estate"},
    "BJC":   {"name": "Berli Jucker", "sector": "Retail"},
    # Telecom
    "ADVANC": {"name": "Advanced Info Service", "sector": "Telecom"},
    "TRUE":   {"name": "True Corporation", "sector": "Telecom"},
    # Healthcare
    "BDMS":  {"name": "Bangkok Dusit Medical", "sector": "Healthcare"},
    "BH":    {"name": "Bumrungrad Hospital", "sector": "Healthcare"},
    # Transportation
    "AOT":   {"name": "Airports of Thailand", "sector": "Transport"},
    "BTS":   {"name": "BTS Group", "sector": "Transport"},
    # Materials
    "SCC":   {"name": "Siam Cement", "sector": "Materials"},
    "PTTGC": {"name": "PTT Global Chemical", "sector": "Materials"},
}


def is_thai_symbol(symbol: str) -> bool:
    """Detect if symbol is a Thai ticker."""
    s = symbol.upper().strip()
    return s in THAI_TICKER_INFO or s.endswith(".BK") or s.endswith(".SET")


def normalize_thai_symbol(symbol: str) -> str:
    """Convert ABC.BK → ABC, leave plain symbols alone."""
    s = symbol.upper().strip()
    return s.replace(".BK", "").replace(".SET", "")


# ─── SETSMART API (official, paid) ──────────────────────
class SETSmartClient:
    """Official SET data via SETSMART API. Requires subscription."""

    def __init__(self):
        self.base_url = settings.SETSMART_BASE_URL
        self.api_key = settings.SETSMART_API_KEY
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()

    async def _fetch(self, endpoint: str, **params) -> dict:
        """Authenticated fetch with caching."""
        cache_key = f"setsmart:{endpoint}:{params}"
        cached = await cache_get(cache_key)
        if cached is not None:
            return cached

        if not self.api_key:
            raise ValueError("SETSMART_API_KEY not configured")

        client = await self._get_client()
        try:
            r = await client.get(
                f"{self.base_url}/{endpoint}",
                params=params,
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            r.raise_for_status()
            data = r.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"SETSMART {endpoint} returned {e.response.status_code}")
            raise

        await cache_set(cache_key, data, ttl=settings.CACHE_TTL_SECONDS)
        return data

    async def get_company(self, symbol: str) -> dict:
        return await self._fetch(f"company/{symbol}")

    async def get_financials(self, symbol: str, years: int = 5) -> dict:
        return await self._fetch(f"financials/{symbol}", years=years)

    async def get_quote(self, symbol: str) -> dict:
        return await self._fetch(f"quote/{symbol}")


# ─── Public/Fallback: Yahoo Finance via httpx ───────────
async def fetch_yahoo_thai(symbol: str) -> dict:
    """
    Fetch via Yahoo Finance public endpoints (free, rate-limited).
    Used as fallback when SETSMART not available.
    """
    sym = symbol.upper().strip()
    if not sym.endswith(".BK"):
        sym = f"{sym}.BK"

    cache_key = f"yahoo:thai:{sym}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

    headers = {"User-Agent": "Mozilla/5.0 (LuxeCapital/1.0)"}

    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        try:
            # Quote summary endpoint (financials, balance, cash flow, key stats)
            modules = (
                "summaryDetail,financialData,defaultKeyStatistics,"
                "incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory,"
                "assetProfile"
            )
            r = await client.get(
                f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{sym}",
                params={"modules": modules},
            )
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            logger.error(f"Yahoo fetch failed for {sym}: {e}")
            return {}

    await cache_set(cache_key, data, ttl=settings.CACHE_TTL_SECONDS)
    return data


# ─── Adapter: Yahoo → Luxe format ───────────────────────
def _yahoo_to_luxe_format(symbol: str, raw: dict) -> dict:
    """Transform Yahoo's response into our expected schema."""
    if not raw or "quoteSummary" not in raw:
        return {}

    result = (raw["quoteSummary"].get("result") or [{}])[0]
    if not result:
        return {}

    profile_mod = result.get("assetProfile", {})
    summary = result.get("summaryDetail", {})
    fin_data = result.get("financialData", {})
    key_stats = result.get("defaultKeyStatistics", {})

    income_history = (
        result.get("incomeStatementHistory", {}).get("incomeStatementHistory") or []
    )
    balance_history = (
        result.get("balanceSheetHistory", {}).get("balanceSheetStatements") or []
    )
    cf_history = (
        result.get("cashflowStatementHistory", {}).get("cashflowStatements") or []
    )

    def raw_val(d: dict, key: str) -> Optional[float]:
        v = d.get(key)
        if isinstance(v, dict):
            return v.get("raw")
        return v

    # Build per-year data
    rows = []
    for inc, bal, cf in zip(income_history, balance_history, cf_history):
        date_str = inc.get("endDate", {}).get("fmt", "")
        year = int(date_str[:4]) if date_str else None
        if not year:
            continue

        revenue = raw_val(inc, "totalRevenue") or 0
        net_income = raw_val(inc, "netIncome") or 0
        gross_profit = raw_val(inc, "grossProfit") or 0
        op_income = raw_val(inc, "operatingIncome") or 0

        total_assets = raw_val(bal, "totalAssets") or 0
        total_eq = raw_val(bal, "totalStockholderEquity") or 0
        total_liab = raw_val(bal, "totalLiab") or 0
        total_debt = (raw_val(bal, "shortLongTermDebt") or 0) + (raw_val(bal, "longTermDebt") or 0)
        ca = raw_val(bal, "totalCurrentAssets") or 0
        cl = raw_val(bal, "totalCurrentLiabilities") or 0
        cash = raw_val(bal, "cash") or 0
        inventory = raw_val(bal, "inventory") or 0

        ocf = raw_val(cf, "totalCashFromOperatingActivities") or 0
        capex = raw_val(cf, "capitalExpenditures") or 0
        fcf = ocf + capex  # capex is negative in Yahoo

        # Compute ratios
        roe = (net_income / total_eq * 100) if total_eq > 0 else 0
        roa = (net_income / total_assets * 100) if total_assets > 0 else 0
        net_margin = (net_income / revenue * 100) if revenue > 0 else 0
        gross_margin = (gross_profit / revenue * 100) if revenue > 0 else 0
        op_margin = (op_income / revenue * 100) if revenue > 0 else 0
        de = total_debt / total_eq if total_eq > 0 else 0
        cur_ratio = ca / cl if cl > 0 else 0
        quick = (ca - inventory) / cl if cl > 0 else 0

        # Altman Z-Score
        wc = ca - cl
        A = wc / total_assets if total_assets > 0 else 0
        C = op_income / total_assets if total_assets > 0 else 0
        D = total_eq / total_liab if total_liab > 0 else 0
        E = revenue / total_assets if total_assets > 0 else 0
        z_score = 1.2 * A + 1.4 * 0.15 + 3.3 * C + 0.6 * D + 1.0 * E

        rows.append({
            "Stock Symbol": symbol.replace(".BK", ""),
            "Year": year,
            "Revenue": revenue,
            "Net Income": net_income,
            "ROE": roe,
            "ROA": roa,
            "Net Profit Margin": net_margin,
            "Gross Profit Margin": gross_margin,
            "Operating Profit Margin": op_margin,
            "EBITDA Margin": op_margin,  # approximation
            "Free Cash Flow (FCF)": fcf,
            "Operating Cash Flow (OCF)": ocf,
            "Debt to Equity": de,
            "Current Ratio": cur_ratio,
            "Quick Ratio": quick,
            "PE Ratio": raw_val(summary, "trailingPE") or 0,
            "PBV Ratio": raw_val(key_stats, "priceToBook") or 0,
            "EPS": raw_val(key_stats, "trailingEps") or 0,
            "Altman Z-Score": z_score,
            "WACC": 0.10,  # placeholder; Thai cost of capital varies
            "price": raw_val(summary, "previousClose") or 0,
        })

    rows.sort(key=lambda r: r["Year"])

    # Build pivoted ratios for charts
    ratios = {}
    for row in rows:
        for k, v in row.items():
            if k in ("Stock Symbol", "Year") or not isinstance(v, (int, float)):
                continue
            ratios.setdefault(k, {})[str(row["Year"])] = v

    sym_clean = symbol.replace(".BK", "").upper()
    info = THAI_TICKER_INFO.get(sym_clean, {})

    return {
        "symbol": sym_clean,
        "years": [str(r["Year"]) for r in rows],
        "result": rows,
        "ratios": ratios,
        "latest": rows[-1] if rows else {},
        "valuation": {
            "symbol": sym_clean,
            "sector": profile_mod.get("sector") or info.get("sector"),
            "intrinsic_value_per_share": None,  # would need separate DCF run
            "wacc_used": 0.10,
            "terminal_growth_used": 0.03,
            "shares_outstanding": raw_val(key_stats, "sharesOutstanding"),
        },
        "source": "yahoo_thai",
        "currency": "THB",
        "exchange": "SET",
    }


# ─── Main entry point ───────────────────────────────────
async def fetch_thai_financials(symbol: str) -> dict:
    """
    Fetch Thai stock financials.
    Tries SETSMART first (if configured), falls back to Yahoo.
    """
    sym_clean = normalize_thai_symbol(symbol)

    cache_key = f"thai:financials:{sym_clean}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    # Try SETSMART (paid, official)
    if settings.SETSMART_API_KEY:
        try:
            client = SETSmartClient()
            data = await client.get_financials(sym_clean)
            await client.close()
            # TODO: write _setsmart_to_luxe_format adapter when API access available
            # For now, fall through to Yahoo
        except Exception as e:
            logger.warning(f"SETSMART failed for {sym_clean}, falling back to Yahoo: {e}")

    # Fallback: Yahoo
    raw = await fetch_yahoo_thai(sym_clean)
    if not raw:
        raise ValueError(f"No data available for {sym_clean}")

    formatted = _yahoo_to_luxe_format(sym_clean, raw)
    if not formatted or not formatted.get("result"):
        raise ValueError(f"Could not parse data for {sym_clean}")

    await cache_set(cache_key, formatted, ttl=settings.CACHE_TTL_SECONDS)
    return formatted
