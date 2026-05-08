'use client';

import { Home, Search, Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  breadcrumb: BreadcrumbItem[];
  tickers?: Array<{ symbol: string; price: string; icon?: string; color?: string }>;
}

export function TopBar({ breadcrumb, tickers = [] }: Props) {
  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="sticky top-0 z-20 bg-ink-950/60 backdrop-blur-xl border-b border-white/5"
    >
      {/* Top: breadcrumb + search */}
      <div className="px-8 py-4 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm">
          <Home size={14} className="text-white/40" />
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-2">
              <ChevronRight size={12} className="text-white/30" />
              {b.href ? (
                <Link href={b.href} className="text-white/50 hover:text-white transition">
                  {b.label}
                </Link>
              ) : (
                <span className="text-white font-medium">{b.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-violet-glow/50 outline-none text-sm text-white placeholder:text-white/30 transition"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/40 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </div>

          {/* Notifications */}
          <button className="relative w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition">
            <Bell size={14} className="text-white/60" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-glow" />
          </button>
        </div>
      </div>

      {/* Live ticker tape */}
      {tickers.length > 0 && (
        <div className="px-8 py-3 border-t border-white/5 flex items-center gap-8 overflow-x-auto">
          {tickers.map((t, i) => (
            <div key={i} className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
              {t.icon && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: t.color || '#9b8cff' }}
                >
                  {t.icon}
                </div>
              )}
              <span className="text-sm text-white/80 font-mono">{t.symbol}</span>
              <span className="text-white/30 text-xs">|</span>
              <span className="text-sm text-white num-display">${t.price}</span>
            </div>
          ))}
        </div>
      )}
    </motion.header>
  );
}
