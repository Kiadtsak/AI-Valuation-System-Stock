'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import { TopBar } from '@/components/layout/TopBar';
import { AssetCard } from '@/components/cards/AssetCard';
import { MarketOverview } from '@/components/cards/MarketOverview';
import { getCryptoIcon } from '@/components/ui/CryptoIcons';
import { FEATURED_ASSETS, TICKER_TAPE, MARKET_OVERVIEW } from '@/lib/mockData';

export default function DashboardPage() {
  const [filter, setFilter] = useState('All');

  return (
    <div className="min-h-screen pb-12">
      <TopBar
        breadcrumb={[
          { label: 'Overview', href: '/' },
          { label: 'Dashboard' },
        ]}
        tickers={TICKER_TAPE}
      />

      <div className="px-8 pt-8">
        {/* ───── Live Crypto Updates Header ───── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="live-dot" />
            <span className="text-xs text-white/60 font-mono uppercase tracking-wider">
              Last update: 2 min ago
            </span>
          </div>
          <h1 className="font-display text-6xl md:text-7xl font-light tracking-tight leading-none">
            Live <em className="text-violet-glow not-italic">Crypto</em><br />
            Updates
            <span className="inline-block ml-3 align-middle text-violet-glow/60">
              <RefreshCw size={32} className="inline animate-spin-slow" style={{ animationDuration: '8s' }} />
            </span>
          </h1>
        </motion.div>

        {/* ───── Asset cards (horizontal scroll) ───── */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-8 px-8 mb-2 snap-x snap-mandatory">
          {FEATURED_ASSETS.map((asset, i) => (
            <div key={asset.symbol} className="snap-start">
              <AssetCard
                symbol={asset.pair}
                name={asset.name}
                icon={getCryptoIcon(asset.symbol, 44)}
                price={asset.price}
                change={asset.change24h}
                sparklineData={asset.sparkline}
                sparklineLabel={`+ ${(Math.random() * 0.1).toFixed(2)}%`}
                delay={0.3 + i * 0.1}
              />
            </div>
          ))}
        </div>

        {/* ───── Market Overview Table ───── */}
        <MarketOverview
          data={MARKET_OVERVIEW}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>
    </div>
  );
}
