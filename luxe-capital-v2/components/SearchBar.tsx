'use client';

import { useState, FormEvent, KeyboardEvent } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SUGGESTIONS = [
  'AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'AMZN', 'META', 'AMD', 'V', 'KO',
];

interface Props {
  onSearch: (symbol: string) => void;
  loading?: boolean;
  currentSymbol?: string;
}

export function SearchBar({ onSearch, loading, currentSymbol }: Props) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  const handle = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim().toUpperCase();
    if (v) onSearch(v);
  };

  const filtered = value
    ? SUGGESTIONS.filter((s) => s.startsWith(value.toUpperCase()))
    : SUGGESTIONS.slice(0, 6);

  return (
    <form onSubmit={handle} className="relative w-full">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search ticker · AAPL, MSFT, NVDA..."
          className="w-full pl-12 pr-32 py-4 glass rounded-full font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all uppercase"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-full bg-gold-gradient text-ink-900 font-mono text-[11px] uppercase tracking-[0.15em] font-semibold hover:shadow-gold-glow transition-all disabled:opacity-50"
        >
          {loading ? '...' : 'Analyze'}
        </button>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {focused && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full glass rounded-2xl p-3 z-10 shadow-luxe"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <Sparkles size={10} />
              Popular tickers
            </div>
            <div className="flex flex-wrap gap-1.5 p-2">
              {filtered.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => {
                    setValue(s);
                    onSearch(s);
                  }}
                  className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all ${
                    currentSymbol === s
                      ? 'bg-gold-gradient text-ink-900 font-semibold'
                      : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent)] text-[var(--text-primary)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
