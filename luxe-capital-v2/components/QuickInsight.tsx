'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, FileText, CheckCircle2, XCircle, Minus } from 'lucide-react';
import { cn, fmtPct } from '@/lib/utils';
import type { FinancialsResponse } from '@/lib/api';

interface InsightCard {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
}

function buildInsights(data: FinancialsResponse): InsightCard[] {
  const rows = data.result;
  if (!rows || rows.length < 2) return [];

  const latest = rows[rows.length - 1];
  const prev = rows[rows.length - 2];

  // Quality: ROE trend
  const roeDelta = (latest.ROE || 0) - (prev.ROE || 0);
  const quality: InsightCard = roeDelta >= 0
    ? { label: 'Quality', value: 'Improving', tone: 'positive', icon: TrendingUp }
    : { label: 'Quality', value: 'Declining', tone: 'negative', icon: TrendingDown };

  // Cash Flow
  const fcfNow = latest['Free Cash Flow (FCF)'] || 0;
  const fcfPrev = prev['Free Cash Flow (FCF)'] || 0;
  const fcfGrowth = fcfPrev ? ((fcfNow - fcfPrev) / Math.abs(fcfPrev)) * 100 : 0;
  const cf: InsightCard = fcfGrowth >= 0
    ? { label: 'Cash Flow', value: `+${fcfGrowth.toFixed(1)}% FCF Growth`, tone: 'positive', icon: DollarSign }
    : { label: 'Cash Flow', value: `${fcfGrowth.toFixed(1)}% FCF Growth`, tone: 'negative', icon: DollarSign };

  // Risk
  const de = latest['Debt to Equity'] || 0;
  const risk: InsightCard = de > 1.5
    ? { label: 'Risk', value: 'High Debt Levels', tone: 'negative', icon: AlertTriangle }
    : de > 0.5
      ? { label: 'Risk', value: 'Moderate Debt', tone: 'neutral', icon: AlertTriangle }
      : { label: 'Risk', value: 'Conservative', tone: 'positive', icon: AlertTriangle };

  // Verdict — combine signals
  let posCount = 0;
  if (roeDelta >= 0) posCount++;
  if (fcfGrowth >= 0) posCount++;
  if (de < 1.5) posCount++;
  if ((latest['Net Profit Margin'] || 0) > 15) posCount++;

  const verdict: InsightCard =
    posCount >= 3
      ? { label: 'Verdict', value: 'Attractive', tone: 'positive', icon: CheckCircle2 }
      : posCount === 2
        ? { label: 'Verdict', value: 'Mixed Signals', tone: 'neutral', icon: Minus }
        : { label: 'Verdict', value: 'Caution Advised', tone: 'negative', icon: XCircle };

  return [quality, cf, risk, verdict];
}

export function QuickInsight({ data }: { data: FinancialsResponse }) {
  const insights = buildInsights(data);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative"
    >
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] mb-2">
            ∕ 01 · Insight Summary
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-light text-[var(--text-primary)] tracking-tight">
            Quick <em className="text-gold not-italic">Insight</em>
          </h2>
        </div>
        <div className="hidden md:block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] text-right">
          <div>Auto-generated</div>
          <div>From {data.result.length} years of financial data</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {insights.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
            className={cn(
              'relative glass glass-hover rounded-2xl p-5 overflow-hidden',
              item.tone === 'positive' && 'border-[var(--positive)]/20',
              item.tone === 'negative' && 'border-[var(--negative)]/20'
            )}
          >
            {/* Accent glow */}
            <div
              className={cn(
                'absolute top-0 left-0 w-full h-px',
                item.tone === 'positive' && 'bg-[var(--positive)]',
                item.tone === 'negative' && 'bg-[var(--negative)]',
                item.tone === 'neutral' && 'bg-[var(--accent)]'
              )}
              style={{ opacity: 0.4 }}
            />

            <div className="flex items-start justify-between mb-4">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  item.tone === 'positive' && 'bg-[var(--positive)]/10 text-[var(--positive)]',
                  item.tone === 'negative' && 'bg-[var(--negative)]/10 text-[var(--negative)]',
                  item.tone === 'neutral' && 'bg-[var(--accent)]/10 text-[var(--accent)]'
                )}
              >
                <item.icon size={16} strokeWidth={1.5} />
              </div>
            </div>

            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">
              {item.label}
            </div>
            <div className="font-display text-xl text-[var(--text-primary)] leading-tight">
              {item.value}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
