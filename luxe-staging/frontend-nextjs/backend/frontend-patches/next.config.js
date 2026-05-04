/**
 * Updated next.config.js — REMOVE the /api/* rewrite rule.
 *
 * Why: We want the browser to call Next.js (which holds the secret key),
 * NOT directly to FastAPI. The rewrite would expose the FastAPI URL.
 *
 * Replace the contents of your existing next.config.js with this.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // No rewrites — API calls go through Next.js route handlers
  // (see app/api/financials/route.ts)
};

module.exports = nextConfig;
