'use client';

import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  accent?: 'gold' | 'positive' | 'negative';
}

export function LuxeSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  format,
  accent = 'gold',
}: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  const displayVal = format ? format(value) : value.toString();

  const colorMap = {
    gold: 'bg-gold-gradient',
    positive: 'bg-[var(--positive)]',
    negative: 'bg-[var(--negative)]',
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <span className="num-display text-xl text-[var(--text-primary)] font-light">
            {displayVal}
          </span>
          {unit && (
            <span className="font-mono text-xs text-[var(--text-muted)]">{unit}</span>
          )}
        </div>
      </div>

      <div className="relative h-8 flex items-center group">
        {/* Track */}
        <div className="absolute inset-x-0 h-[3px] rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]" />
        {/* Fill */}
        <div
          className={cn('absolute h-[3px] rounded-full transition-all', colorMap[accent])}
          style={{ width: `${pct}%` }}
        />
        {/* Thumb indicator */}
        <div
          className="absolute w-4 h-4 rounded-full bg-[var(--bg-elevated)] border-2 border-[var(--accent)] shadow-gold-glow transition-all pointer-events-none group-hover:scale-125"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative w-full h-8 opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
