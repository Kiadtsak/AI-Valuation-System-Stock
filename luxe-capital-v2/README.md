# Luxe Capital · Stock Intelligence Dashboard v2.0

Modern, luxury-themed financial analysis dashboard with **3 full pages**:

1. **Overview** (`/`) — At-a-glance analysis of any ticker
2. **DCF Valuation** (`/valuation`) — Interactive discounted cash flow calculator
3. **AI Analysis** (`/ai-analysis`) — GPT-powered equity research reports

Built with **Next.js 14 + React + Tailwind CSS + Framer Motion**. Designed to integrate seamlessly with your existing FastAPI backend (`Analysis_System_Stock`).

## ✨ What's New in v2.0

### 📐 DCF Valuation Page
- **4 real-time sliders**: Initial growth, Terminal growth, WACC, Forecast period
- **Auto-populated** from historical data (WACC from latest year, growth from 5Y CAGR)
- **Live sensitivity matrix** — 5×5 grid showing value per share across WACC × Terminal Growth
- **Value decomposition bars** — visualize explicit vs terminal value contribution
- **Projected cash flows chart** — see FCF, PV, growth rate per year
- **Verdict** — Auto-classifies as Undervalued / Fair / Overvalued based on 15% margin

### 🧠 AI Analysis Page
- **Streaming report** — watch the analysis type out in real time
- **3-tier fallback strategy**:
  1. If `OPENAI_API_KEY` set → streams from OpenAI directly
  2. Else tries FastAPI backend `/api/ai-analysis`
  3. Else uses rule-based template (always works)
- **Structured output** — 5 sections in Thai: Business Overview, Strengths, Concerns, Valuation Thesis, Recommendation
- **Copy-to-clipboard** functionality
- **Research memo design** — traffic light header, paper texture, monospace timestamps

### 🔒 Security Updates
- Upgraded to **Next.js 14.2.35** (patched version, CVE-2025-55183/55184/67779)

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
cd frontend-nextjs
npm install
```

### 2. (Optional) Configure AI
Copy `.env.example` to `.env.local` and add your OpenAI key:
```bash
cp .env.example .env.local
# Edit .env.local, add:
# OPENAI_API_KEY=sk-proj-...
```

> **Without OpenAI key**: AI Analysis still works — uses a sophisticated rule-based fallback that analyzes the actual financials.

### 3. Run dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Architecture

```
frontend-nextjs/
├── app/
│   ├── layout.tsx              # Root layout + fonts + theme
│   ├── page.tsx                # Overview (home)
│   ├── globals.css             # Design tokens + glass effects
│   ├── valuation/
│   │   └── page.tsx            # DCF Calculator
│   ├── ai-analysis/
│   │   └── page.tsx            # AI Research
│   └── api/
│       └── ai-analysis/
│           └── route.ts        # AI streaming API (edge runtime)
├── components/
│   ├── Header.tsx              # Sticky nav w/ active indicator
│   ├── SearchBar.tsx           # Ticker input w/ suggestions
│   ├── LuxeSlider.tsx          # ★ NEW — Custom slider for DCF
│   ├── Markdown.tsx            # ★ NEW — Lightweight MD renderer
│   ├── HeroBanner.tsx          # Big symbol + stats
│   ├── QuickInsight.tsx        # 4-card verdict summary
│   ├── KPIGrid.tsx             # 8 KPI cards
│   ├── TrendsSection.tsx       # 4 tabbed charts
│   ├── ValuationCard.tsx       # DCF summary card
│   ├── RatiosTable.tsx         # Historical ratios (6 categories)
│   ├── States.tsx              # Loading + empty
│   ├── ThemeProvider.tsx       # Dark/light context
│   └── ThemeToggle.tsx         # Sun/moon button
├── lib/
│   ├── api.ts                  # FastAPI client + demo fallback
│   ├── dcf.ts                  # ★ NEW — DCF engine + sensitivity
│   └── utils.ts                # Formatting helpers
├── tailwind.config.ts          # Gold palette + animations
├── next.config.js              # /api/financials proxy to FastAPI
└── package.json
```

---

## 🎨 Design Language

### Typography Stack
| Role | Font | Use |
|------|------|-----|
| Display | **Fraunces** | Headlines, hero, emphasis |
| Body | **Manrope** | Paragraph text, descriptions |
| Mono | **JetBrains Mono** | Numbers, labels, code |

### Color Palette
| Token | Light | Dark |
|-------|-------|------|
| `--bg-base` | `#faf7f2` (cream) | `#08080a` (obsidian) |
| `--accent` | `#b8863f` (antique gold) | `#d4a574` (warm gold) |
| `--positive` | `#0a7c3f` | `#10b981` |
| `--negative` | `#b91c47` | `#ef4444` |

### Signature Effects
- **Glassmorphism**: `backdrop-blur(20px) saturate(180%)` + subtle border
- **Gold gradient text**: `linear-gradient(135deg, #d4a574 0%, #f4e0ad 50%, #b8863f 100%)`
- **Grain overlay**: SVG noise texture on body
- **Radial glow**: Soft gold orb behind hero sections
- **Grid background**: 40px × 40px subtle lines

---

## 🔌 Backend Integration

### `/api/financials` — uses your existing FastAPI endpoint
```
Next.js rewrites /api/* → http://127.0.0.1:8000/api/*
```
**No backend changes needed.** Falls back to demo data if backend is offline.

### `/api/ai-analysis` — Next.js handles internally
This endpoint is **client-side Next.js route** (not proxied to FastAPI) so it can stream directly to OpenAI and take advantage of the Edge runtime.

#### Want to use your own backend?
If you want AI analysis to go through FastAPI instead, add this endpoint to your FastAPI:

```python
# app.py
from Blackend.gpt_api import get_company_description

@app.post("/api/ai-analysis")
async def ai_analysis(payload: dict):
    symbol = payload.get("symbol", "")
    if not symbol:
        raise HTTPException(400, "symbol required")
    analysis = get_company_description(symbol)  # your existing function
    return {"analysis": analysis}
```

The frontend will auto-detect and use your backend.

---

## 📦 Build for Production

```bash
npm run build
npm start
```

Runs on port 3000 by default. Deploy to **Vercel** (recommended) with one click, or use any Node hosting.

---

## 💡 Usage Tips

### DCF Valuation
- Sliders auto-derive defaults from the 5Y history of the selected ticker
- Yellow-highlighted cell in sensitivity matrix = your current assumptions
- Green shaded cells = >15% upside · Red shaded = >15% downside
- Toggle **Fade Growth** off for perpetuity-style constant growth

### AI Analysis
- Click **Generate AI Report** to stream a full Thai-language research memo
- Header shows the source: `openai`, `fastapi`, or `rule-based`
- Click **Copy** to clipboard for easy pasting into notes
- **Regenerate** for multiple takes on the same financials

---

## 🗂️ 3-Page Summary

```
┌─────────────────────────────────────────────────────────┐
│  /  (Overview)                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Search + Feature Shortcuts                       │   │
│  │ Hero Banner (ticker + big numbers)               │   │
│  │ Quick Insight (4 verdict cards)                  │   │
│  │ KPI Grid (8 metrics)                             │   │
│  │ Trends (4 tabbed charts)                         │   │
│  │ DCF Summary (read-only)                          │   │
│  │ Ratios Archive (6 categories)                    │   │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│  /valuation  (DCF Calculator)                           │
│  ┌─────────────┬─────────────────────────────────────┐   │
│  │ Assumptions │ Verdict Hero (IV/share + upside %)  │  │
│  │  - Sliders  │ Projected Cash Flows (chart)        │  │
│  │  - Toggle   │ Sensitivity Matrix (5×5 WACC × g)   │  │
│  │  - Base Data│                                     │  │
│  └─────────────┴─────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  /ai-analysis  (GPT Research)                           │
│  ┌─────────────┬─────────────────────────────────────┐   │
│  │ Subject     │ Research Memo (streaming markdown)  │  │
│  │ Input Data  │  - Business Overview                 │  │
│  │ Engine Info │  - Strengths / Concerns             │  │
│  │ [Generate]  │  - Valuation Thesis                 │  │
│  │             │  - Recommendation                    │  │
│  └─────────────┴─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

**Made with 🎩 by Claude for Kiadtisak**
