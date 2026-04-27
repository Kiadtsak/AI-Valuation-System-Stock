'use client';

import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, ComposedChart,
} from 'recharts';
import type { FinancialsResponse } from '@/lib/api';
import { useTheme } from './ThemeProvider';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Tab = 'profitability' | 'cashflow' | 'valuation' | 'solvency';

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass rounded-lg p-3 shadow-luxe text-xs">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">
        FY {label}
      </div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-[var(--text-secondary)]">{entry.name}</span>
          </span>
          <span className="num-display text-[var(--text-primary)]">
            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendsSection({ data }: { data: FinancialsResponse }) {
  const [tab, setTab] = useState<Tab>('profitability');
  const { theme } = useTheme();

  const rows = data.result.map((r) => ({
    year: r.Year,
    ROE: r.ROE,
    ROA: r.ROA,
    NetMargin: r['Net Profit Margin'],
    GrossMargin: r['Gross Profit Margin'],
    EBITDA: r['EBITDA Margin'],
    FCF: (r['Free Cash Flow (FCF)'] || 0) / 1e9,
    OCF: (r['Operating Cash Flow (OCF)'] || 0) / 1e9,
    PE: r['PE Ratio'],
    PBV: r['PBV Ratio'],
    EPS: r.EPS,
    DE: r['Debt to Equity'],
    Z: r['Altman Z-Score'],
  }));

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const axisColor = theme === 'dark' ? '#52525b' : '#a1a1aa';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profitability', label: 'Profitability' },
    { id: 'cashflow', label: 'Cash Flow' },
    { id: 'valuation', label: 'Valuation' },
    { id: 'solvency', label: 'Solvency' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] mb-2">
            ∕ 03 · Historical
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-light tracking-tight">
            Financial <em className="text-gold not-italic">Trends</em>
          </h2>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-full glass">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.15em] transition-all',
                tab === t.id
                  ? 'bg-gold-gradient text-ink-900 font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-6 md:p-8">
        <ResponsiveContainer width="100%" height={360}>
          {tab === 'profitability' ? (
            <LineChart data={rows}>
              <defs>
                <linearGradient id="gold1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4a574" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#d4a574" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="2 4" />
              <XAxis dataKey="year" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
              <YAxis stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', paddingTop: 10 }} />
              <Line type="monotone" dataKey="ROE" stroke="#d4a574" strokeWidth={2.5} dot={{ r: 4, fill: '#d4a574' }} />
              <Line type="monotone" dataKey="ROA" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="NetMargin" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Net Margin" />
              <Line type="monotone" dataKey="EBITDA" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} name="EBITDA Margin" />
            </LineChart>
          ) : tab === 'cashflow' ? (
            <ComposedChart data={rows}>
              <defs>
                <linearGradient id="fcfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4a574" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#d4a574" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridColor} strokeDasharray="2 4" />
              <XAxis dataKey="year" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
              <YAxis stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" label={{ value: 'USD Billion', angle: -90, position: 'insideLeft', style: { fill: axisColor, fontSize: 10 } }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', paddingTop: 10 }} />
              <Area type="monotone" dataKey="OCF" fill="url(#fcfGrad)" stroke="#d4a574" strokeWidth={2.5} name="OCF ($B)" />
              <Bar dataKey="FCF" fill="#10b981" opacity={0.8} name="Free Cash Flow ($B)" />
            </ComposedChart>
          ) : tab === 'valuation' ? (
            <LineChart data={rows}>
              <CartesianGrid stroke={gridColor} strokeDasharray="2 4" />
              <XAxis dataKey="year" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
              <YAxis yAxisId="left" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
              <YAxis yAxisId="right" orientation="right" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', paddingTop: 10 }} />
              <Line yAxisId="left" type="monotone" dataKey="PE" stroke="#d4a574" strokeWidth={2.5} dot={{ r: 4 }} name="P/E Ratio" />
              <Line yAxisId="left" type="monotone" dataKey="PBV" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="P/BV" />
              <Line yAxisId="right" type="monotone" dataKey="EPS" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="EPS ($)" />
            </LineChart>
          ) : (
            <BarChart data={rows}>
              <CartesianGrid stroke={gridColor} strokeDasharray="2 4" />
              <XAxis dataKey="year" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
              <YAxis yAxisId="left" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
              <YAxis yAxisId="right" orientation="right" stroke={axisColor} fontSize={11} fontFamily="var(--font-mono)" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', paddingTop: 10 }} />
              <Bar yAxisId="left" dataKey="DE" fill="#ef4444" opacity={0.7} name="Debt/Equity" />
              <Bar yAxisId="right" dataKey="Z" fill="#d4a574" opacity={0.85} name="Altman Z-Score" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}
