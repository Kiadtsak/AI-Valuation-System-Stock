'use client';

import { motion } from 'framer-motion';
import type { FinancialsResponse } from '@/lib/api';
import { fmtNum, cn } from '@/lib/utils';
import { useState } from 'react';

const CATEGORIES = {
  Profitability: ['ROE', 'ROA', 'Net Profit Margin', 'Gross Profit Margin', 'Operating Profit Margin', 'EBITDA Margin'],
  Liquidity: ['Current Ratio', 'Quick Ratio', 'Cash Ratio'],
  Efficiency: ['Asset Turnover', 'Inventory Turnover', 'Receivables Turnover', 'Days Inventory Outstanding (DIO)', 'Days Sales Outstanding (DSO)', 'Working Capital Turnover'],
  Valuation: ['EPS', 'PE Ratio', 'PBV Ratio', "Owner's Earnings"],
  Solvency: ['Debt to Equity', 'Debt to Assets', 'Interest Coverage', 'Altman Z-Score'],
  CashFlow: ['Operating Cash Flow (OCF)', 'Free Cash Flow (FCF)', 'Unlevered Free Cash Flow (UFCF)', 'WACC'],
};

export function RatiosTable({ data }: { data: FinancialsResponse }) {
  const [cat, setCat] = useState<keyof typeof CATEGORIES>('Profitability');
  const years = data.years;
  const rowsByYear: Record<string, any> = {};
  data.result.forEach((r) => {
    rowsByYear[String(r.Year)] = r;
  });

  const metrics = CATEGORIES[cat];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
    >
      <div className="flex items-baseline justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] mb-2">
            ∕ 05 · Data
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-light tracking-tight">
            Ratio <em className="text-gold not-italic">Archive</em>
          </h2>
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-full glass">
          {Object.keys(CATEGORIES).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c as keyof typeof CATEGORIES)}
              className={cn(
                'px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.15em] transition-all',
                cat === c
                  ? 'bg-gold-gradient text-ink-900 font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Metric
                </th>
                {years.map((y) => (
                  <th
                    key={y}
                    className="text-right px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]"
                  >
                    FY {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr
                  key={m}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-elevated)]/30 transition-colors"
                >
                  <td className="px-6 py-3 text-sm text-[var(--text-primary)] font-medium">
                    {m}
                  </td>
                  {years.map((y) => {
                    const row = rowsByYear[y];
                    const val = row?.[m];
                    const isLatest = y === years[years.length - 1];
                    return (
                      <td
                        key={y}
                        className={cn(
                          'px-6 py-3 text-right num-display text-sm',
                          isLatest ? 'text-gold font-semibold' : 'text-[var(--text-secondary)]'
                        )}
                      >
                        {val == null || !isFinite(val)
                          ? '—'
                          : Math.abs(val) >= 1e6
                            ? (val / 1e9).toFixed(2) + 'B'
                            : fmtNum(val, 2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
}
