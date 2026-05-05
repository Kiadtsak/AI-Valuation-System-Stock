# Luxe Capital API — Phase 2: Database + Auth + Multi-User

Production-grade SaaS backend with **users, watchlists, AI history, and tier-based quotas**.

Builds on Phase 1's security hardening; adds everything needed to support real users.

---

## ⚡ Quick Start

```bash
# 1. Generate secrets
python scripts/generate_secrets.py

# 2. Configure
cp .env.example .env
# Edit .env: paste secrets, FMP_API_KEY, OPENAI_API_KEY

# 3. Run with Docker (PostgreSQL + Redis + API)
docker compose up -d

# 4. Verify
curl http://localhost:8000/health
```

Then:
```bash
# Sign up your first user
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YourPass123","full_name":"You"}'
```

---

## ✨ What's New in Phase 2

| Feature | Details |
|---------|---------|
| **PostgreSQL** | Async SQLAlchemy 2.0 + connection pooling |
| **Email signup/login** | bcrypt-hashed passwords + email verification ready |
| **Google OAuth** | Verifies Google ID tokens (frontend handles UI) |
| **JWT tokens** | Access (24h) + refresh (30d), proper rotation |
| **User tiers** | FREE / PRO / ENTERPRISE with daily quotas |
| **Watchlist API** | Add/remove/reorder tickers per user, tier-limited size |
| **AI report history** | Every generated report saved to user account |
| **Per-user quotas** | Daily request limits enforced per user, not just IP |
| **Alembic migrations** | Production-ready schema versioning |

---

## 🗂️ Database Schema

```
users
├── id (UUID)
├── email (unique)
├── hashed_password (nullable for OAuth users)
├── provider (email | google)
├── tier (free | pro | enterprise)
├── full_name, avatar_url
├── is_active, is_verified, is_admin
└── timestamps

watchlist_items
├── id (UUID)
├── user_id → users.id
├── symbol (e.g. "AAPL")
├── notes, target_price, intrinsic_value
├── position (for drag-and-drop ordering)
└── unique constraint (user_id, symbol)

ai_reports
├── id (UUID)
├── user_id → users.id
├── symbol, content (the markdown report)
├── source (openai | rule-based)
├── snapshot_price, snapshot_iv, snapshot_pe (at time of generation)
└── created_at

usage_logs
├── id (auto)
├── user_id → users.id
├── endpoint (e.g. "ai_analysis")
├── cost_units (1 for cheap, 10 for AI)
└── created_at (indexed for daily counting)
```

---

## 📡 New API Endpoints

### Auth (`/api/auth`)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/signup` | None | Create account |
| POST | `/login` | None | Email + password login |
| POST | `/google` | None | Google OAuth login |
| POST | `/refresh` | None | Exchange refresh → new access token |
| GET | `/me` | Bearer | Current user profile |
| PATCH | `/me` | Bearer | Update profile (name, avatar) |
| GET | `/me/limits` | Bearer | Today's quota usage |
| POST | `/logout` | None | Stateless — frontend discards tokens |

### Watchlist (`/api/watchlist`)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/` | Bearer | List my watchlist |
| POST | `/` | Bearer | Add ticker |
| PATCH | `/{id}` | Bearer | Update notes/target |
| DELETE | `/{id}` | Bearer | Remove |
| POST | `/reorder` | Bearer | Drag-and-drop reorder |

### Reports (`/api/reports`)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/` | Bearer | My AI report history |
| GET | `/{id}` | Bearer | Full report content |
| DELETE | `/{id}` | Bearer | Delete from history |

### Updated existing endpoints
| Endpoint | Change |
|----------|--------|
| `GET /api/financials` | Now requires Bearer auth, counts toward daily quota |
| `POST /api/ai-analysis` | Same + auto-saves to `ai_reports` table |
| `GET /health` | Now also checks DB connectivity |

---

## 💎 Tier System

| Tier | Daily Requests | Watchlist Size | AI Reports/day |
|------|----------------|----------------|----------------|
| FREE | 50 units | 10 tickers | 5 (50 ÷ 10) |
| PRO | 1,000 units | 50 tickers | 100 |
| ENTERPRISE | 100,000 units | 500 tickers | unlimited |

**Cost units per endpoint:**
- Financials/Valuation: 1 unit
- AI Analysis: 10 units (because LLM is expensive)
- Watchlist CRUD: 0 units (free)

When a user hits their quota → 429 with upgrade prompt.

---

## 🔐 Auth Flow

### Email signup
```bash
POST /api/auth/signup
{ "email": "you@example.com", "password": "Pass123!", "full_name": "You" }

→ { "access_token": "eyJ...", "refresh_token": "eyJ...", "token_type": "bearer" }
```

### Email login
```bash
POST /api/auth/login
{ "email": "you@example.com", "password": "Pass123!" }

→ { "access_token": "...", "refresh_token": "..." }
```

### Google OAuth
Frontend gets a Google ID token (using Google Sign-In JS), then:
```bash
POST /api/auth/google
{ "id_token": "<google_id_token>" }

→ { "access_token": "...", "refresh_token": "..." }
```

### Authenticated requests
```bash
GET /api/auth/me
Authorization: Bearer <access_token>

→ { "id": "...", "email": "...", "tier": "free", ... }
```

### Token refresh
When access token expires (24h):
```bash
POST /api/auth/refresh
{ "refresh_token": "..." }

→ { "access_token": "<new>", "refresh_token": "<new>" }
```

---

## 🚀 Running

### Docker Compose (recommended)

```bash
docker compose up -d
```

Starts: API + PostgreSQL + Redis on `localhost:8000`.

For DB inspection: `docker compose --profile debug up -d` adds **pgAdmin** at `localhost:5050`.

### Local dev

```bash
# 1. Postgres + Redis
brew install postgresql@16 redis
brew services start postgresql@16 redis
createdb luxe

# 2. Python env
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Configure
cp .env.example .env
python scripts/generate_secrets.py     # paste output to .env
# Update DATABASE_URL=postgresql://USER:PASS@localhost:5432/luxe

# 4. Run migrations (or auto-create in dev mode)
alembic upgrade head

# 5. Start API
uvicorn app.main:app --reload --port 8000
```

In dev mode, tables auto-create on startup. In prod, use Alembic.

---

## 📝 Database Migrations

When you change `app/db/models.py`:

```bash
# Generate migration
alembic revision --autogenerate -m "add some_field to users"

# Review the generated file in alembic/versions/

# Apply
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

---

## 🧪 Testing

```bash
pytest tests/ -v
```

Tests cover:
- Health check (incl. DB)
- Signup → login → me flow
- Duplicate email rejection
- Wrong password rejection
- Watchlist CRUD
- Auth requirement on protected endpoints
- Symbol validation

---

## 🚢 Deploying to Railway

```bash
railway login
railway init
railway add postgresql
railway add redis

# Set env vars
railway variables set ENV=production
railway variables set FMP_API_KEY=xxx
railway variables set JWT_SECRET=xxx
railway variables set INTERNAL_API_KEY=xxx
# DATABASE_URL and REDIS_URL are auto-set by Railway add commands

railway up
```

After deploy, run migrations:
```bash
railway run alembic upgrade head
```

---

## ⏭️ Phase 3 Preview

Phase 2 gives you a multi-user SaaS backend. Phase 3 will add:
- **Stripe billing** scaffolding (Pro tier $19/mo)
- **Webhook handlers** for subscription events
- **Email service** (Resend) for verification + receipts
- **Admin panel** endpoints (user management)
- **Token blocklist** for true logout (Redis)

Phase 4 will add:
- **Frontend auth UI** — login/signup pages, user menu, watchlist sidebar
- **Comparison mode** — multi-ticker analysis
- **PDF export** — research memo download
- **SET (Thai stocks)** integration

---

**Phase 2 — Made with 🎩 for Kiadtisak's Luxe Capital SaaS**
