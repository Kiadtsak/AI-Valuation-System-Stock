'use client';

import { motion } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { Bell, Settings, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/',           label: 'Overview'  },
  { href: '/valuation',  label: 'Valuation' },
  { href: '/ai-analysis',label: 'AI Insight'},
];

export function Header() {
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 glass border-b border-[var(--border-subtle)]"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 rounded-md bg-gold-gradient shadow-gold-glow overflow-hidden transition-transform group-hover:scale-105">
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
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors',
                  active
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                {item.label}
                {active && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-2 right-2 h-px bg-gold-gradient"
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </Link>
            );
          })}
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
