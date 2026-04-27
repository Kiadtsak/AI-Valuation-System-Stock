'use client';

import { motion } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { Bell, Settings, Menu } from 'lucide-react';

export function Header() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 glass border-b border-[var(--border-subtle)]"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-md bg-gold-gradient shadow-gold-glow overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-ink-900 text-lg">
              L
            </div>
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm text-[var(--text-primary)] tracking-wide">
              LUXE CAPITAL
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Stock Intelligence
            </div>
          </div>
        </div>

        {/* Center nav — subtle */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          <a className="hover:text-[var(--accent)] transition-colors cursor-pointer">Overview</a>
          <a className="hover:text-[var(--accent)] transition-colors cursor-pointer">Valuation</a>
          <a className="hover:text-[var(--accent)] transition-colors cursor-pointer">Research</a>
          <a className="hover:text-[var(--accent)] transition-colors cursor-pointer">Archive</a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="w-10 h-10 rounded-full glass glass-hover hidden md:flex items-center justify-center">
            <Bell size={14} className="text-[var(--text-secondary)]" />
          </button>
          <button className="w-10 h-10 rounded-full glass glass-hover hidden md:flex items-center justify-center">
            <Settings size={14} className="text-[var(--text-secondary)]" />
          </button>
          <button className="w-10 h-10 rounded-full glass glass-hover flex md:hidden items-center justify-center">
            <Menu size={14} className="text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
