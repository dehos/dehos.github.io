# DEHOS React migration scaffold

This directory is an isolated foundation for the gradual migration of dehos.github.io.

## Stack
- React + Vite
- Radix UI primitives
- Tailwind CSS v4 through @tailwindcss/vite
- Supabase JavaScript client using Vite environment variables
- Lucide React
- No Bootstrap dependency in this scaffold

## Manual test on GitHub Codespaces (no production deployment)

Use this when you want to open the React migration in a browser without changing the live DEHOS site.

1. Open the repository: https://github.com/dehos/dehos.github.io
2. Select the branch `migration/auth-manual-test-guide` (or the latest auth-test branch) from the branch selector.
3. Open **Code → Codespaces → Create codespace on this branch**. This requires GitHub Codespaces access; if that option is unavailable, do not change the production workflow.
4. In the Codespaces terminal run:

   ```sh
   cd migration/react-vite
   npm install
   cp .env.example .env.local
   ```

5. Edit `.env.local` using the editor file tree. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the existing project's URL and public/anon key. Do not use or paste a service-role/secret key. Do not commit `.env.local`.
6. Start the isolated app:

   ```sh
   npm run dev -- --host 0.0.0.0
   ```

7. In the **Ports** tab, open port `5173` in the browser. Keep the port private; only make it accessible to yourself. This is a development preview, not the live site.

If you cannot access Codespaces, stop here and tell me; do not try to deploy the migration to production as a workaround.

## Manual login test checklist

Test only with an account you are authorized to use. Do not send me passwords, access tokens, or secret keys.

1. **Signed out:** open the preview in a private/incognito tab. The login form should appear and the Dashboard should not appear before authentication.
2. **Valid admin email:** sign in with an existing authorized admin email/password. Expected: the page shows “Admin terverifikasi” and the Dashboard appears.
3. **Valid admin username:** sign out, then sign in with the existing username/password flow. Expected: same result as email login. If it fails, record only the visible error text; do not share credentials.
4. **Non-admin account:** only if you already have a permitted test account known not to be an admin, try it. Expected: access is denied and the Dashboard remains hidden. Do not create or change database users just for this test.
5. **Logout:** click “Keluar”. Expected: the login form returns and the Dashboard is hidden.
6. **Data parity (read-only):** if an authorized admin reaches the Dashboard, compare the same date range and totals against the old app. Do not create, edit, or delete sales/stock records during this test.

Report each step as Pass / Fail / Not tested, plus the visible error message if any. Never send credentials or tokens.

## Automated tests and build

```sh
npm test
npm run build
```

Mocked unit tests in `src/AuthGate.test.jsx` cover missing Supabase configuration, no session, successful admin verification, an empty admin list, and an admin-query error. These tests do not connect to the live Supabase project and cannot prove real credentials, Edge Function behavior, RLS, or data parity.

## Dashboard first pass

The isolated React Dashboard currently includes:
- Summary cards for item count, stock total, and today's revenue.
- A sharp-line sales chart with 7/30-day period selection.
- Brand revenue performance for the current month.
- Latest sales, negative stock, and low-stock lists.
- Explicit setup/error states; no fake numbers when the Supabase environment is missing.

The Dashboard makes read-only calls to the existing `get_dashboard_summary` RPC and the existing `penjualan`, `barang`, and `transaksi` tables. It does not write data or change schema/RLS/auth. Its data calculations and relation names are not yet verified against live results.

## Authentication and security notes

The legacy root application requires a Supabase session and checks admin access via `app_admins`; username sign-in uses the `login-username` Edge Function. The React Dashboard is wrapped by `src/AuthGate.jsx`. It restores the session, supports email/password login and the legacy username function, then checks `app_admins` before rendering the Dashboard. Failed or unverifiable admin checks deny access and attempt to sign out.

The shared Supabase client is reused to avoid multiple auth clients sharing browser storage. This client-side gate is not a replacement for Supabase RLS; database policies must continue to enforce access. Password recovery/change flows from the legacy app are not included yet. A public/anon key alone does not provide access control.

## Safety boundary

The existing production files at repository root are intentionally untouched. This scaffold is not wired to production deployment. Do not remove Bootstrap or switch the production entry point until auth, page parity, and regression tests pass.

## Roadmap

See `ROADMAP.md` for the current verified state and remaining work.
