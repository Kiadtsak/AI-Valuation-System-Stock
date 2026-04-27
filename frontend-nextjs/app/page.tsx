'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { HeroBanner } from '@/components/HeroBanner';
import { QuickInsight } from '@/components/QuickInsight';
import { KPIGrid } from '@/components/KPIGrid';
import { TrendsSection } from '@/components/TrendsSection';
import { ValuationCard } from '@/components/ValuationCard';
import { RatiosTable } from '@/components/RatiosTable';
import { LoadingState, EmptyState } from '@/components/States';
import { loadFinancials, type FinancialsResponse } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

export default function Home() {
  const [symbol, setSymbol] = useState<string>('');
  const [data, setData] = useState<FinancialsResponse | null>(null);
  const [source, setSource] = useState<'backend' | 'demo'>('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (sym: string) => {
    setLoading(true);
    setError(null);
    setSymbol(sym);
    try {
      const result = await loadFinancials(sym);
      setData(result.data);
      setSource(result.source);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Autoload AAPL on first visit for demo
  useEffect(() => {
    handleSearch('AAPL');
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Background layers */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-40" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-radial-glow pointer-events-none" />

      <Header />

      <main className="relative max-w-7xl mx-auto px-6 pt-16 pb-24">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mb-16 max-w-2xl"
        >
          <SearchBar
            onSearch={handleSearch}
            loading={loading}
            currentSymbol={symbol}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass rounded-3xl p-12 text-center border-[var(--negative)]/20"
            >
              <AlertCircle className="mx-auto mb-4 text-[var(--negative)]" size={32} />
              <h3 className="font-display text-2xl mb-2">Data unavailable</h3>
              <p className="text-[var(--text-secondary)] text-sm">{error}</p>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoadingState />
            </motion.div>
          ) : !data ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState />
            </motion.div>
          ) : (
            <motion.div
              key={data.symbol}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-16"
            >
              <HeroBanner data={data} source={source} />

              <div className="divider-gold" />

              <QuickInsight data={data} />
              <KPIGrid data={data} />
              <TrendsSection data={data} />
              <ValuationCard data={data} />
              <RatiosTable data={data} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative border-t border-[var(--border-subtle)] mt-24">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
            Luxe Capital · Powered by FinanceToolkit + FinancialModelingPrep
          </div>
          <div className="font-mono text-[10px] text-[var(--text-muted)]">
            For research only · Not investment advice
          </div>
        </div>
      </footer>
    </div>
  );
}
