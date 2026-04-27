'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { LuxeSlider } from '@/components/LuxeSlider';
import { loadFinancials, type FinancialsResponse } from '@/lib/api';
import { runDCF, runSensitivity, type DCFInputs } from '@/lib/dcf';
import { fmtMoney, fmtNum, fmtPct, cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, ComposedChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Calculator, ArrowUpRight, ArrowDownRight,
  Gauge, AlertTriangle, CheckCircle2, ArrowLeft,
} from 'lucide-react';

function ValuationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSymbol = searchParams.get('symbol') || '';

  const [symbol, setSymbol] = useState('');
  const [data, setData] = useState<FinancialsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  // DCF state
  const [initGrowth, setInitGrowth] = useState(0.12);
  const [termGrowth, setTermGrowth] = useState(0.03);
  const [wacc, setWacc] = useState(0.09);
  const [years, setYears] = useState(10);
  const [fadeGrowth, setFadeGrowth] = useState(true);

  const handleSearch = async (s: string) => {
    setLoading(true);
    setSymbol(s);
    window.history.replaceState(null, '', `/valuation?symbol=${s}`);
    try {
      const r = await loadFinancials(s);
      setData(r.data);

      const latest = r.data.result[r.data.result.length - 1];
      const wacc0 = latest?.WACC;
      if (wacc0 && wacc0 > 0.02 && wacc0 < 0.2) setWacc(wacc0);

      const rows = r.data.result;
      const fcf0 = rows[0]?.['Free Cash Flow (FCF)'];
      const fcfN = rows[rows.length - 1]?.['Free Cash Flow (FCF)'];
      if (fcf0 && fcfN && fcf0 > 0 && fcfN > 0 && rows.length > 1) {
        const cagr = Math.pow(fcfN / fcf0, 1 / (rows.length - 1)) - 1;
        setInitGrowth(Math.max(-0.1, Math.min(0.25, cagr)));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlSymbol) {
      handleSearch(urlSymbol);
    } else {
      router.replace('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseInputs = useMemo(() => {
    if (!data) return { baseFCF: 100e9, shares: 15e9, netCash: 0, currentPrice: 175 };
    const latest = data.result[data.result.length - 1];
    return {
      baseFCF: latest?.['Free Cash Flow (FCF)'] || 90e9,
      shares: data.valuation?.shares_outstanding || 15e9,
      netCash: 0,
      currentPrice: latest?.price || 175,
    };
  }, [data]);

  const dcfInputs: DCFInputs = {
    baseFCF: baseInputs.baseFCF,
    initialGrowth: initGrowth,
    terminalGrowth: termGrowth,
    wacc,
    forecastYears: years,
    sharesOutstanding: baseInputs.shares,
    netCash: baseInputs.netCash,
    currentPrice: baseInputs.currentPrice,
    fadeGrowth,
  };

  const result = useMemo(() => runDCF(dcfInputs), [dcfInputs]);

  const waccRange = [wacc - 0.02, wacc - 0.01, wacc, wacc + 0.01, wacc + 0.02];
  const tgRange = [
    Math.max(0, termGrowth - 0.01),
    termGrowth,
    termGrowth + 0.005,
    termGrowth + 0.01,
    termGrowth + 0.015,
  ];
  const sensitivity = useMemo(
    () => runSensitivity(dcfInputs, waccRange, tgRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dcfInputs, waccRange.join(','), tgRange.join(',')]
  );

  const verdictConfig = {
    undervalued: { label: 'Undervalued',   color: 'text-[var(--positive)]', bg: 'from-[var(--positive)]/20 to-transparent', icon: CheckCircle2 },
    fair:        { label: 'Fairly Valued', color: 'text-[var(--accent)]',   bg: 'from-[var(--accent)]/20 to-transparent',   icon: Gauge },
    overvalued:  { label: 'Overvalued',    color: 'text-[var(--negative)]', bg: 'from-[var(--negative)]/20 to-transparent', icon: AlertTriangle },
  };
  const V = verdictConfig[result.verdict];

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const axisColor = theme === 'dark' ? '#52525b' : '#a1a1aa';

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-40" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-radial-glow pointer-events-none" />

      <Header />

      <main className="relative max-w-7xl mx-auto px-6 pt-10 pb-24">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] hover:text-[var(--accent)] transition"
          >
            <ArrowLeft size={12} />
            Back to Home
          </Link>
        </motion.div>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] mb-3">
            ∕ DCF Engine
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-light tracking-tight leading-none mb-6">
            Intrinsic <em className="text-gold not-italic">Valuation</em>
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl text-balance">
            Interactive discounted cash flow model. Adjust assumptions and watch
            the intrinsic value recalibrate in real time.
          </p>
        </motion.div>

        <div className="mb-10 max-w-2xl">
          <SearchBar onSearch={handleSearch} loading={loading} currentSymbol={symbol} />
        </div>

        {data && (
          <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
            {/* Left: Assumptions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass rounded-3xl p-6 md:p-8 lg:sticky lg:top-24"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                  <Calculator size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Model</div>
                  <div className="font-display text-xl">Assumptions</div>
                </div>
              </div>

              <div className="space-y-7">
                <LuxeSlider label="Initial FCF Growth" value={initGrowth} min={-0.1} max={0.4} step={0.005} format={(v) => fmtPct(v * 100, 1)} onChange={setInitGrowth} />
                <LuxeSlider label="Terminal Growth"    value={termGrowth} min={0}    max={0.05} step={0.001} format={(v) => fmtPct(v * 100, 2)} onChange={setTermGrowth} />
                <LuxeSlider label="WACC (Discount Rate)" value={wacc}     min={0.03} max={0.20} step={0.002} format={(v) => fmtPct(v * 100, 2)} onChange={setWacc} />
                <LuxeSlider label="Forecast Period"    value={years}      min={3}    max={15}   step={1} unit="years" format={(v) => v.toString()} onChange={(v) => setYears(Math.round(v))} />

                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Fade Growth
                  </label>
                  <button
                    onClick={() => setFadeGrowth(!fadeGrowth)}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      fadeGrowth ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform',
                        fadeGrowth ? 'translate-x-5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] space-y-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">
                  Inputs from {data.symbol}
                </div>
                <DataRow label="Base FCF" value={fmtMoney(baseInputs.baseFCF)} />
                <DataRow label="Shares Out" value={fmtNum(baseInputs.shares / 1e6, 0) + 'M'} />
                <DataRow label="Current Price" value={`$${baseInputs.currentPrice.toFixed(2)}`} />
              </div>
            </motion.div>

            {/* Right: Results */}
            <div className="space-y-6">
              {/* Verdict */}
              <motion.div
                key={result.verdict + result.valuePerShare.toFixed(0)}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className={cn('relative glass rounded-3xl p-8 md:p-10 overflow-hidden bg-gradient-to-br', V.bg)}
              >
                <div className="absolute top-0 left-0 w-full h-px bg-gold-gradient opacity-60" />
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <V.icon size={16} className={V.color} strokeWidth={1.5} />
                      <span className={cn('font-mono text-[10px] uppercase tracking-[0.25em]', V.color)}>
                        {V.label}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] mb-2">
                      Intrinsic Value / Share
                    </div>
                    <div className="font-display text-7xl lg:text-8xl font-light leading-none">
                      <span className="text-gold">${result.valuePerShare.toFixed(2)}</span>
                    </div>
                    <div className="mt-5 flex items-center gap-3 flex-wrap">
                      <div className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-full border',
                        result.upside >= 0 ? 'border-[var(--positive)]/30 bg-[var(--positive)]/10' : 'border-[var(--negative)]/30 bg-[var(--negative)]/10'
                      )}>
                        {result.upside >= 0 ? <ArrowUpRight size={12} className="text-[var(--positive)]" /> : <ArrowDownRight size={12} className="text-[var(--negative)]" />}
                        <span className={cn('num-display text-xs font-semibold', result.upside >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]')}>
                          {result.upside >= 0 ? '+' : ''}{result.upside.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">vs current ${baseInputs.currentPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">
                      Value Composition
                    </div>
                    <ValueBar label="Explicit Forecast PV" value={result.sumPVExplicit} total={result.enterpriseValue} />
                    <ValueBar label="Terminal Value PV" value={result.pvTerminal} total={result.enterpriseValue} />
                    <div className="pt-3 border-t border-[var(--border-subtle)]">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Enterprise Value</span>
                        <span className="num-display text-xl text-[var(--text-primary)]">{fmtMoney(result.enterpriseValue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="glass rounded-3xl p-6 md:p-8"
              >
                <div className="flex items-baseline justify-between mb-6">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] mb-1">∕ Forecast</div>
                    <h3 className="font-display text-2xl">Projected Cash Flows</h3>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {years} Years · USD Billion
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={result.years.map(y => ({
                    year: `Y${y.year}`,
                    FCF: y.fcf / 1e9,
                    PV:  y.pv / 1e9,
                    Growth: y.growth * 100,
                  }))}>
                    <defs>
                      <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4a574" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#d4a574" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={gridColor} strokeDasharray="2 4" />
                    <XAxis dataKey="year" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
                    <YAxis yAxisId="l" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
                    <YAxis yAxisId="r" orientation="right" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 12, fontSize: 12 }} />
                    <Bar  yAxisId="l" dataKey="FCF" fill="#10b981" opacity={0.6} name="Projected FCF ($B)" />
                    <Area yAxisId="l" dataKey="PV" fill="url(#pvGrad)" stroke="#d4a574" strokeWidth={2.5} name="Present Value ($B)" />
                    <Line yAxisId="r" type="monotone" dataKey="Growth" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} name="Growth Rate (%)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Sensitivity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="glass rounded-3xl p-6 md:p-8"
              >
                <div className="flex items-baseline justify-between mb-6">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)] mb-1">∕ Sensitivity</div>
                    <h3 className="font-display text-2xl">WACC × Terminal Growth Matrix</h3>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Value / Share</div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">WACC \ g</th>
                        {tgRange.map((tg) => (
                          <th key={tg} className="text-right p-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            {fmtPct(tg * 100, 1)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivity.map((row, i) => {
                        const rowWacc = waccRange[i];
                        return (
                          <tr key={i} className="border-t border-[var(--border-subtle)]">
                            <td className="p-3 font-mono text-[11px] text-[var(--text-secondary)]">{fmtPct(rowWacc * 100, 1)}</td>
                            {row.map((val, j) => {
                              const isCurrent = Math.abs(rowWacc - wacc) < 0.005 && Math.abs(tgRange[j] - termGrowth) < 0.003;
                              const delta = baseInputs.currentPrice > 0 ? (val - baseInputs.currentPrice) / baseInputs.currentPrice : 0;
                              const shade = delta > 0.15 ? 'bg-[var(--positive)]/15' : delta < -0.15 ? 'bg-[var(--negative)]/15' : '';
                              return (
                                <td key={j} className={cn(
                                  'p-3 text-right num-display text-sm transition-colors',
                                  shade,
                                  isCurrent && 'ring-2 ring-[var(--accent)] ring-inset font-semibold text-gold',
                                  !isCurrent && 'text-[var(--text-primary)]'
                                )}>
                                  ${val.toFixed(2)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[var(--positive)]/40 rounded-sm" /> &gt; 15% upside</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-[var(--negative)]/40 rounded-sm" /> &gt; 15% downside</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 ring-2 ring-[var(--accent)] rounded-sm" /> current assumption</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ValuationPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[var(--text-muted)]">Loading...</div>}>
      <ValuationContent />
    </Suspense>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="num-display text-sm text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function ValueBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="num-display text-sm text-[var(--text-primary)]">{fmtMoney(value)}</span>
          <span className="font-mono text-[10px] text-[var(--text-muted)]">{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="h-full bg-gold-gradient rounded-full"
        />
      </div>
    </div>
  );
}
