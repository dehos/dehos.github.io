# DEHOS migration roadmap

Last updated: 2026-10-25

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | In progress; Dashboard RPC, sales fields, item-brand join, stock transaction semantics, and the legacy admin-auth boundary identified | Finish remaining page behavior and deployment workflow audit; document and implement equivalent auth gate before connecting or publishing the migrated UI |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | Scaffold and dependency install/build verified; CI generated a package-lock.json artifact, but the lockfile is not committed | Commit the generated lockfile and verify a clean reproducible build |
| 3 | Dashboard and authentication | Dashboard first pass merged in PR #36. Identity-specific admin check added in PR #41; user has directed that the authentication checkpoint be treated as passed for roadmap progression, but live test evidence is not independently available. Brand target settings implemented in this branch using browser-local storage; no database changes | Review and test brand target editing/progress display; keep live auth and data-parity verification marked as user-assumed until independently checked |
| 4 | Penjualan | Merged in PR #43; React migration build check passed. Adds sale entry through existing `catat_penjualan_atomic`, month/brand/name filters, historical table, CSV export, and stock/pre-order result messaging. Edit/delete and Excel/PDF exports are not yet ported. | Verify RPC response and read policies in an authorized live session before treating data parity as verified |
| 5 | Stock and In Out | Merged in PR #44; React migration build check passed. Adds dated stock balance, search, in/out/adjust form through existing `catat_transaksi_stok_atomic`, negative-stock/PO visibility, and month-filtered transaction history. No schema or root production changes. | Verify authorized live read/write behavior and balance parity before parity approval |
| 6 | Regression testing and deployment cutover | PR #45 merged; five stock-balance regression tests and React migration build passed in CI. Full app/auth/RPC live regression and deployment cutover remain not started | Expand regression coverage; verify authorized live data behavior; review deployment, switch production only after approval |

## Audit findings and next actions

- The legacy root app checks a Supabase session and verifies admin access through app_admins before initializing the application. Username login also uses the login-username Edge Function.
- `src/AuthGate.jsx` adds legacy email/password and `login-username` sign-in paths, restores the session, and filters `app_admins` by the current session user's email before rendering the Dashboard. Missing email or failed/empty verification denies access. This is a client-side defense-in-depth check, not a replacement for Supabase RLS. Password recovery/change flows are not yet ported. User has accepted the auth checkpoint for progression; independent live authorization evidence remains unavailable.
- The Dashboard is currently a visual/data-query first pass only. Its stock arithmetic and relation names have not been validated against real production results; do not treat the displayed totals as parity-approved.
- Brand target settings now allow editing a monthly revenue target for each known brand. Values are stored in this browser's localStorage and update the Dashboard progress display immediately; they do not sync between devices and do not modify Supabase. Brands with no sales still appear with zero progress.
- The Sales page is merged in PR #43 into `migration/auth-identity-check`; the associated React migration CI run completed successfully. It uses the legacy `catat_penjualan_atomic` RPC for writes, reads existing `penjualan` and `barang` data, and supports month/brand/name filters and CSV export. Edit/delete and Excel/PDF export are not yet ported. Live Supabase behavior remains unverified.
- Stock and In Out merged in PR #44. The React migration build check passed on the final reviewed head. It reads `barang` and `transaksi`, calculates dated balances using the existing `masuk`/`laku`/`adjust_masuk`/`adjust_keluar` movement rules, and writes through `catat_transaksi_stok_atomic`. The UI offers one `adjust` action (the database maps it to the existing internal adjustment movement types), refuses manual stock-out beyond available stock, and directs sales/pre-order flows to Penjualan. No SQL migration or direct table write was added. Live data behavior and balance parity remain unverified.
- PR #45 merged: stock balance arithmetic is extracted into `src/lib/stock-balance.js`; five deterministic Node built-in tests cover initial-stock dates, incoming/sales/legacy adjustments, item/date filtering, negative balances, and invalid quantities. Migration CI runs tests before the build; both passed on the PR head. During review, fixed double-escaped ISO date/month validation patterns in `App.jsx`. These tests do not prove Supabase read/write policies or live data parity.
- CI security hardening merged in PR #46: the migration workflow grants only `contents: read` and disables persisted checkout credentials. CI run #32 passed: dependency install, five stock regression tests, production bundle build, and lockfile artifact upload.
- Next CI hardening adds `npm audit --audit-level=high` after dependency installation and before tests/build; its first PR run must pass before merge. This checks known dependency advisories but does not pin versions.
- The generated `package-lock.json` artifact is still not committed, and a clean `npm ci` run against a committed lockfile remains outstanding. Dashboard query/calculation parity and live auth still need independent verification.
- Do not recreate the scaffold or reimplement the already-merged Dashboard UI.
- PR #43 merged successfully; its build check completed successfully. This proves compilation only, not live Supabase parity.

## Safety constraints

- Keep root production files and the current production deployment workflow untouched until cutover.
- No schema, data, RLS, auth, or production query changes without explicit approval.
- Dashboard queries must remain read-only; browser configuration may use only Vite environment variables and the public/anon key, never a service-role key.
- Do not show sample metrics when Supabase is not configured; clearly display connection/setup status.
- A successful build does not prove that production queries, authorization, or calculations match.
- Keep this roadmap updated after each completed step so completed work is not repeated.
