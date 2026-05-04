/**
 * SERVER-SIDE proxy to FastAPI backend.
 *
 * This route is the *only* place where INTERNAL_API_KEY exists.
 * Browsers call /api/financials → Next.js server → FastAPI (with key)
 *
 * Replace the rewrite rule in next.config.js with this API route.
 *
 * File location: app/api/financials/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const refresh = req.nextUrl.searchParams.get('refresh');

  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol required' },
      { status: 400 }
    );
  }

  if (!INTERNAL_KEY) {
    return NextResponse.json(
      { error: 'INTERNAL_API_KEY not configured on server' },
      { status: 500 }
    );
  }

  const url = new URL('/api/financials', BACKEND_URL);
  url.searchParams.set('symbol', symbol);
  if (refresh) url.searchParams.set('refresh', refresh);

  try {
    const r = await fetch(url.toString(), {
      headers: {
        'X-Internal-Key': INTERNAL_KEY,
        'X-Request-ID': req.headers.get('X-Request-ID') || crypto.randomUUID(),
      },
      // Don't cache here — FastAPI handles caching
      cache: 'no-store',
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return NextResponse.json(
        { error: `Backend error ${r.status}`, detail: text },
        { status: r.status }
      );
    }

    const data = await r.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Backend unreachable', detail: e.message },
      { status: 502 }
    );
  }
}
