'use client';

import { motion } from 'framer-motion';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';
import type { FinancialsResponse } from '@/lib/api';
import { fmtMoney, fmtNum, cn } from '@/lib/utils';

export function ValuationCard({ data }: { data: FinancialsResponse }) {
  const v = data.valuation;
  if (!v || v.error) {
    return (
      <section className="glass rounded-3xl p-8 text-center">
        <AlertCircle className="mx-auto mb-3 text-[var(--text-muted)]" size={24} />
        <div className="font-mono text-xs text-[var(--text-muted)]">
          Valuation data unavailable
        </div>
      </section>
    );
  }

  const iv = v.intrinsic_value_per_share || 0;
  const latestPrice = data.result[data.result.length - 1]?.price || 0;
  const upside = latestPrice > 0 ? ((iv - latestPrice) / latestPrice) * 100 : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)] mb-2">
            ∕ 04 · Intrinsic Value
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-light tracking-tight">
            DCF <em className="text-gold not-italic">Valuation</em>
          </h2>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden relative">
        {/* Decorative gradient mesh */}
        <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-px bg-gold-gradient opacity-60" />

        <div className="relative grid md:grid-cols-3 gap-8 p-8 md:p-12">
          {/* Main IV display */}
          <div className="md:col-span-1 text-center md:text-left md:border-r md:border-[var(--border-subtle)] md:pr-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] mb-3">
              Intrinsic Value / Share
            </div>
            <div className="font-display font-light text-7xl leading-none">
              <span className="text-gold">${iv.toFixed(2)}</span>
            </div>
            {latestPrice > 0 && (
              <div className="mt-4 font-mono text-xs text-[var(--text-secondary)]">
                vs. market ${latestPrice.toFixed(2)} ·{' '}
                <span
                  className={cn(
                    'font-semibold',
                    upside >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'
                  )}
                >
                  {upside >= 0 ? '+' : ''}{upside.toFixed(1)}% {upside >= 0 ? 'upside' : 'downside'}
                </span>
              </div>
            )}
          </div>

          {/* Assumptions */}
          <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-6">
            <AssumptionBox label="WACC" value={`${((v.wacc_used || 0) * 100).toFixed(2)}%`} />
            <AssumptionBox label="Terminal g" value={`${((v.terminal_growth_used || 0) * 100).toFixed(2)}%`} />
            <AssumptionBox label="Equity Value" value={fmtMoney(v.intrinsic_equity_value)} />
            <AssumptionBox label="Shares Out" value={fmtNum((v.shares_outstanding || 0) / 1e6, 0) + 'M'} />
            <AssumptionBox label="Sector" value={v.sector || '—'} />
            {v.pv_terminal_value !== undefined && (
              <AssumptionBox label="Terminal PV" value={fmtMoney(v.pv_terminal_value)} />
            )}
          </div>
        </div>

        {/* Forecast strip */}
        {v.cashflows_forecast && v.cashflows_forecast.length > 0 && (
          <div className="border-t border-[var(--border-subtle)] p-6 md:p-8 bg-[var(--bg-elevated)]/30">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">
              10-Year Cash Flow Forecast
            </div>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {v.cashflows_forecast.slice(0, 10).map((cf, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center p-2 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--accent)] transition-colors"
                >
                  <div className="font-mono text-[9px] text-[var(--text-muted)]">Y{i + 1}</div>
                  <div className="num-display text-xs text-[var(--text-primary)] mt-1">
                    {fmtMoney(cf)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function AssumptionBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">
        {label}
      </div>
      <div className="num-display text-lg text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}
