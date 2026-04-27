# Luxe Capital · Stock Intelligence Dashboard v3.0

**4-page institutional-grade financial research terminal** built with Next.js 14 + React + Tailwind + Framer Motion.

## 🗺️ Site Map

| Route | Purpose |
|-------|---------|
| `/` | ✨ **Landing page** — Hero, ticker entry, feature showcase |
| `/dashboard?symbol=AAPL` | Full overview — trends, KPIs, ratios |
| `/valuation?symbol=AAPL` | Interactive DCF calculator |
| `/ai-analysis?symbol=AAPL` | AI-generated equity research memo |

**User flow:**
```
/  (type AAPL in hero input)
 ↓
/dashboard?symbol=AAPL  (see full analysis)
 ↓
/valuation?symbol=AAPL  (model DCF)
 ↓
/ai-analysis?symbol=AAPL  (AI research memo)
```

The `symbol` is preserved across pages via URL params — links in the nav automatically carry it forward.

---

## ✨ What's New in v3.0

### 🏠 Landing Page (NEW)
- **Hero section** with oversized editorial typography ("The art of equity research")
- **Large ticker input** — autofocus, glow on focus, submit → redirect
- **8 popular ticker chips** for one-click access (AAPL, MSFT, GOOGL, NVDA, TSLA, AMZN, META, V)
- **Stats strip** — 30+ ratios, 5Y data, 3 engines, US Stocks
- **3 feature cards** with hover animations, numbered 01-03
- **Workflow showcase** — 4-step visual walkthrough + mini dashboard preview
- **Animated floating gold orbs** in background
- **Final CTA** that scrolls back to ticker input

### 🔗 URL-State Architecture
- Every analysis page now reads `symbol` from URL params
- Back button works naturally
- Share links preserve the ticker
- Nav carries symbol across Dashboard / Valuation / AI Analysis
- Direct access to `/dashboard` without symbol → redirects home

---

## 🚀 Quick Start

```bash
cd luxe-capital-v3
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Optional: OpenAI for AI Analysis
```bash
cp .env.example .env.local
# Edit .env.local:
# OPENAI_API_KEY=sk-proj-...
```

Without an OpenAI key, AI Analysis still works — falls back to rule-based template.

---

## 🏗️ File Structure

```
luxe-capital-v3/
├── app/
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # ★ NEW — Landing page
│   ├── globals.css                 # Design tokens
│   ├── dashboard/
│   │   └── page.tsx                # Overview (reads ?symbol=XXX)
│   ├── valuation/
│   │   └── page.tsx                # DCF (reads ?symbol=XXX)
│   ├── ai-analysis/
│   │   └── page.tsx                # AI (reads ?symbol=XXX)
│   └── api/ai-analysis/
│       └── route.ts                # AI streaming endpoint
├── components/
│   ├── Header.tsx                  # ★ Updated — preserves symbol across nav
│   ├── Markdown.tsx                # Lightweight MD renderer
│   ├── LuxeSlider.tsx              # Custom slider for DCF
│   ├── SearchBar.tsx               # Ticker input w/ suggestions
│   ├── HeroBanner.tsx              # Big ticker display
│   ├── QuickInsight.tsx            # 4-card verdict summary
│   ├── KPIGrid.tsx                 # 8 KPI cards
│   ├── TrendsSection.tsx           # 4 tabbed charts
│   ├── ValuationCard.tsx           # DCF summary
│   ├── RatiosTable.tsx             # Historical ratios
│   ├── States.tsx                  # Loading + empty
│   ├── ThemeProvider.tsx           # Dark/light context
│   └── ThemeToggle.tsx             # Sun/moon button
├── lib/
│   ├── api.ts                      # FastAPI client + demo data
│   ├── dcf.ts                      # DCF engine
│   └── utils.ts                    # Formatting helpers
├── tailwind.config.ts              # Gold palette + animations
├── next.config.js                  # /api proxy to FastAPI
└── package.json                    # Next 14.2.35 (patched)
```

---

## 🎨 Design Language

### Landing Page Aesthetic
- **Typography**: 8xl–9xl display serif (Fraunces) with italic "equity research"
- **Negative space**: Generous padding, centered column layout
- **Gold gradient** on the main headline and input glow
- **Grain texture** body overlay for filmic feel
- **Floating orbs** animated with Framer Motion (8-10s cycles)
- **Numbered sections** (∕ 01, ∕ 02) editorial magazine style

### Color System
| Token | Light | Dark |
|-------|-------|------|
| `--bg-base` | `#faf7f2` (cream) | `#08080a` (obsidian) |
| `--accent` | `#b8863f` (antique gold) | `#d4a574` (warm gold) |
| `--positive` | `#0a7c3f` | `#10b981` |
| `--negative` | `#b91c47` | `#ef4444` |

### Typography
- **Fraunces** (display, italic support, optical sizing)
- **Manrope** (body)
- **JetBrains Mono** (numbers, labels)

---

## 🔌 Backend Integration

The frontend proxies `/api/financials` → `http://127.0.0.1:8000/api/financials` (FastAPI).
**No backend changes needed.**

Falls back to built-in demo data for AAPL, MSFT, GOOGL, NVDA if backend is offline.

---

## 💡 Pro Tips

1. **Landing page**: Typing in the big hero input autofocuses on page load
2. **URL sharing**: Send `https://yourapp.com/valuation?symbol=NVDA` to share a specific analysis
3. **Nav preservation**: Clicking between Dashboard/Valuation/AI keeps your symbol
4. **Back button**: Always takes you back to `/` (landing)
5. **Keyboard**: Press Tab from landing to move into ticker input instantly

---

## 🚢 Deploy

### Vercel (recommended)
```bash
npm install -g vercel
vercel --prod
```

### Self-host
```bash
npm run build
npm start  # port 3000
```

Set env vars in production:
- `BACKEND_URL` — your FastAPI URL
- `OPENAI_API_KEY` — (optional) enables streaming AI

---

**Made with 🎩 by Claude for Kiadtisak**
