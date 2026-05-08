'use client';

import { motion } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { getCryptoIcon } from '@/components/ui/CryptoIcons';

interface MarketRow {
  rank: number;
  symbol: string;       // e.g. "BTC"
  name: string;         // e.g. "Bitcoin"
  price: number;
  change7d: number;     // percentage
  change30d: number;    // percentage
}

interface Props {
  data: MarketRow[];
  filter?: string;
  onFilterChange?: (f: string) => void;
}

export function MarketOverview({ data, filter = 'All', onFilterChange }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="card-glass rounded-2xl p-6 mt-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-white/40 font-mono uppercase tracking-wider mb-2">
            <Clock size={11} />
            Live Updates
          </div>
          <h2 className="font-display text-3xl text-white tracking-tight">
            Market <em className="text-violet-glow not-italic">Overview</em>
          </h2>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg p-1">
          {['All', 'Top', 'Trending'].map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange?.(f)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition
                ${f === filter
                  ? 'bg-violet-glow/20 text-violet-glow'
                  : 'text-white/50 hover:text-white'
                }
              `}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-4 text-[11px] font-mono uppercase tracking-wider text-white/40 font-normal">
                No
              </th>
              <th className="text-left py-3 px-4 text-[11px] font-mono uppercase tracking-wider text-white/40 font-normal">
                <div className="flex items-center gap-1">
                  Coin name
                  <ArrowSort />
                </div>
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-mono uppercase tracking-wider text-white/40 font-normal">
                <div className="flex items-center justify-end gap-1">
                  Price
                  <ArrowSort />
                </div>
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-mono uppercase tracking-wider text-white/40 font-normal">
                <div className="flex items-center justify-end gap-1">
                  7D%
                  <ArrowSort />
                </div>
              </th>
              <th className="text-right py-3 px-4 text-[11px] font-mono uppercase tracking-wider text-white/40 font-normal">
                <div className="flex items-center justify-end gap-1">
                  30D%
                  <ArrowSort />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <motion.tr
                key={row.symbol}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.04 }}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition group"
              >
                <td className="py-4 px-4 text-sm text-white/40 font-mono">
                  #{row.rank}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    {getCryptoIcon(row.symbol, 28)}
                    <div>
                      <div className="text-sm text-white font-medium">{row.name}</div>
                      <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider">
                        {row.symbol}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="text-sm text-white num-display">
                    ${row.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <PercentPill value={row.change7d} />
                </td>
                <td className="py-4 px-4 text-right">
                  <PercentPill value={row.change30d} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}

function PercentPill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`
      inline-block px-2 py-0.5 rounded-md text-xs font-medium
      ${positive ? 'pill-positive' : 'pill-negative'}
    `}>
      {positive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

function ArrowSort() {
  return (
    <span className="flex flex-col -space-y-0.5">
      <ChevronUp size={8} className="text-white/30" />
      <ChevronDown size={8} className="text-white/30" />
    </span>
  );
}
