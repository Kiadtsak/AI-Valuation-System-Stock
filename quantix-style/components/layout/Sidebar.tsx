'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BarChart3, Wallet, Star,
  TrendingUp, ArrowLeftRight, Sparkles,
  LineChart, Activity, MessageCircle, Settings,
  ChevronLeft,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Portfolio', href: '/portfolio', icon: BarChart3, badge: '·' },
      { label: 'Wallet',    href: '/wallet',    icon: Wallet },
      { label: 'Watchlist', href: '/watchlist', icon: Star },
    ],
  },
  {
    title: 'Activity',
    items: [
      { label: 'Trade',        href: '/trade',        icon: TrendingUp },
      { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Others',
    items: [
      { label: 'Insights',      href: '/insights',      icon: Sparkles },
      { label: 'Analytics',     href: '/analytics',     icon: LineChart, badge: 'Beta' },
      { label: 'Market Trends', href: '/market-trends', icon: Activity },
    ],
  },
  {
    title: 'Others',
    items: [
      { label: 'Support',  href: '/support',  icon: MessageCircle, badge: 2 },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 top-0 h-screen w-[280px] z-30 bg-ink-900/40 backdrop-blur-2xl border-r border-white/5 flex flex-col bg-stars"
    >
      {/* ──── Brand header ──── */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 flex items-center justify-center">
            {/* Logo mark */}
            <svg viewBox="0 0 32 32" className="w-9 h-9" fill="none">
              <path
                d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
                stroke="url(#violet-gradient)"
                strokeWidth="1.5"
                fill="rgba(155, 140, 255, 0.05)"
              />
              <path
                d="M11 11 L16 8 L21 11 L16 14 Z"
                fill="#9b8cff"
                opacity="0.9"
              />
              <path
                d="M11 21 L16 18 L21 21 L16 24 Z"
                fill="#9b8cff"
                opacity="0.5"
              />
              <defs>
                <linearGradient id="violet-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#b8aaff" />
                  <stop offset="100%" stopColor="#6f5fd6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div className="font-display text-lg leading-none text-white tracking-tight">
              Quantix
            </div>
            <div className="text-[10px] text-white/40 mt-0.5 font-mono uppercase tracking-[0.15em]">
              AI-Powered Trading
            </div>
          </div>
        </Link>
        <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition border border-white/10">
          <ChevronLeft size={14} className="text-white/60" />
        </button>
      </div>

      {/* ──── Welcome block ──── */}
      <div className="px-6 py-5 border-b border-white/5">
        <h2 className="font-display text-3xl text-white leading-tight tracking-tight">
          Welcome<br />Back, <em className="text-violet-glow not-italic">Jason</em>
        </h2>
        <p className="text-xs text-white/40 mt-2 font-mono">
          Last login: 15 Jun 2025
        </p>
      </div>

      {/* ──── Navigation ──── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="mb-6">
            <div className="px-3 mb-2 text-[11px] font-mono uppercase tracking-[0.18em] text-white/30">
              {group.title}
            </div>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        relative flex items-center gap-3 px-3 py-2.5 rounded-lg
                        text-sm transition-all duration-200
                        ${active
                          ? 'sidebar-item-active text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <item.icon size={16} strokeWidth={1.5} className={active ? 'text-violet-glow' : ''} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={`
                          ${typeof item.badge === 'number'
                            ? 'min-w-[18px] h-[18px] px-1 rounded-full bg-violet-glow text-ink-950 text-[10px] font-bold flex items-center justify-center'
                            : item.badge === '·'
                            ? 'w-1.5 h-1.5 rounded-full bg-violet-glow'
                            : 'px-2 py-0.5 rounded-md bg-violet-glow/15 text-violet-glow text-[10px] font-mono uppercase tracking-wider'
                          }
                        `}>
                          {item.badge !== '·' ? item.badge : ''}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ──── Footer profile ──── */}
      <div className="px-4 py-4 border-t border-white/5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-soft to-violet-deep flex items-center justify-center font-display text-base text-ink-950 font-bold">
          J
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate">Jason Cooper</div>
          <div className="text-[10px] text-white/40 font-mono truncate">jason@quantix.io</div>
        </div>
      </div>
    </motion.aside>
  );
}
