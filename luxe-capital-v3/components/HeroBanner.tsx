'use client';

import { motion } from 'framer-motion';
import type { FinancialsResponse } from '@/lib/api';
import { fmtMoney, fmtPct, trendColor } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  data: FinancialsResponse;
  source: 'backend' | 'demo';
}

export function HeroBanner({ data, source }: Props) {
  const rows = data.result;
  const latest = rows[rows.length - 1];
  const prev = rows[rows.length - 2];

  const revGrowth = prev
    ? ((latest['Revenue'] || latest['Net Income'] || 0) - (prev['Revenue'] || prev['Net Income'] || 0)) /
        Math.max(Math.abs(prev['Revenue'] || prev['Net Income'] || 1), 1) * 100
    : 0;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative overflow-hidden"
    >
      {/* Background gradient orb */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-radial-glow opacity-60 pointer-events-none" />

      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="flex items-center gap-3 mb-4"
        >
          <div className="flex items-center gap-2 px-3 py-1 rounded-full glass">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-secondary)]">
              {source === 'backend' ? 'Live · FastAPI' : 'Demo Mode'}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
            {data.valuation?.sector || 'Technology'} · {data.years.length}Y Analysis
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-7xl md:text-8xl lg:text-9xl font-light tracking-tight leading-none"
        >
          <span className="block text-[var(--text-primary)]">{data.symbol}</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-6 flex flex-wrap items-end gap-8"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">
              Net Income (Latest)
            </div>
            <div className="num-display text-4xl text-[var(--text-primary)] font-light">
              {fmtMoney(latest['Net Income'] || latest['Revenue'] || 0)}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">
              YoY Growth
            </div>
            <div className={`num-display text-2xl font-light flex items-center gap-2 ${trendColor(revGrowth)}`}>
              {revGrowth >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {fmtPct(revGrowth, 1)}
            </div>
          </div>

          {data.valuation?.intrinsic_value_per_share && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">
                Intrinsic Value / Share
              </div>
              <div className="num-display text-2xl text-gold font-light">
                ${data.valuation.intrinsic_value_per_share.toFixed(2)}
              </div>
            </div>
          )}

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">
              Fiscal Years
            </div>
            <div className="num-display text-2xl text-[var(--text-primary)] font-light">
              {data.years[0]} — {data.years[data.years.length - 1]}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
