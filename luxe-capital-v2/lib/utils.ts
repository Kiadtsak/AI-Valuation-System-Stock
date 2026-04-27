import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format very large currency values (USD Millions) */
export function fmtMoney(val: number | null | undefined, currency = '$'): string {
  if (val == null || !isFinite(val)) return '—';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${currency}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}${currency}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${sign}${currency}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${sign}${currency}${(abs / 1e3).toFixed(2)}K`;
  return `${sign}${currency}${abs.toFixed(2)}`;
}

export function fmtPct(val: number | null | undefined, digits = 2): string {
  if (val == null || !isFinite(val)) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(digits)}%`;
}

export function fmtNum(val: number | null | undefined, digits = 2): string {
  if (val == null || !isFinite(val)) return '—';
  return val.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Get trend color class based on numeric change */
export function trendColor(val: number | null | undefined): string {
  if (val == null || !isFinite(val)) return 'text-[var(--text-muted)]';
  if (val > 0) return 'text-[var(--positive)]';
  if (val < 0) return 'text-[var(--negative)]';
  return 'text-[var(--text-muted)]';
}
