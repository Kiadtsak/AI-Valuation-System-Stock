'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { Markdown } from '@/components/Markdown';
import { loadFinancials, type FinancialsResponse } from '@/lib/api';
import { cn, fmtMoney, fmtNum, fmtPct } from '@/lib/utils';
import {
  Sparkles, RefreshCw, Copy, CheckCircle2,
  FileText, Brain, Zap, TrendingUp, ShieldCheck,
} from 'lucide-react';

const FACTS = [
  { icon: Brain, label: 'AI Model', value: 'GPT-4o mini' },
  { icon: Zap, label: 'Mode', value: 'Streaming' },
  { icon: ShieldCheck, label: 'Privacy', value: 'No data stored' },
];

export default function AIAnalysisPage() {
  const [symbol, setSymbol] = useState('AAPL');
  const [data, setData] = useState<FinancialsResponse | null>(null);
  const [analysis, setAnalysis] = useState('');
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const handleSearch = async (s: string) => {
    setLoading(true);
    setAnalysis('');
    setSymbol(s);
    try {
      const r = await loadFinancials(s);
      setData(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { handleSearch('AAPL'); }, []);

  const buildPayload = () => {
    if (!data) return null;
    const rows = data.result;
    const latest = rows[rows.length - 1];
    return {
      symbol: data.symbol,
      financials: {
        latest,
        years: data.years,
        trend: {
          revenue:   rows.map(r => r.Revenue || 0),
          netIncome: rows.map(r => r['Net Income'] || 0),
          fcf:       rows.map(r => r['Free Cash Flow (FCF)'] || 0),
          roe:       rows.map(r => r.ROE || 0),
          netMargin: rows.map(r => r['Net Profit Margin'] || 0),
        },
        valuation:    data.valuation,
        currentPrice: latest?.price || 0,
      },
    };
  };

  const runAnalysis = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setRunning(true);
    setAnalysis('');
    setSource('');

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSource(res.headers.get('X-Source') || 'unknown');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnalysis((prev) => prev + decoder.decode(value, { stream: true }));

        // auto-scroll to bottom during streaming
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setAnalysis(`**Error:** ${e.message}`);
      }
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const latest = data?.result[data.result.length - 1];

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-40" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-radial-glow pointer-events-none" />

      <Header />

      <main className="relative max-w-7xl mx-auto px-6 pt-12 pb-24">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">
              ∕ AI Research
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full glass text-[9px] font-mono uppercase tracking-widest text-[var(--positive)]">
              <div className="w-1 h-1 rounded-full bg-[var(--positive)] animate-pulse" />
              Live
            </div>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-light tracking-tight leading-none mb-6">
            <em className="text-gold not-italic">AI</em> Equity Analyst
          </h1>
          <p className="text-[var(--text-secondary)] max-w-xl text-balance">
            On-demand equity research written by AI. Trained on institutional
            methodology, calibrated to your company's actual financials.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* ═══ LEFT COLUMN: Configuration ═══ */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4 lg:sticky lg:top-24"
          >
            {/* Search */}
            <div className="glass rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                  <FileText size={16} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Subject</div>
                  <div className="font-display text-xl">Choose Ticker</div>
                </div>
              </div>
              <SearchBar
                onSearch={handleSearch}
                loading={loading}
                currentSymbol={symbol}
              />
            </div>

            {/* Data preview */}
            {latest && (
              <div className="glass rounded-3xl p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
                  Input Data for Analysis
                </div>
                <div className="space-y-2.5">
                  <MiniRow label="Company" value={data?.symbol || '—'} />
                  <MiniRow label="ROE" value={fmtPct(latest.ROE, 1)} />
                  <MiniRow label="Net Margin" value={fmtPct(latest['Net Profit Margin'], 1)} />
                  <MiniRow label="Free Cash Flow" value={fmtMoney(latest['Free Cash Flow (FCF)'])} />
                  <MiniRow label="D/E" value={fmtNum(latest['Debt to Equity'], 2)} />
                  <MiniRow label="P/E" value={fmtNum(latest['PE Ratio'], 1)} />
                  <MiniRow label="Altman Z" value={fmtNum(latest['Altman Z-Score'], 2)} />
                  {data?.valuation?.intrinsic_value_per_share ? (
                    <MiniRow
                      label="DCF Intrinsic"
                      value={`$${data.valuation.intrinsic_value_per_share.toFixed(2)}`}
                      highlight
                    />
                  ) : null}
                </div>
              </div>
            )}

            {/* Info cards */}
            <div className="glass rounded-3xl p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
                Engine
              </div>
              <div className="space-y-3">
                {FACTS.map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center">
                      <f.icon size={12} className="text-[var(--accent)]" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-xs text-[var(--text-secondary)]">{f.label}</span>
                      <span className="font-mono text-[10px] text-[var(--text-primary)]">{f.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={runAnalysis}
              disabled={running || !data}
              className={cn(
                'w-full relative overflow-hidden rounded-2xl p-5 transition-all',
                'bg-gold-gradient text-ink-900 shadow-gold-glow',
                'hover:shadow-[0_0_60px_-10px_rgba(212,165,116,0.6)] hover:-translate-y-0.5',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
              )}
            >
              <div className="relative flex items-center justify-center gap-3">
                {running ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold">
                      Analyzing...
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold">
                      {analysis ? 'Regenerate Report' : 'Generate AI Report'}
                    </span>
                  </>
                )}
              </div>
              {running && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              )}
            </button>
          </motion.aside>

          {/* ═══ RIGHT COLUMN: Output ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="glass rounded-3xl relative overflow-hidden min-h-[600px]"
          >
            {/* Paper-like gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-px bg-gold-gradient opacity-40" />

            {/* Header strip */}
            <div className="relative border-b border-[var(--border-subtle)] px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--negative)]" />
                <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                <div className="w-2 h-2 rounded-full bg-[var(--positive)]" />
                <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                  Luxe Capital · Research Memo
                </span>
              </div>
              <div className="flex items-center gap-2">
                {source && (
                  <div className="pill">
                    <span className="text-[var(--text-muted)]">Source</span>
                    <span className="text-[var(--accent)] font-semibold">{source}</span>
                  </div>
                )}
                {analysis && !running && (
                  <button
                    onClick={handleCopy}
                    className="glass px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest hover:border-[var(--accent)] transition flex items-center gap-1.5"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 size={10} className="text-[var(--positive)]" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={10} />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div
              ref={outputRef}
              className="relative p-8 md:p-12 max-h-[800px] overflow-y-auto"
            >
              <AnimatePresence mode="wait">
                {!analysis && !running ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="relative mb-8">
                      <div className="w-24 h-24 rounded-full bg-gold-gradient opacity-20 blur-2xl absolute inset-0" />
                      <div className="relative w-24 h-24 rounded-full glass flex items-center justify-center">
                        <Sparkles size={28} className="text-[var(--accent)]" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h3 className="font-display text-3xl mb-3 tracking-tight">
                      Ready to <em className="text-gold not-italic">analyze</em>
                    </h3>
                    <p className="text-[var(--text-secondary)] max-w-md">
                      Click "Generate AI Report" to produce a comprehensive
                      equity analysis of <span className="text-[var(--accent)] font-mono">{symbol}</span>.
                    </p>

                    <div className="mt-8 grid grid-cols-3 gap-4 max-w-md w-full">
                      {[
                        { icon: TrendingUp, label: 'Trends' },
                        { icon: Brain, label: 'Thesis' },
                        { icon: ShieldCheck, label: 'Risks' },
                      ].map((item) => (
                        <div key={item.label} className="text-center">
                          <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center mb-2">
                            <item.icon size={14} className="text-[var(--text-secondary)]" strokeWidth={1.5} />
                          </div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                            {item.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : running && !analysis ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="h-4 bg-[var(--bg-elevated)] rounded shimmer"
                        style={{ width: `${60 + Math.random() * 40}%` }}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Markdown text={analysis} />
                    {running && (
                      <span className="inline-block w-2 h-5 bg-[var(--accent)] ml-1 animate-pulse" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer note */}
            {analysis && !running && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="relative border-t border-[var(--border-subtle)] px-8 py-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]"
              >
                <span>Generated {new Date().toLocaleString()}</span>
                <span>Research only · Not investment advice</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function MiniRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span
        className={cn(
          'num-display text-sm',
          highlight ? 'text-gold font-semibold' : 'text-[var(--text-primary)]'
        )}
      >
        {value}
      </span>
    </div>
  );
}
