# 🎩 Luxe Capital — Complete Monorepo

This zip contains **everything ready to use** in a single `frontend-nextjs/` folder.

---

## ⚡ Easy Path — Use the Pre-Built Monorepo

If you don't mind wiping your old `frontend-nextjs/` folder, just use this one:

```bash
# 1. From your "AI Valuation Stock System" folder, BACKUP the old one
mv frontend-nextjs frontend-nextjs.OLD-BACKUP

# 2. Unzip this bundle
unzip luxe-monorepo.zip

# 3. Move the new frontend-nextjs into place
# (it's already at the right path inside the zip)

# 4. Run!
cd frontend-nextjs
npm install
npm run setup    # first time only
npm run dev      # ⭐ starts everything
```

---

## 🔄 Migration Path — Reorganize Your Existing Folders

If you want to keep your existing changes from the old folders:

```bash
# 1. Make sure you're in the parent directory
# (the one that contains: luxe-capital-v3, luxe-controller, phase3-6, frontend-nextjs)

# 2. Run the migration script
bash MIGRATE_FROM_OLD_STRUCTURE.sh

# 3. Run!
cd frontend-nextjs
npm install
npm run setup
npm run dev
```

The script will:
- Move `luxe-capital-v3/*` → `frontend-nextjs/frontend/`
- Move `luxe-controller/*` → `frontend-nextjs/` (root)
- Apply Phase 3-6 patches
- Archive old versions to `.archived-*` folders (you can delete later)

---

## 📁 Final Structure (after either path)

```
frontend-nextjs/
├── package.json              ← root scripts (npm run dev lives here!)
├── README.md                 ← controller documentation
├── QUICKSTART.md             ← quick reference (read this first!)
├── PHASE3-6_INTEGRATION.md   ← manual edits for billing/email/PDF/Thai
├── scripts/                   ← orchestration
│   ├── dev.js                 ← main orchestrator
│   ├── setup.js               ← first-time wizard
│   ├── preflight.js           ← prerequisites check
│   └── ...
├── backend/                   ← FastAPI (Phase 1+2+3+5+6 ready)
│   ├── app/                   ← all backend code
│   ├── docker-compose.yml     ← Postgres + Redis
│   ├── requirements.txt
│   ├── alembic/               ← migrations
│   └── ...
└── frontend/                  ← Next.js (Phase 2+3+4+5 ready)
    ├── app/                   ← all pages incl. compare, verify-email
    ├── components/
    ├── lib/                   ← incl. tickers.ts (Thai support)
    └── ...
```

---

## ⏭️ After First Run

Once you have it working, you can manually do the **Phase 3-6 integration edits** to enable:

- 💳 Stripe billing UI
- ✉️ Email verification flow
- ⚖️ Comparison mode (links in nav)
- 📄 PDF export from reports

See `PHASE3-6_INTEGRATION.md` inside `frontend-nextjs/` for the full step-by-step.

The core SaaS works **without** these edits — you'll have:
- ✅ Landing page
- ✅ Dashboard with full financials
- ✅ DCF Valuation calculator
- ✅ AI Analysis
- ✅ User auth (signup/login)
- ✅ Watchlist
- ✅ AI report history
- ✅ Account management

**Made with 🎩 for Kiadtisak's Luxe Capital SaaS**
