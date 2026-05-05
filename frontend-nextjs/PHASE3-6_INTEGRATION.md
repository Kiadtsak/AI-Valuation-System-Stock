# Integration Guide — Phase 3-6

After running `./integrate.sh`, you need to make these manual edits to wire everything up.

---

## Step 1: Backend — `app/core/config.py`

Add these fields inside your `Settings(BaseSettings)` class (anywhere is fine):

```python
    # ─── Stripe (Phase 3) ──────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_ID_PRO: str = ""

    # ─── Email — Resend.com (Phase 3) ──────────────────
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Luxe Capital <noreply@luxe.local>"

    # ─── App URL (used in emails) ──────────────────────
    APP_URL: str = "http://localhost:3000"

    # ─── SET / Thai stocks (Phase 5) ────────────────────
    SETSMART_API_KEY: str = ""
    SETSMART_BASE_URL: str = "https://api.setsmart.io/v1"

    # ─── Sentry (Phase 6) ───────────────────────────────
    SENTRY_DSN: str = ""
```

---

## Step 2: Backend — `app/db/models.py`

### A) Add field to existing `User` class

```python
class User(Base):
    # ... existing fields ...

    # ★ NEW (Phase 3)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, nullable=True, index=True
    )

    # ★ NEW relationship
    subscription: Mapped[Optional["Subscription"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
```

### B) Append new model classes

Copy the contents of `backend/models/phase3_models.py` (the `Subscription`, `EmailLog`, `VerificationToken` classes) to the bottom of your `app/db/models.py`.

Don't forget to add this import at the top if not present:
```python
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer
```

And inside `Subscription`, add the back-reference:
```python
class Subscription(Base):
    # ... existing code ...
    user: Mapped["User"] = relationship(back_populates="subscription")
```

---

## Step 3: Backend — Patch `app/services/financials.py`

At the **very top** of `fetch_financials()`, add Thai routing:

```python
from app.services.thai_stocks import is_thai_symbol, fetch_thai_financials


async def fetch_financials(symbol: str, refresh: bool = False) -> dict:
    # ★ NEW (Phase 5): Route Thai symbols to dedicated provider
    if is_thai_symbol(symbol):
        return await fetch_thai_financials(symbol)

    # ... existing FMP-based code unchanged below ...
```

---

## Step 4: Backend — Update `app/main.py`

Add imports:
```python
from app.api.billing_routes import router as billing_router, auth_router as ext_auth_router
from app.api.phase4_routes import router as phase4_router
from app.core.observability import init_sentry
```

In your `lifespan` function (or before app startup):
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    init_sentry()  # ★ NEW
    # ... rest unchanged
```

Register routers (after existing `app.include_router` calls):
```python
app.include_router(billing_router)
app.include_router(ext_auth_router)
app.include_router(phase4_router)
```

---

## Step 5: Backend — `requirements.txt`

Append from `backend/requirements_additions.txt`:
```
stripe==11.4.0
reportlab==4.2.5
sentry-sdk[fastapi]==2.20.0
```

Then:
```bash
pip install -r requirements.txt
```

---

## Step 6: Backend — `.env`

Append from `backend/.env.additions` and fill in real values:
```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxx
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Luxe Capital <noreply@yourdomain.com>
APP_URL=http://localhost:3000
SETSMART_API_KEY=
SENTRY_DSN=
```

---

## Step 7: Backend — Run Alembic migration

```bash
alembic revision --autogenerate -m "phase3_billing_email"
# Inspect the generated file in alembic/versions/
alembic upgrade head
```

---

## Step 8: Frontend — Update `components/Header.tsx`

Add Compare to the nav array:
```typescript
const NAV = [
  { href: '/',            label: 'Home',       matches: ['/'] },
  { href: '/dashboard',   label: 'Dashboard',  matches: ['/dashboard'] },
  { href: '/valuation',   label: 'Valuation',  matches: ['/valuation'] },
  { href: '/compare',     label: 'Compare',    matches: ['/compare'] },     // ★ NEW
  { href: '/ai-analysis', label: 'AI Insight', matches: ['/ai-analysis'] },
];
```

---

## Step 9: Frontend — Update `components/auth/UserMenu.tsx`

Import the credit card icon:
```typescript
import { CreditCard } from 'lucide-react';
```

Add a billing menu item (in the menu items section):
```tsx
<MenuItem
  href="/account/billing"
  icon={CreditCard}
  label="Billing"
  onClose={() => setOpen(false)}
/>
```

---

## Step 10: Frontend — Update `app/account/layout.tsx`

Add billing to the account nav:
```typescript
import { CreditCard } from 'lucide-react';

const ACCOUNT_NAV = [
  { href: '/account',           label: 'Overview',     icon: UserIcon },
  { href: '/account/watchlist', label: 'Watchlist',    icon: BookmarkCheck },
  { href: '/account/reports',   label: 'AI Reports',   icon: BarChart3 },
  { href: '/account/billing',   label: 'Billing',      icon: CreditCard },   // ★ NEW
  { href: '/account/settings',  label: 'Settings',     icon: Settings },
  { href: '/account/upgrade',   label: 'Upgrade',      icon: Crown, accent: true },
];
```

---

## Step 11: Frontend — Wire SearchBar to Thai tickers (optional)

In `components/SearchBar.tsx`, replace the `POPULAR_TICKERS` constant with import from `lib/tickers.ts`:

```typescript
// Remove this:
// const POPULAR_TICKERS = ['AAPL', 'MSFT', 'GOOGL', ...];

// Add this:
import { ALL_TICKERS, searchTickers } from '@/lib/tickers';

// Use searchTickers(input) for filtered results
// or ALL_TICKERS for the popular list
```

---

## Step 12: Frontend — Add Export button to AI report viewer

In `app/account/reports/page.tsx`, in the modal viewer header section:

```tsx
import { ExportReportButton } from '@/components/ExportReportButton';

// Inside the modal header, alongside the Close button:
<ExportReportButton reportId={selected.id} symbol={selected.symbol} />
<button onClick={() => setSelected(null)} className="px-3 py-1 rounded-full glass text-xs">
  Close
</button>
```

---

## Step 13: Verify it all works

```bash
# Backend
cd /your/backend-phase2
docker compose up -d
curl http://localhost:8000/health
# Should show all services configured

# Frontend
cd /your/frontend-v3
npm run dev
```

Open http://localhost:3000 → sign up → test the flow:
- ✅ Welcome email logged (or sent if RESEND configured)
- ✅ /compare works with 2-4 tickers
- ✅ Export PDF downloads
- ✅ /account/billing shows plan
- ✅ Search "PTT" → Thai ticker
- ✅ /forgot-password → email flow

---

## 🐛 Troubleshooting

### "Module 'app.billing' not found"
You forgot to create `app/billing/__init__.py`. The `integrate.sh` script does this — re-run it.

### "Stripe webhook signature invalid"
- Make sure `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- For local dev: use `stripe listen --forward-to localhost:8000/api/billing/webhook`
- The CLI gives you a temp `whsec_...` to use

### "Resend 403 / domain not verified"
- Resend requires domain verification before sending
- For testing, use Resend's test domain or stub mode (leave RESEND_API_KEY blank)

### "Compare returns 404"
- User must be authenticated (Bearer token)
- Check that frontend is sending Authorization header

### "PDF export shows blank"
- ReportLab needs Pillow for image support: `pip install pillow`
- Check that the AI report has actual content (not empty string)

### "Thai ticker returns 'No data'"
- Yahoo's `.BK` endpoint sometimes rate-limits. Try again in a minute.
- Check the cache key — `await cache_delete('thai:financials:*')` to force refresh

---

**Done! You now have a complete production SaaS.** 🎩
