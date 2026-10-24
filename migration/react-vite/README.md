# DEHOS React migration scaffold

This directory is an isolated foundation for the gradual migration of `dehos.github.io`.

## Stack
- React + Vite
- Radix UI primitives
- Tailwind CSS v4 through `@tailwindcss/vite`
- Supabase JavaScript client (environment variables only)
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

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` only when ready to test against the existing Supabase project. Never use a service-role key in browser code.

## Safety boundary
The existing production files at repository root are intentionally untouched. This scaffold does not read or mutate production data, does not change Supabase schema/RLS/auth, and is not wired to production deployment. Do not remove Bootstrap or switch the production entry point until page-by-page parity tests pass.

## Roadmap status
1. Repository audit: in progress / baseline confirmed.
2. Isolated React + Vite foundation: scaffold added; dependency install and build verification still required.
3. Dashboard migration: not started.
4. Sales migration: not started.
5. Stock and In/Out migration: not started.
6. Regression tests and production deployment switch: not started.
