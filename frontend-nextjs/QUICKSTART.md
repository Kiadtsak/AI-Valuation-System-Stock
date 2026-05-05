# 🚀 Quick Start — Run with `npm run dev`

You now have everything in **one folder**: `frontend-nextjs/`

```
frontend-nextjs/
├── package.json          ← root scripts (THIS is where npm run dev lives)
├── scripts/              ← orchestrator
├── backend/              ← FastAPI + DB + Auth + Billing
├── frontend/             ← Next.js (landing, dashboard, valuation, AI, compare)
├── README.md             ← full controller docs
└── PHASE3-6_INTEGRATION.md  ← Phase 3-6 manual integration steps
```

---

## 📋 First Time (One-time setup)

```bash
# 1. Go into the monorepo
cd frontend-nextjs

# 2. Install controller dependencies
npm install

# 3. Generate secrets + create .env files (interactive)
npm run setup
# When prompted, paste your FMP API key
# (or press Enter to skip and add it manually later)
```

---

## ▶️ Every Time After

```bash
cd frontend-nextjs
npm run dev
```

That's it. One command. Everything starts:

```
╭─────────────────────────────────────────╮
│         LUXE CAPITAL · Dev Mode         │
╰─────────────────────────────────────────╯

  01  ▸ Pre-flight checks                    ✓
  02  ▸ Postgres + Redis (Docker)            ✓
  03  ▸ Database migrations                  ✓
  04  ▸ Backend + Frontend (concurrently)    ✓

──────────────  READY  ──────────────

  ▸ Frontend  →  http://localhost:3000
  ▸ Backend   →  http://localhost:8000
  ▸ Postgres  →  postgresql://luxe:luxepass@localhost:5432/luxe
  ▸ Redis     →  redis://localhost:6379

[backend ] INFO: Application startup complete
[frontend] ✓ Ready in 1.2s
```

Press `Ctrl+C` to stop everything cleanly.

---

## ⚠️ Prerequisites

Before running `npm run dev`, make sure you have:

- ✅ **Node.js 18+** — `node --version`
- ✅ **Python 3.10+** — `python3 --version`
- ✅ **Docker Desktop running** — open the app, wait for it to fully start
- ✅ **An FMP API key** — get free one at https://site.financialmodelingprep.com/developer/docs

---

## 🎯 Common Commands

| What | Command |
|------|---------|
| Start everything | `npm run dev` |
| Stop everything | `Ctrl+C` (or `npm run stop`) |
| Backend only | `npm run dev:backend` |
| Frontend only | `npm run dev:frontend` |
| Just Docker | `npm run dev:infra` |
| Run migrations | `npm run dev:migrate` |
| View Docker logs | `npm run logs` |
| Reset DB (⚠️ wipes data) | `npm run reset` |

---

## 🔧 Phase 3-6 Manual Edits Required

The Phase 3-6 files are copied, but you still need to make a few edits to wire them up. See `PHASE3-6_INTEGRATION.md`:

1. Add fields to `backend/app/core/config.py`
2. Add models to `backend/app/db/models.py`
3. Patch `backend/app/services/financials.py` for Thai stock routing
4. Wire routers in `backend/app/main.py`
5. Add nav links in `frontend/components/Header.tsx`

These are 13 small edits, all documented in the integration guide.

If you skip these for now, **everything still works** — you just won't have:
- Stripe billing
- Email verification
- Comparison mode
- PDF export
- Thai stocks

The **core SaaS (auth, watchlist, dashboard, valuation, AI)** works without any Phase 3-6 edits.

---

## 🐛 Troubleshooting

### `npm error Missing script: "dev"`
You're not in the `frontend-nextjs/` folder. Run:
```bash
cd frontend-nextjs
pwd  # should show: .../frontend-nextjs
npm run dev
```

### `Docker is installed but not running`
Open Docker Desktop and wait until the whale icon stops animating.

### `Pre-flight failed: be-env-incomplete`
You haven't run `npm run setup` yet, or your `backend/.env` is missing required keys.
```bash
npm run setup
```

### `Port 8000 / 3000 already in use`
Another process is using these ports. Kill them:
```bash
npm run stop          # cleans up Luxe processes
# or manually:
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Backend crashes with `ModuleNotFoundError`
Python deps not installed. The orchestrator should auto-install on first run — but if it fails:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
npm run dev
```

### "Frontend says backend unreachable"
Check that `INTERNAL_API_KEY` matches in BOTH:
- `backend/.env`
- `frontend/.env.local`

If different, run `npm run setup` again to sync them.

---

**Made with 🎩 for Kiadtisak's Luxe Capital SaaS**
