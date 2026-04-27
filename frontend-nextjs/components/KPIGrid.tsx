'use client';

import { motion } from 'framer-motion';
import type { FinancialsResponse } from '@/lib/api';
import { fmtMoney, fmtNum, fmtPct, trendColor, cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Metric {
  label: string;
  value: string;
  change?: number;
  unit?: string;
  highlight?: boolean;
}

function buildMetrics(data: FinancialsResponse): Metric[] {
  const rows = data.result;
  const latest = rows[rows.length - 1];
  const prev = rows[rows.length - 2] || latest;

  return [
    { label: 'ROE', value: fmtNum(latest.ROE, 2), unit: '%', change: (latest.ROE || 0) - (prev.ROE || 0), highlight: true },
    { label: 'ROA', value: fmtNum(latest.ROA, 2), unit: '%', change: (latest.ROA || 0) - (prev.ROA || 0) },
    { label: 'Net Margin', value: fmtNum(latest['Net Profit Margin'], 2), unit: '%', change: (latest['Net Profit Margin'] || 0) - (prev['Net Profit Margin'] || 0) },
    { label: 'EBITDA Margin', value: fmtNum(latest['EBITDA Margin'], 2), unit: '%', change: (latest['EBITDA Margin'] || 0) - (prev['EBITDA Margin'] || 0) },
    { label: 'P/E Ratio', value: fmtNum(latest['PE Ratio'], 1), unit: '×' },
    { label: 'P/BV', value: fmtNum(latest['PBV Ratio'], 1), unit: '×' },
    { label: 'WACC', value: fmtNum((latest.WACC || 0) * 100, 2), unit: '%' },
    { label: 'Free Cash Flow', value: fmtMoney(latest['Free Cash Flow (FCF)']), highlight: true },
  ];
}

export function KPIGrid({ data }: { data: FinancialsResponse }) {
  const metrics = buildMetrics(data);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative"
    >
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] mb-2">
            ∕ 02 · Performance
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-light tracking-tight">
            Key <em className="text-gold not-italic">Indicators</em>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.05 }}
            className={cn(
              'group glass glass-hover rounded-2xl p-5 relative overflow-hidden',
              m.highlight && 'ring-1 ring-[var(--accent)]/20'
            )}
          >
            {m.highlight && (
              <div className="absolute top-0 left-0 w-full h-px bg-gold-gradient opacity-40" />
            )}

            <div className="flex items-start justify-between mb-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
                {m.label}
              </span>
              {m.change !== undefined && (
                <div className={cn('flex items-center gap-0.5 text-[10px] font-mono', trendColor(m.change))}>
                  {m.change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {fmtPct(m.change, 2)}
                </div>
              )}
            </div>

            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  'num-display text-3xl font-light leading-none',
                  m.highlight ? 'text-gold' : 'text-[var(--text-primary)]'
                )}
              >
                {m.value}
              </span>
              {m.unit && (
                <span className="font-mono text-sm text-[var(--text-muted)]">
                  {m.unit}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
