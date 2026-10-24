# DEHOS React migration scaffold

This directory is an isolated foundation for the gradual migration of `dehos.github.io`.

## Stack
- React + Vite
- Radix UI primitives
- Tailwind CSS v4 through `@tailwindcss/vite`
- Supabase JavaScript client using Vite environment variables
- Lucide React
- No Bootstrap dependency in this scaffold

## Run locally
From this directory:

```sh
npm install
cp .env.example .env.local
npm run dev
npm run build
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` only when ready to test against the existing Supabase project. Use only the public/anon key in browser code. Never use a service-role key.

## Dashboard first pass
The isolated React Dashboard now has:
- Summary cards for item count, stock total, and today's revenue.
- A sharp-line sales chart with 7/30-day period selection.
- Brand revenue performance for the current month.
- Latest sales, negative stock, and low-stock lists.
- Explicit setup/error states; no fake numbers when the Supabase environment is missing.

The Dashboard makes read-only calls to the existing `get_dashboard_summary` RPC and the existing `penjualan`, `barang`, and `transaksi` tables. It does not write data or change schema/RLS/auth. Verify the existing stock/date semantics and field permissions in CI/review before considering this page feature-complete. Brand-target settings are not implemented yet.

## Safety boundary
The existing production files at repository root are intentionally untouched. This scaffold is not wired to production deployment. Do not remove Bootstrap or switch the production entry point until page-by-page parity tests pass.

## Roadmap
See [ROADMAP.md](./ROADMAP.md) for the current verified state and remaining work.
