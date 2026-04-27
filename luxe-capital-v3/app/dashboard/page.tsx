'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { AlertCircle, Calculator, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSymbol = searchParams.get('symbol') || '';

  const [symbol, setSymbol] = useState<string>('');
  const [data, setData] = useState<FinancialsResponse | null>(null);
  const [source, setSource] = useState<'backend' | 'demo'>('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (sym: string) => {
    setLoading(true);
    setError(null);
    setSymbol(sym);

    // Update URL param so user can bookmark
    const newUrl = `/dashboard?symbol=${sym}`;
    window.history.replaceState(null, '', newUrl);

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

  // Load from URL on first mount
  useEffect(() => {
    if (urlSymbol) {
      handleSearch(urlSymbol);
    } else {
      // No symbol in URL — redirect back to landing
      router.replace('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        {/* Search (change ticker) */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mb-10 max-w-2xl"
        >
          <SearchBar
            onSearch={handleSearch}
            loading={loading}
            currentSymbol={symbol}
          />
        </motion.div>

        {/* Quick action cards */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mb-16 grid md:grid-cols-2 gap-3"
          >
            <FeatureLink
              href={`/valuation?symbol=${symbol}`}
              icon={Calculator}
              label="DCF Calculator"
              desc="Interactive intrinsic value with sensitivity analysis"
            />
            <FeatureLink
              href={`/ai-analysis?symbol=${symbol}`}
              icon={Sparkles}
              label="AI Equity Research"
              desc="Comprehensive analysis written by GPT-4o"
            />
          </motion.div>
        )}

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

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DashboardContent />
    </Suspense>
  );
}

function FeatureLink({
  href,
  icon: Icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group glass glass-hover rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-px bg-gold-gradient opacity-0 group-hover:opacity-60 transition-opacity" />

      <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-lg text-[var(--text-primary)] leading-tight">
          {label}
        </div>
        <div className="text-xs text-[var(--text-secondary)] truncate">{desc}</div>
      </div>
      <ArrowRight
        size={16}
        className="text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all flex-shrink-0"
      />
    </Link>
  );
}
