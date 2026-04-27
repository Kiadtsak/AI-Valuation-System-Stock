/**
 * Interactive DCF Valuation Engine
 * - Projects Free Cash Flow for N years with fade growth
 * - Discounts at WACC
 * - Adds Terminal Value (Gordon Growth)
 * - Sensitivity analysis for WACC × Terminal Growth
 */

export interface DCFInputs {
  baseFCF: number;          // Latest FCF in $
  initialGrowth: number;    // Starting growth rate (decimal, e.g. 0.12)
  terminalGrowth: number;   // Steady-state growth (decimal, e.g. 0.03)
  wacc: number;             // Discount rate (decimal, e.g. 0.09)
  forecastYears: number;    // Typically 5-10
  sharesOutstanding: number;
  netCash: number;          // Cash - Debt, to add to equity value
  currentPrice: number;
  fadeGrowth?: boolean;     // Linear fade from initial to terminal
}

export interface DCFYear {
  year: number;
  growth: number;
  fcf: number;
  pv: number;
}

export interface DCFResult {
  years: DCFYear[];
  terminalValue: number;
  pvTerminal: number;
  enterpriseValue: number;
  equityValue: number;
  valuePerShare: number;
  upside: number;              // % vs current price
  verdict: 'undervalued' | 'fair' | 'overvalued';
  sumPVExplicit: number;
}

export function runDCF(i: DCFInputs): DCFResult {
  const years: DCFYear[] = [];
  let fcf = i.baseFCF;

  for (let t = 1; t <= i.forecastYears; t++) {
    let g: number;
    if (i.fadeGrowth !== false) {
      // Linear fade from initialGrowth to terminalGrowth
      const w = t / i.forecastYears;
      g = (1 - w) * i.initialGrowth + w * i.terminalGrowth;
    } else {
      g = i.initialGrowth;
    }
    fcf = fcf * (1 + g);
    const pv = fcf / Math.pow(1 + i.wacc, t);
    years.push({ year: t, growth: g, fcf, pv });
  }

  const lastFCF = years[years.length - 1].fcf;
  // Gordon growth; guard against wacc <= terminalGrowth
  const spread = Math.max(i.wacc - i.terminalGrowth, 0.005);
  const terminalValue = (lastFCF * (1 + i.terminalGrowth)) / spread;
  const pvTerminal = terminalValue / Math.pow(1 + i.wacc, i.forecastYears);

  const sumPVExplicit = years.reduce((s, y) => s + y.pv, 0);
  const enterpriseValue = sumPVExplicit + pvTerminal;
  const equityValue = enterpriseValue + i.netCash;
  const valuePerShare = i.sharesOutstanding > 0 ? equityValue / i.sharesOutstanding : 0;
  const upside = i.currentPrice > 0 ? ((valuePerShare - i.currentPrice) / i.currentPrice) * 100 : 0;

  const verdict: DCFResult['verdict'] =
    upside > 15 ? 'undervalued' : upside < -15 ? 'overvalued' : 'fair';

  return {
    years,
    terminalValue,
    pvTerminal,
    enterpriseValue,
    equityValue,
    valuePerShare,
    upside,
    verdict,
    sumPVExplicit,
  };
}

/** Sensitivity matrix: rows = WACC, cols = Terminal Growth */
export function runSensitivity(
  base: DCFInputs,
  waccRange: number[],
  tgRange: number[]
): number[][] {
  return waccRange.map((w) =>
    tgRange.map((tg) => {
      const r = runDCF({ ...base, wacc: w, terminalGrowth: tg });
      return r.valuePerShare;
    })
  );
}
