import React from 'react';

interface IconProps {
  size?: number;
}

export function BitcoinIcon({ size = 32 }: IconProps) {
  return (
    <div
      style={{ width: size, height: size, background: 'linear-gradient(135deg, #f7931a 0%, #ff7800 100%)' }}
      className="rounded-full flex items-center justify-center"
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 32 32" fill="none">
        <path d="M21.7 14.5c.4-2.6-1.6-4-4.3-4.9l.9-3.5-2.1-.5-.8 3.4c-.6-.1-1.1-.3-1.7-.4l.9-3.4-2.1-.5-.9 3.5c-.5-.1-.9-.2-1.4-.3v0l-2.9-.7-.6 2.3s1.6.4 1.5.4c.9.2 1 .8.9 1.3l-1 4.2c.1 0 .1 0 .2.1l-.2-.1-1.5 6c-.1.3-.4.7-1 .5 0 0-1.5-.4-1.5-.4l-1 2.4 2.7.7c.5.1 1 .3 1.5.4l-.9 3.5 2.1.5.9-3.4c.6.2 1.1.3 1.7.4l-.9 3.4 2.1.5.9-3.5c3.6.7 6.3.4 7.4-2.8.9-2.6-.1-4.1-2-5.1 1.3-.3 2.4-1.2 2.7-3.1zm-4.8 6.7c-.6 2.6-5 1.2-6.4.8l1.2-4.6c1.4.4 5.9 1.1 5.2 3.8zm.6-6.7c-.6 2.4-4.2 1.2-5.4.9l1.1-4.2c1.2.3 4.9.9 4.3 3.3z" fill="white"/>
      </svg>
    </div>
  );
}

export function EthereumIcon({ size = 32 }: IconProps) {
  return (
    <div style={{ width: size, height: size, background: 'linear-gradient(135deg, #627eea 0%, #4258d8 100%)' }} className="rounded-full flex items-center justify-center">
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <path d="M11.998 2v7.4l6.247 2.79L11.998 2z" fill="white" fillOpacity="0.6" />
        <path d="M11.998 2L5.75 12.19l6.248-2.79V2z" fill="white" />
        <path d="M11.998 16.978v5.018L18.25 13.36l-6.252 3.618z" fill="white" fillOpacity="0.6" />
        <path d="M11.998 21.996v-5.02L5.75 13.36l6.248 8.636z" fill="white" />
        <path d="M11.998 15.819l6.247-3.629-6.247-2.789v6.418z" fill="white" fillOpacity="0.4" />
        <path d="M5.75 12.19l6.248 3.629V9.401L5.75 12.19z" fill="white" fillOpacity="0.8" />
      </svg>
    </div>
  );
}

export function SolanaIcon({ size = 32 }: IconProps) {
  return (
    <div style={{ width: size, height: size, background: 'linear-gradient(135deg, #9945ff 0%, #14f195 100%)' }} className="rounded-full flex items-center justify-center">
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 32 32" fill="white">
        <path d="M9.6 21.5c.2-.2.5-.3.8-.3h17.3c.5 0 .7.6.4.9l-3.4 3.4c-.2.2-.5.3-.8.3H6.7c-.5 0-.7-.6-.4-.9l3.3-3.4z" />
        <path d="M9.6 6.9c.2-.2.5-.3.8-.3h17.3c.5 0 .7.6.4.9l-3.4 3.4c-.2.2-.5.3-.8.3H6.7c-.5 0-.7-.6-.4-.9l3.3-3.4z" />
        <path d="M22.4 14.2c-.2-.2-.5-.3-.8-.3H4.4c-.5 0-.7.6-.4.9l3.4 3.4c.2.2.5.3.8.3h17.3c.5 0 .7-.6.4-.9l-3.5-3.4z" />
      </svg>
    </div>
  );
}

export function LitecoinIcon({ size = 32 }: IconProps) {
  return (
    <div style={{ width: size, height: size, background: 'linear-gradient(135deg, #345d9d 0%, #1d3666 100%)' }} className="rounded-full flex items-center justify-center">
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 32 32" fill="white">
        <path d="M16 0c8.8 0 16 7.2 16 16s-7.2 16-16 16S0 24.8 0 16 7.2 0 16 0zm-2.6 7.9l-3.5 14.6 11 .1.5-2.2-8.4-.1 3.4-12.4h-3z" fillRule="evenodd"/>
      </svg>
    </div>
  );
}

export function TetherIcon({ size = 32 }: IconProps) {
  return (
    <div style={{ width: size, height: size, background: '#26a17b' }} className="rounded-full flex items-center justify-center">
      <span className="text-white font-bold text-xs">₮</span>
    </div>
  );
}

export function TronIcon({ size = 32 }: IconProps) {
  return (
    <div style={{ width: size, height: size, background: '#ef0027' }} className="rounded-full flex items-center justify-center">
      <span className="text-white font-bold text-xs">T</span>
    </div>
  );
}

// Helper for lookup
export const CRYPTO_ICONS: Record<string, React.FC<IconProps>> = {
  BTC: BitcoinIcon,
  ETH: EthereumIcon,
  SOL: SolanaIcon,
  LTC: LitecoinIcon,
  USDT: TetherIcon,
  TRX: TronIcon,
};

export function getCryptoIcon(symbol: string, size: number = 32) {
  const Icon = CRYPTO_ICONS[symbol.toUpperCase()];
  if (Icon) return <Icon size={size} />;
  return (
    <div style={{ width: size, height: size }} className="rounded-full bg-violet-glow/20 flex items-center justify-center text-violet-glow font-bold text-xs">
      {symbol.slice(0, 2)}
    </div>
  );
}
