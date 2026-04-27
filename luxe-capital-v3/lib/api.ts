/**
 * API client for FastAPI backend
 * Calls /api/financials?symbol=XXX which your backend already provides.
 * Falls back to demo data if backend is unreachable.
 */

export interface Ratios {
  [metric: string]: { [year: string]: number | null };
}

export interface Valuation {
  symbol?: string;
  sector?: string;
  wacc_used?: number;
  terminal_growth_used?: number;
  intrinsic_equity_value?: number;
  intrinsic_value_per_share?: number;
  shares_outstanding?: number;
  growth_table?: Array<Record<string, any>>;
  cashflows_forecast?: number[];
  pv_cashflows?: number[];
  pv_terminal_value?: number;
  error?: string;
}

export interface FinancialsResponse {
  symbol: string;
  source_file?: string;
  result: Array<Record<string, any>>;
  latest: Record<string, any>;
  years: string[];
  ratios: Ratios;
  valuation: Valuation | null;
}

export async function fetchFinancials(
  symbol: string,
  opts: { years?: string; refresh?: boolean } = {}
): Promise<FinancialsResponse> {
  const params = new URLSearchParams({ symbol: symbol.toUpperCase() });
  if (opts.years) params.set('years', opts.years);
  if (opts.refresh) params.set('refresh', 'true');

  const res = await fetch(`/api/financials?${params.toString()}&ts=${Date.now()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend error ${res.status}: ${text || 'Unknown'}`);
  }

  return res.json();
}

/**
 * Demo data — used when backend is not reachable
 * Shape matches FastAPI response
 */
export const DEMO_DATA: Record<string, FinancialsResponse> = {
  AAPL: {
    symbol: 'AAPL',
    years: ['2021', '2022', '2023', '2024', '2025'],
    result: [
      { 'Stock Symbol': 'AAPL', Year: 2021, 'ROE': 147.4, 'ROA': 26.97, 'Net Profit Margin': 25.88, 'Gross Profit Margin': 41.78, 'Operating Profit Margin': 29.78, 'EBITDA Margin': 33.68, WACC: 0.0591, 'PE Ratio': 31.65, 'PBV Ratio': 47.04, EPS: 5.67, 'Current Ratio': 1.07, 'Quick Ratio': 1.02, 'Free Cash Flow (FCF)': 92953000000, 'Operating Cash Flow (OCF)': 104038000000, 'Altman Z-Score': 3.12, 'Debt to Equity': 1.73 },
      { 'Stock Symbol': 'AAPL', Year: 2022, 'ROE': 196.96, 'ROA': 28.29, 'Net Profit Margin': 25.31, 'Gross Profit Margin': 43.31, 'Operating Profit Margin': 30.29, 'EBITDA Margin': 33.10, WACC: 0.0621, 'PE Ratio': 23.65, 'PBV Ratio': 41.2, EPS: 6.15, 'Current Ratio': 0.88, 'Quick Ratio': 0.85, 'Free Cash Flow (FCF)': 111443000000, 'Operating Cash Flow (OCF)': 122151000000, 'Altman Z-Score': 2.92, 'Debt to Equity': 2.37 },
      { 'Stock Symbol': 'AAPL', Year: 2023, 'ROE': 156.08, 'ROA': 27.51, 'Net Profit Margin': 25.31, 'Gross Profit Margin': 44.13, 'Operating Profit Margin': 29.82, 'EBITDA Margin': 32.82, WACC: 0.0625, 'PE Ratio': 31.4, 'PBV Ratio': 48.9, EPS: 6.13, 'Current Ratio': 0.99, 'Quick Ratio': 0.94, 'Free Cash Flow (FCF)': 99584000000, 'Operating Cash Flow (OCF)': 110543000000, 'Altman Z-Score': 2.87, 'Debt to Equity': 1.80 },
      { 'Stock Symbol': 'AAPL', Year: 2024, 'ROE': 164.59, 'ROA': 25.68, 'Net Profit Margin': 23.97, 'Gross Profit Margin': 46.21, 'Operating Profit Margin': 31.51, 'EBITDA Margin': 34.44, WACC: 0.0591, 'PE Ratio': 40.99, 'PBV Ratio': 67.47, EPS: 6.11, 'Current Ratio': 0.87, 'Quick Ratio': 0.83, 'Free Cash Flow (FCF)': 108807000000, 'Operating Cash Flow (OCF)': 118254000000, 'Altman Z-Score': 2.15, 'Debt to Equity': 2.09 },
      { 'Stock Symbol': 'AAPL', Year: 2025, 'ROE': 151.91, 'ROA': 26.21, 'Net Profit Margin': 26.92, 'Gross Profit Margin': 47.1, 'Operating Profit Margin': 32.05, 'EBITDA Margin': 34.98, WACC: 0.0640, 'PE Ratio': 38.4, 'PBV Ratio': 61.2, EPS: 6.74, 'Current Ratio': 0.91, 'Quick Ratio': 0.86, 'Free Cash Flow (FCF)': 98767000000, 'Operating Cash Flow (OCF)': 111482000000, 'Altman Z-Score': 2.42, 'Debt to Equity': 1.52 },
    ],
    ratios: {},
    latest: {},
    valuation: {
      symbol: 'AAPL', sector: 'Technology', wacc_used: 0.064, terminal_growth_used: 0.03,
      intrinsic_equity_value: 2.8e12, intrinsic_value_per_share: 185.4, shares_outstanding: 15100000000,
    },
  },
  MSFT: {
    symbol: 'MSFT',
    years: ['2021', '2022', '2023', '2024', '2025'],
    result: [
      { 'Stock Symbol': 'MSFT', Year: 2021, 'ROE': 43.15, 'ROA': 18.36, 'Net Profit Margin': 36.45, 'Gross Profit Margin': 68.93, 'Operating Profit Margin': 41.59, 'EBITDA Margin': 48.54, WACC: 0.0820, 'PE Ratio': 34.6, 'PBV Ratio': 14.8, EPS: 8.05, 'Current Ratio': 2.08, 'Quick Ratio': 2.06, 'Free Cash Flow (FCF)': 56118000000, 'Operating Cash Flow (OCF)': 76740000000, 'Altman Z-Score': 4.52, 'Debt to Equity': 0.35 },
      { 'Stock Symbol': 'MSFT', Year: 2022, 'ROE': 43.68, 'ROA': 19.94, 'Net Profit Margin': 36.69, 'Gross Profit Margin': 68.4, 'Operating Profit Margin': 42.06, 'EBITDA Margin': 49.07, WACC: 0.0850, 'PE Ratio': 26.3, 'PBV Ratio': 11.5, EPS: 9.65, 'Current Ratio': 1.78, 'Quick Ratio': 1.75, 'Free Cash Flow (FCF)': 65149000000, 'Operating Cash Flow (OCF)': 89035000000, 'Altman Z-Score': 4.68, 'Debt to Equity': 0.29 },
      { 'Stock Symbol': 'MSFT', Year: 2023, 'ROE': 35.09, 'ROA': 17.56, 'Net Profit Margin': 34.15, 'Gross Profit Margin': 68.92, 'Operating Profit Margin': 41.77, 'EBITDA Margin': 48.76, WACC: 0.0830, 'PE Ratio': 35.1, 'PBV Ratio': 12.5, EPS: 9.68, 'Current Ratio': 1.77, 'Quick Ratio': 1.76, 'Free Cash Flow (FCF)': 59475000000, 'Operating Cash Flow (OCF)': 87582000000, 'Altman Z-Score': 4.91, 'Debt to Equity': 0.20 },
      { 'Stock Symbol': 'MSFT', Year: 2024, 'ROE': 32.83, 'ROA': 17.21, 'Net Profit Margin': 35.96, 'Gross Profit Margin': 69.76, 'Operating Profit Margin': 44.65, 'EBITDA Margin': 51.44, WACC: 0.0869, 'PE Ratio': 37.9, 'PBV Ratio': 12.4, EPS: 11.80, 'Current Ratio': 1.27, 'Quick Ratio': 1.27, 'Free Cash Flow (FCF)': 74071000000, 'Operating Cash Flow (OCF)': 118548000000, 'Altman Z-Score': 1.69, 'Debt to Equity': 0.16 },
      { 'Stock Symbol': 'MSFT', Year: 2025, 'ROE': 29.65, 'ROA': 16.88, 'Net Profit Margin': 36.15, 'Gross Profit Margin': 70.2, 'Operating Profit Margin': 45.21, 'EBITDA Margin': 52.01, WACC: 0.0800, 'PE Ratio': 37.1, 'PBV Ratio': 10.8, EPS: 13.25, 'Current Ratio': 1.35, 'Quick Ratio': 1.34, 'Free Cash Flow (FCF)': 71611000000, 'Operating Cash Flow (OCF)': 121000000000, 'Altman Z-Score': 1.84, 'Debt to Equity': 0.33 },
    ],
    ratios: {},
    latest: {},
    valuation: {
      symbol: 'MSFT', sector: 'Technology', wacc_used: 0.080, terminal_growth_used: 0.03,
      intrinsic_equity_value: 2.4e12, intrinsic_value_per_share: 322.1, shares_outstanding: 7430000000,
    },
  },
  NVDA: {
    symbol: 'NVDA',
    years: ['2021', '2022', '2023', '2024', '2025'],
    result: [
      { 'Stock Symbol': 'NVDA', Year: 2021, 'ROE': 29.22, 'ROA': 16.37, 'Net Profit Margin': 25.98, 'Gross Profit Margin': 62.34, 'Operating Profit Margin': 27.18, 'EBITDA Margin': 29.77, WACC: 0.0921, 'PE Ratio': 70.4, 'PBV Ratio': 21.2, EPS: 1.83, 'Current Ratio': 4.09, 'Quick Ratio': 3.24, 'Free Cash Flow (FCF)': 4694000000, 'Operating Cash Flow (OCF)': 5822000000, 'Altman Z-Score': 12.1, 'Debt to Equity': 0.41 },
      { 'Stock Symbol': 'NVDA', Year: 2022, 'ROE': 16.63, 'ROA': 9.08, 'Net Profit Margin': 14.88, 'Gross Profit Margin': 56.93, 'Operating Profit Margin': 15.65, 'EBITDA Margin': 22.31, WACC: 0.0899, 'PE Ratio': 42.1, 'PBV Ratio': 8.5, EPS: 1.74, 'Current Ratio': 3.53, 'Quick Ratio': 2.29, 'Free Cash Flow (FCF)': 3808000000, 'Operating Cash Flow (OCF)': 5641000000, 'Altman Z-Score': 8.9, 'Debt to Equity': 0.47 },
      { 'Stock Symbol': 'NVDA', Year: 2023, 'ROE': 91.46, 'ROA': 55.29, 'Net Profit Margin': 48.85, 'Gross Profit Margin': 72.72, 'Operating Profit Margin': 54.12, 'EBITDA Margin': 55.62, WACC: 0.0940, 'PE Ratio': 65.5, 'PBV Ratio': 53.3, EPS: 11.93, 'Current Ratio': 4.17, 'Quick Ratio': 3.50, 'Free Cash Flow (FCF)': 27021000000, 'Operating Cash Flow (OCF)': 28090000000, 'Altman Z-Score': 15.2, 'Debt to Equity': 0.22 },
      { 'Stock Symbol': 'NVDA', Year: 2024, 'ROE': 119.18, 'ROA': 67.94, 'Net Profit Margin': 55.58, 'Gross Profit Margin': 74.99, 'Operating Profit Margin': 62.05, 'EBITDA Margin': 62.90, WACC: 0.0833, 'PE Ratio': 54.6, 'PBV Ratio': 51.1, EPS: 2.97, 'Current Ratio': 4.17, 'Quick Ratio': 3.67, 'Free Cash Flow (FCF)': 60853000000, 'Operating Cash Flow (OCF)': 64089000000, 'Altman Z-Score': 4.17, 'Debt to Equity': 0.13 },
      { 'Stock Symbol': 'NVDA', Year: 2025, 'ROE': 91.87, 'ROA': 56.12, 'Net Profit Margin': 55.85, 'Gross Profit Margin': 75.12, 'Operating Profit Margin': 62.85, 'EBITDA Margin': 63.21, WACC: 0.0910, 'PE Ratio': 48.3, 'PBV Ratio': 42.8, EPS: 3.42, 'Current Ratio': 4.17, 'Quick Ratio': 3.88, 'Free Cash Flow (FCF)': 60853000000, 'Operating Cash Flow (OCF)': 64089000000, 'Altman Z-Score': 4.17, 'Debt to Equity': 0.13 },
    ],
    ratios: {},
    latest: {},
    valuation: {
      symbol: 'NVDA', sector: 'Technology', wacc_used: 0.091, terminal_growth_used: 0.03,
      intrinsic_equity_value: 1.4e12, intrinsic_value_per_share: 57.06, shares_outstanding: 24500000000,
    },
  },
  GOOGL: {
    symbol: 'GOOGL',
    years: ['2021', '2022', '2023', '2024', '2025'],
    result: [
      { 'Stock Symbol': 'GOOGL', Year: 2021, 'ROE': 30.22, 'ROA': 21.16, 'Net Profit Margin': 29.51, 'Gross Profit Margin': 56.94, 'Operating Profit Margin': 30.55, 'EBITDA Margin': 35.22, WACC: 0.0955, 'PE Ratio': 25.6, 'PBV Ratio': 7.8, EPS: 5.69, 'Current Ratio': 2.93, 'Quick Ratio': 2.93, 'Free Cash Flow (FCF)': 67012000000, 'Operating Cash Flow (OCF)': 91652000000, 'Altman Z-Score': 6.12, 'Debt to Equity': 0.11 },
      { 'Stock Symbol': 'GOOGL', Year: 2022, 'ROE': 23.41, 'ROA': 16.42, 'Net Profit Margin': 21.20, 'Gross Profit Margin': 55.38, 'Operating Profit Margin': 26.46, 'EBITDA Margin': 30.67, WACC: 0.0933, 'PE Ratio': 19.4, 'PBV Ratio': 5.5, EPS: 4.59, 'Current Ratio': 2.38, 'Quick Ratio': 2.38, 'Free Cash Flow (FCF)': 60010000000, 'Operating Cash Flow (OCF)': 91495000000, 'Altman Z-Score': 5.87, 'Debt to Equity': 0.11 },
      { 'Stock Symbol': 'GOOGL', Year: 2023, 'ROE': 26.05, 'ROA': 18.34, 'Net Profit Margin': 24.01, 'Gross Profit Margin': 56.63, 'Operating Profit Margin': 27.42, 'EBITDA Margin': 32.04, WACC: 0.0912, 'PE Ratio': 25.8, 'PBV Ratio': 6.2, EPS: 5.80, 'Current Ratio': 2.10, 'Quick Ratio': 2.10, 'Free Cash Flow (FCF)': 69495000000, 'Operating Cash Flow (OCF)': 101746000000, 'Altman Z-Score': 5.42, 'Debt to Equity': 0.10 },
      { 'Stock Symbol': 'GOOGL', Year: 2024, 'ROE': 30.80, 'ROA': 22.24, 'Net Profit Margin': 28.60, 'Gross Profit Margin': 58.20, 'Operating Profit Margin': 32.08, 'EBITDA Margin': 36.15, WACC: 0.0933, 'PE Ratio': 22.2, 'PBV Ratio': 6.8, EPS: 8.04, 'Current Ratio': 1.84, 'Quick Ratio': 1.84, 'Free Cash Flow (FCF)': 72764000000, 'Operating Cash Flow (OCF)': 125299000000, 'Altman Z-Score': 4.18, 'Debt to Equity': 0.08 },
      { 'Stock Symbol': 'GOOGL', Year: 2025, 'ROE': 28.15, 'ROA': 20.10, 'Net Profit Margin': 27.80, 'Gross Profit Margin': 58.05, 'Operating Profit Margin': 32.10, 'EBITDA Margin': 36.22, WACC: 0.0925, 'PE Ratio': 20.1, 'PBV Ratio': 5.9, EPS: 8.52, 'Current Ratio': 1.95, 'Quick Ratio': 1.95, 'Free Cash Flow (FCF)': 78100000000, 'Operating Cash Flow (OCF)': 130000000000, 'Altman Z-Score': 4.35, 'Debt to Equity': 0.09 },
    ],
    ratios: {},
    latest: {},
    valuation: {
      symbol: 'GOOGL', sector: 'Technology', wacc_used: 0.093, terminal_growth_used: 0.03,
      intrinsic_equity_value: 2.1e12, intrinsic_value_per_share: 171.5, shares_outstanding: 12300000000,
    },
  },
};

/** Populate `latest` and `ratios` shape for demo data */
function enrichDemo(d: FinancialsResponse): FinancialsResponse {
  const latest = d.result[d.result.length - 1];
  const ratios: Ratios = {};
  d.result.forEach((row) => {
    Object.entries(row).forEach(([k, v]) => {
      if (k === 'Year' || k === 'Stock Symbol' || typeof v !== 'number') return;
      if (!ratios[k]) ratios[k] = {};
      ratios[k][String(row.Year)] = v;
    });
  });
  return { ...d, latest, ratios };
}

Object.keys(DEMO_DATA).forEach((k) => {
  DEMO_DATA[k] = enrichDemo(DEMO_DATA[k]);
});

/**
 * Main loader — tries backend, falls back to demo
 */
export async function loadFinancials(
  symbol: string,
  opts: { refresh?: boolean } = {}
): Promise<{ data: FinancialsResponse; source: 'backend' | 'demo' }> {
  try {
    const data = await fetchFinancials(symbol, opts);
    return { data, source: 'backend' };
  } catch (err) {
    const demo = DEMO_DATA[symbol.toUpperCase()];
    if (demo) {
      return { data: demo, source: 'demo' };
    }
    throw err;
  }
}
