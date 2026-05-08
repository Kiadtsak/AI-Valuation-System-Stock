'use client';

import { motion } from 'framer-motion';
import { MoreVertical, TrendingUp, TrendingDown } from 'lucide-react';

interface SparklinePoint {
  x: number;
  y: number;
}

interface Props {
  symbol: string;        // "BTC/USDT"
  name: string;          // "Bitcoin"
  icon: React.ReactNode; // crypto icon SVG/img
  price: number;
  change: number;        // percentage
  sparklineData: number[]; // array of values
  sparklineLabel?: string; // "+ 0.04%"
  delay?: number;
}

export function AssetCard({
  symbol, name, icon, price, change, sparklineData, sparklineLabel, delay = 0,
}: Props) {
  const positive = change >= 0;

  // Build sparkline path
  const max = Math.max(...sparklineData);
  const min = Math.min(...sparklineData);
  const range = max - min || 1;
  const w = 280, h = 80;
  const points = sparklineData.map((v, i) => {
    const x = (i / (sparklineData.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Highlight point — find peak
  const peakIdx = sparklineData.indexOf(max);
  const peakX = (peakIdx / (sparklineData.length - 1)) * w;
  const peakY = h - ((max - min) / range) * h;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="card-glass rounded-2xl p-6 relative overflow-hidden min-w-[340px]"
    >
      {/* Side glow accent */}
      <div className={`
        absolute left-0 top-6 bottom-6 w-1 rounded-r-full
        ${positive ? 'bg-positive' : 'bg-negative'}
        opacity-60 blur-[1px]
      `} />

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <div className="text-[11px] text-white/40 font-mono tracking-wider mb-0.5">
              {symbol}
            </div>
            <div className="text-base text-white font-medium">{name}</div>
          </div>
        </div>
        <button className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center transition">
          <MoreVertical size={14} className="text-white/40" />
        </button>
      </div>

      {/* Price */}
      <div className="mb-3">
        <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider mb-1">
          Price
        </div>
        <div className="font-display text-5xl text-white num-display tracking-tight leading-none">
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Change pill */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`
          flex items-center gap-1 px-2 py-1 rounded-md
          ${positive ? 'pill-positive' : 'pill-negative'}
          text-xs font-medium
        `}>
          {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          <span>{positive ? '+' : ''}{change.toFixed(2)}%</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="relative h-[80px] -mx-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Gradient fill */}
          <defs>
            <linearGradient id={`grad-${symbol.replace('/', '-')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={positive ? '#3ddc84' : '#ff5577'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={positive ? '#3ddc84' : '#ff5577'} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Filled area under line */}
          <polygon
            points={`0,${h} ${points} ${w},${h}`}
            fill={`url(#grad-${symbol.replace('/', '-')})`}
          />

          {/* Line itself */}
          <polyline
            points={points}
            fill="none"
            stroke={positive ? '#3ddc84' : '#ff5577'}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Peak marker */}
          <circle
            cx={peakX}
            cy={peakY}
            r="3"
            fill={positive ? '#3ddc84' : '#ff5577'}
          />
          <circle
            cx={peakX}
            cy={peakY}
            r="6"
            fill="none"
            stroke={positive ? '#3ddc84' : '#ff5577'}
            strokeWidth="1"
            opacity="0.4"
          />
        </svg>

        {sparklineLabel && (
          <div className="absolute top-2 right-4 text-xs text-white/60 font-mono">
            {sparklineLabel}
          </div>
        )}
      </div>
    </motion.div>
  );
}
