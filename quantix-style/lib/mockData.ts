/**
 * Mock crypto market data for the dashboard.
 * In production this connects to FMP API (stocks) or a crypto provider.
 */

export interface CryptoAsset {
  symbol: string;
  pair: string;
  name: string;
  price: number;
  change24h: number;
  sparkline: number[];
  rank?: number;
  change7d?: number;
  change30d?: number;
}

// Generate realistic-looking sparkline data
function generateSparkline(trend: 'up' | 'down' | 'volatile', points = 24): number[] {
  const data: number[] = [];
  let val = 100;
  for (let i = 0; i < points; i++) {
    let change: number;
    if (trend === 'up') {
      change = Math.random() * 4 - 1.5; // mostly up
    } else if (trend === 'down') {
      change = Math.random() * 4 - 2.5; // mostly down
    } else {
      change = Math.random() * 6 - 3;   // volatile
    }
    val += change;
    data.push(val);
  }
  return data;
}

export const FEATURED_ASSETS: CryptoAsset[] = [
  {
    symbol: 'BTC',
    pair: 'BTC/USDT',
    name: 'Bitcoin',
    price: 109687.6,
    change24h: 1.09,
    sparkline: generateSparkline('up'),
  },
  {
    symbol: 'ETH',
    pair: 'ETH/USDT',
    name: 'Ethereum',
    price: 2687.42,
    change24h: -2.01,
    sparkline: generateSparkline('down'),
  },
  {
    symbol: 'SOL',
    pair: 'SOL/USDT',
    name: 'Solana',
    price: 176.34,
    change24h: 3.45,
    sparkline: generateSparkline('volatile'),
  },
];

export const TICKER_TAPE = [
  { symbol: 'BTC/USDT', price: '104,347.43', icon: '₿', color: '#f7931a' },
  { symbol: 'SOL/USDT', price: '176.34', icon: '◎', color: '#9945ff' },
  { symbol: 'LTC/USDT', price: '142.87', icon: 'Ł', color: '#345d9d' },
  { symbol: 'ETH/USDT', price: '2,687.42', icon: 'Ξ', color: '#627eea' },
  { symbol: 'TRX/USDT', price: '0.187', icon: 'T', color: '#ef0027' },
];

export const MARKET_OVERVIEW = [
  { rank: 1, symbol: 'BTC',  name: 'Bitcoin',  price: 102648.00, change7d: 5.24,   change30d: -2.13 },
  { rank: 2, symbol: 'USDT', name: 'Tether',   price: 1.01,      change7d: 0.18,   change30d: 0.25 },
  { rank: 3, symbol: 'ETH',  name: 'Ethereum', price: 3529.42,   change7d: 3.92,   change30d: -1.78 },
  { rank: 4, symbol: 'SOL',  name: 'Solana',   price: 141.75,    change7d: -3.44,  change30d: 7.85 },
  { rank: 5, symbol: 'BNB',  name: 'BNB',      price: 715.20,    change7d: 2.10,   change30d: 4.32 },
  { rank: 6, symbol: 'XRP',  name: 'XRP',      price: 2.45,      change7d: 6.78,   change30d: 12.34 },
  { rank: 7, symbol: 'DOGE', name: 'Dogecoin', price: 0.395,     change7d: -2.45,  change30d: -8.21 },
  { rank: 8, symbol: 'ADA',  name: 'Cardano',  price: 1.08,      change7d: 4.56,   change30d: 9.12 },
];
