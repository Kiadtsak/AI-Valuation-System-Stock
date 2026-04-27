# Luxe Capital · Stock Intelligence Dashboard

Modern, luxury-themed financial analysis dashboard built with Next.js 14 + React + Tailwind CSS + Framer Motion. Designed to integrate seamlessly with your existing FastAPI backend (`Analysis_System_Stock`).

## ✨ Features

- **🎨 Luxury Fintech aesthetic** — Fraunces display serif, gold accents (#d4a574), glassmorphism, grain texture overlays
- **🌗 Light/Dark mode** with persistent localStorage preference
- **📊 6 polished sections**: Hero, Quick Insight, KPI Grid, Trends, Valuation, Ratios Archive
- **⚡ Smooth animations** — Framer Motion staggered reveals, shimmer loading states
- **🔌 FastAPI integration** — Auto-proxies `/api/*` to `http://127.0.0.1:8000`
- **💡 Demo mode fallback** — Runs with built-in data when backend is offline (AAPL, MSFT, GOOGL, NVDA)
- **📱 Fully responsive** (mobile, tablet, desktop)

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd frontend-nextjs
npm install
```

### 2. Run dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 3. (Optional) Set backend URL
If your FastAPI runs on a different host, create `.env.local`:
```
BACKEND_URL=http://your-backend:8000
```

## 🏗️ Architecture

```
frontend-nextjs/
├── app/
│   ├── layout.tsx           # Root layout + font loading + ThemeProvider
│   ├── page.tsx             # Main dashboard page
│   └── globals.css          # Design tokens, glass effects, grain texture
├── components/
│   ├── Header.tsx           # Sticky glass nav with brand mark
│   ├── SearchBar.tsx        # Ticker input + popular suggestions
│   ├── HeroBanner.tsx       # Symbol + key stats big display
│   ├── QuickInsight.tsx     # 4-card verdict summary
│   ├── KPIGrid.tsx          # 8 performance metric cards
│   ├── TrendsSection.tsx    # 4 tabbed charts (Profit/CF/Valuation/Solvency)
│   ├── ValuationCard.tsx    # DCF intrinsic value
│   ├── RatiosTable.tsx      # Categorized historical ratios
│   ├── States.tsx           # Loading skeleton + empty state
│   ├── ThemeProvider.tsx    # Dark/light toggle context
│   └── ThemeToggle.tsx      # Sun/moon icon button
├── lib/
│   ├── api.ts               # FastAPI client + demo fallback
│   └── utils.ts             # fmtMoney, fmtPct, fmtNum, cn
├── tailwind.config.ts       # Gold palette, glass shadows, animations
├── next.config.js           # /api/* proxy to FastAPI
└── package.json
```

## 🎨 Design Tokens

| Token | Light | Dark |
|-------|-------|------|
| `--bg-base` | `#faf7f2` (cream) | `#08080a` (obsidian) |
| `--accent` | `#b8863f` (antique gold) | `#d4a574` (warm gold) |
| `--positive` | `#0a7c3f` | `#10b981` |
| `--negative` | `#b91c47` | `#ef4444` |
| Display font | Fraunces (serif, optical sizing) | |
| Body font | Manrope (sans, geometric) | |
| Mono font | JetBrains Mono (tabular nums) | |

## 🔗 Backend Integration

The frontend calls `GET /api/financials?symbol=XXX` and expects this shape (which your FastAPI already returns):

```typescript
{
  symbol: string;
  years: string[];
  result: Array<{
    "Stock Symbol": string;
    Year: number;
    ROE: number;
    // ... all ratios
  }>;
  ratios: Record<string, Record<string, number>>;
  latest: object;
  valuation: {
    intrinsic_value_per_share: number;
    wacc_used: number;
    terminal_growth_used: number;
    // ...
  };
}
```

**No backend changes needed** — this is a drop-in replacement for your current `frontend/` folder.

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🎁 Replacing Old Frontend

```bash
# Backup old frontend
mv /path/to/Analysis_System_Stock/frontend /path/to/Analysis_System_Stock/frontend.bak

# Next.js is a standalone app — don't put it inside FastAPI StaticFiles.
# Instead, run it separately and let it proxy /api/* to FastAPI.
```

Then in `app.py`, remove the `StaticFiles` mount since Next.js handles its own routing.

## 💡 Tips

- Use `⌘+K` or click the search bar at top to look up any ticker
- Trend charts have 4 tabs (Profitability / Cash Flow / Valuation / Solvency)
- Ratios table has 6 category filters
- Dark mode is default; toggle via sun/moon icon in top-right

---

**License:** Your project. Built by Claude for Kiadtisak. 🎩
