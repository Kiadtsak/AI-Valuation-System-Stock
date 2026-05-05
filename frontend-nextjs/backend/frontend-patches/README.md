# Frontend Integration Patches

These files patch your existing Next.js frontend to work with the secured backend.

## What changes

**Before (insecure):**
```
Browser → Next.js (rewrite proxy) → FastAPI [open to anyone]
```

**After (secure):**
```
Browser → Next.js Route Handler [holds secret key] → FastAPI [requires key]
```

## How to apply

### 1. Install files
```bash
cd /your/luxe-capital-v3       # your Next.js project

# Replace next.config.js
cp /path/to/backend-v2/frontend-patches/next.config.js ./next.config.js

# Add new API route handler
mkdir -p app/api/financials
cp /path/to/backend-v2/frontend-patches/route-financials.ts \
   app/api/financials/route.ts
```

### 2. Update .env.local
```bash
cp /path/to/backend-v2/frontend-patches/.env.local.example .env.local
# Edit .env.local — paste the SAME INTERNAL_API_KEY as your backend's .env
```

### 3. Verify

Start FastAPI:
```bash
cd backend-v2
docker compose up -d
```

Start Next.js:
```bash
cd frontend
npm run dev
```

Open http://localhost:3000 → search a ticker → should work.

If you see `Backend unreachable`, check:
- FastAPI is running on port 8000
- `BACKEND_URL` in frontend `.env.local` points to it
- `INTERNAL_API_KEY` is **identical** in both `.env` files

## What you DON'T need to change

- `lib/api.ts` — unchanged. It still calls `/api/financials?symbol=XXX`
- All your React components — unchanged
- Theme, design, demo data fallback — unchanged

The patch only swaps how the request reaches FastAPI.
