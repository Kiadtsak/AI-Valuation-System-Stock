# 🎩 Luxe Capital — Single-Command Dev Environment

The **monorepo controller** for Luxe Capital. Run everything with **one command**: `npm run dev`.

---

## 📁 Required Repository Structure

This controller expects your project to look like this:

```
luxe-capital/                       ← Place THIS package.json here (root)
├── package.json                     ← Controller (this repo)
├── scripts/                         ← Controller scripts (this repo)
│   ├── dev.js                       ← Main orchestrator
│   ├── preflight.js
│   ├── setup.js
│   └── ...
├── backend/                         ← Your Phase 1+2+3 backend
│   ├── docker-compose.yml
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── .env                         ← (gitignored) created by `npm run setup`
│   └── app/
│       ├── main.py
│       └── ...
└── frontend/                        ← Your Phase 2+3 frontend
    ├── package.json
    ├── .env.local                   ← (gitignored) created by `npm run setup`
    └── app/
        └── ...
```

**To set up:**
```bash
# Place your existing backend + frontend into one parent folder
mkdir luxe-capital
cd luxe-capital

# Unzip backend
unzip /path/to/luxe-phase2-backend.zip
mv backend-phase2 backend     # rename to "backend"

# Unzip frontend
unzip /path/to/luxe-phase2-frontend.zip
mv luxe-capital-frontend-v3 frontend   # rename to "frontend"

# Unzip controller (this) into the root
unzip /path/to/luxe-controller.zip
# Files merge into luxe-capital/

# Now your structure should match the layout above
```

---

## ⚡ One-Command Workflow

### First time
```bash
npm run setup     # generates secrets, creates .env files, prompts for FMP key
npm run dev       # starts everything
```

### Every other time
```bash
npm run dev       # → http://localhost:3000
```

That's it. Press `Ctrl+C` to stop everything cleanly.

---

## 🎬 What `npm run dev` Does

One command runs **5 steps in sequence** — exactly as you specified:

```
╭─────────────────────────────────────────╮
│         LUXE CAPITAL · Dev Mode         │
╰─────────────────────────────────────────╯

  01  ▸ Pre-flight checks
        ✓ All checks passed

  02  ▸ Starting infrastructure (Postgres + Redis)   ← via Docker Compose
        ✓ Postgres ready on :5432
        ✓ Redis ready on :6379

  03  ▸ Running database migrations                  ← Alembic, EVERY TIME
        ✓ Migrations up to date

  04  ▸ Starting backend + frontend (concurrently)   ← unified logs
        ✓ Backend ready on http://localhost:8000
        ✓ Frontend ready on http://localhost:3000

──────────────────  READY  ──────────────────

  ▸ Frontend  →  http://localhost:3000
  ▸ Backend   →  http://localhost:8000  (docs at /docs)
  ▸ Postgres  →  postgresql://luxe:luxepass@localhost:5432/luxe
  ▸ Redis     →  redis://localhost:6379

  Press Ctrl+C to stop everything.

[14:32:01] [backend ] INFO: Started server process [12345]
[14:32:01] [frontend] ✓ Ready in 1.2s
[14:32:02] [backend ] INFO: Application startup complete
[14:32:03] [frontend] ○ Compiling /...
[14:32:04] [backend ] INFO: 127.0.0.1:54321 - "GET /health HTTP/1.1" 200
```

**Key design decisions** (matching your answers):

| Your spec | Implementation |
|-----------|---------------|
| 🐘 Postgres + Redis ผ่าน `npm run dev` | Step 02 — `docker compose up -d postgres redis` + wait-for-port |
| 🗄️ Alembic อัตโนมัติทุกครั้ง | Step 03 — `alembic upgrade head` runs on every `npm run dev` |
| 📺 Logs รวมหน้าจอเดียว | Step 04 — `concurrently` library with `[backend]`/`[frontend]` prefixes |

---

## 📜 All Commands

| Command | What it does |
|---------|--------------|
| `npm run setup` | First-time setup: generates secrets, creates `.env` files |
| `npm run dev` | ⭐ **Start full stack** (infra + backend + frontend) |
| `npm run dev -- --no-infra` | Skip Docker (use if Postgres/Redis already running) |
| `npm run dev -- --skip-migrate` | Skip Alembic migrations |
| `npm run dev -- --no-frontend` | Backend only |
| `npm run dev:backend` | Run only the FastAPI backend |
| `npm run dev:frontend` | Run only the Next.js frontend |
| `npm run dev:infra` | Start only Postgres + Redis (Docker) |
| `npm run dev:migrate` | Run `alembic upgrade head` |
| `npm run dev:logs` | Run backend + frontend with raw logs (no orchestration) |
| `npm run preflight` | Run pre-flight checks only |
| `npm run logs` | Tail Docker logs (postgres + redis) |
| `npm run logs:db` | Tail Postgres logs only |
| `npm run logs:redis` | Tail Redis logs only |
| `npm run stop` | Stop Docker + kill leftover processes |
| `npm run reset` | Nuke everything (⚠️ wipes database) |
| `npm run reset -- --keep-data` | Restart without losing data |
| `npm run build` | Build frontend for production |
| `npm run test:backend` | Run pytest |

---

## 🚦 Pre-flight Checks

Before starting, the controller verifies:

| Check | What it does |
|-------|--------------|
| Node.js, npm, Python 3, Docker | All installed in PATH |
| Docker daemon running | Not just installed — actually started |
| `backend/` and `frontend/` directories exist | Project structure correct |
| `backend/.env` exists with required keys | `FMP_API_KEY`, `JWT_SECRET`, `INTERNAL_API_KEY` |
| `frontend/.env.local` exists | (warning only — uses defaults) |
| Python venv | (warning only — auto-creates if missing) |
| `frontend/node_modules` | (warning only — auto-installs) |

If any fail, you'll see clear error messages with fix suggestions.

---

## 🛠️ Troubleshooting

### "Docker not running"
Open Docker Desktop and wait for it to fully start.

### "Port 8000 already in use"
```bash
npm run stop          # cleans up
# or manually:
lsof -ti:8000 | xargs kill -9
```

### "Postgres won't connect"
```bash
npm run reset         # nuke DB volumes
npm run dev           # fresh start
```

### "Migrations failed"
```bash
# Check current state
cd backend
alembic current

# Manually upgrade
alembic upgrade head

# If schema is out of sync, regenerate
alembic revision --autogenerate -m "fix"
alembic upgrade head
```

### "Frontend says backend unreachable"
- Check `INTERNAL_API_KEY` matches in both `backend/.env` AND `frontend/.env.local`
- Check `BACKEND_URL=http://127.0.0.1:8000` in `frontend/.env.local`

### "FMP returns 403"
- Free tier has 250 requests/day — Redis cache should keep you under
- If you hit the limit, wait 24h or upgrade FMP plan

### "Want to see what's happening under the hood"
```bash
DEBUG=1 npm run dev      # verbose error traces
```

---

## 🏗️ Architecture

```
                    ┌─ npm run dev ─┐
                    │   (orchestrator)
                    └───────┬───────┘
                            ▼
       ┌────────────────────┴────────────────────┐
       ▼                    ▼                    ▼
  ┌─────────┐         ┌──────────┐         ┌──────────┐
  │ Docker  │  →      │ Backend  │   →     │ Frontend │
  │(via cmd)│         │ (FastAPI)│         │ (Next.js)│
  ├─────────┤         ├──────────┤         ├──────────┤
  │Postgres │ ◄───────│SQLAlchemy│         │ React    │
  │Redis    │ ◄───────│  Cache   │         │ Tailwind │
  └─────────┘         │  Auth    │ ◄───────│  BFF     │
                      └──────────┘         └──────────┘
                       :8000                  :3000
```

**Process supervision:**
- Backend + frontend run via [`concurrently`](https://www.npmjs.com/package/concurrently) — unified colored logs with timestamps
- Output looks like:
  ```
  [hh:mm:ss] [backend ] INFO: Application startup complete
  [hh:mm:ss] [frontend] ✓ Ready in 1.2s
  [hh:mm:ss] [backend ] INFO: 127.0.0.1:54321 - "GET /health HTTP/1.1" 200
  ```
- `Ctrl+C` triggers graceful SIGTERM → 3s grace period → SIGKILL fallback
- If any child crashes, the whole stack shuts down (`killOthersOn: ['failure', 'success']`)

---

## 🔐 Security Notes

- **Never commit `.env` files** (already in `.gitignore`)
- Secrets generated by `npm run setup` are unique per machine
- `INTERNAL_API_KEY` must match between backend `.env` and frontend `.env.local`
- For production, regenerate all secrets:
  ```bash
  cd backend && python scripts/generate_secrets.py
  ```

---

## 📦 What's Included in This Repo

```
luxe-capital-controller/
├── package.json               ← npm scripts
├── README.md                  ← this file
├── .gitignore
└── scripts/
    ├── _logger.js             ← branded console output
    ├── _wait.js               ← TCP/HTTP health-checks
    ├── dev.js                 ← ★ MAIN orchestrator
    ├── preflight.js           ← prerequisites check
    ├── setup.js               ← first-time wizard
    ├── stop.js                ← clean shutdown
    ├── reset.js               ← nuke and restart
    ├── run-backend.js         ← backend solo
    ├── run-frontend.js        ← frontend solo
    ├── run-infra.js           ← Docker solo
    └── run-migrate.js         ← Alembic helper
```

---

## ⏭️ Production Deployment

The controller is for **dev only**. For production:

- Backend → Railway / Render / Fly.io (uses `backend/Dockerfile`)
- Frontend → Vercel (uses `frontend/`)
- Postgres → Railway managed Postgres
- Redis → Railway managed Redis

See `INTEGRATION_GUIDE.md` from the Phase 3-6 bundle for full deployment instructions.

---

**Made with 🎩 for Kiadtisak's Luxe Capital SaaS**
