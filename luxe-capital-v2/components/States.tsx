'use client';

import { motion } from 'framer-motion';

export function LoadingState() {
  return (
    <div className="space-y-8 py-12">
      {/* Hero skeleton */}
      <div>
        <div className="h-4 w-32 bg-[var(--bg-elevated)] rounded shimmer mb-4" />
        <div className="h-24 w-96 bg-[var(--bg-elevated)] rounded-lg shimmer" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-2xl p-5 h-32 shimmer"
          />
        ))}
      </div>

      {/* Chart */}
      <div className="glass rounded-3xl p-8 h-96 shimmer" />
    </div>
  );
}

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-24"
    >
      <div className="inline-block relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gold-gradient opacity-20 blur-2xl absolute inset-0" />
        <div className="relative w-24 h-24 rounded-full glass flex items-center justify-center font-display text-4xl text-gold">
          §
        </div>
      </div>

      <h3 className="font-display text-4xl font-light mb-3 tracking-tight">
        Begin your <em className="text-gold not-italic">research</em>
      </h3>
      <p className="text-[var(--text-secondary)] max-w-md mx-auto">
        Search any ticker to access five years of institutional-grade financial analysis,
        DCF valuation, and risk assessment.
      </p>

      <div className="mt-8 flex flex-wrap gap-2 justify-center">
        {['AAPL', 'MSFT', 'NVDA', 'GOOGL'].map((s) => (
          <span key={s} className="pill text-[var(--text-muted)]">
            Try {s}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
