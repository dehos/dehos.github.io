# DEHOS migration roadmap

Last updated: 2026-10-25

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | In progress; Dashboard RPC, sales fields, item-brand join, stock transaction semantics, and the legacy admin-auth boundary identified | Finish remaining page behavior and deployment workflow audit; document and implement equivalent auth gate before connecting or publishing the migrated UI |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | Scaffold and dependency install/build verified; CI generated a package-lock.json artifact, but the lockfile is not committed | Commit the generated lockfile and verify a clean reproducible build |
| 3 | Dashboard and authentication | Dashboard first pass merged in PR #36. Identity-specific admin check added in PR #41; user has directed that the authentication checkpoint be treated as passed for roadmap progression, but live test evidence is not independently available. Brand target settings implemented in this branch using browser-local storage; no database changes | Review and test brand target editing/progress display; keep live auth and data-parity verification marked as user-assumed until independently checked |
| 4 | Penjualan | Implemented in `migration/sales-page`; pending CI and preview verification. Adds sale entry through existing `catat_penjualan_atomic`, month/brand/name filters, historical table, CSV export, and stock/pre-order result messaging. Does not yet port edit/delete or Excel/PDF exports. | Confirm CI/build and review preview; verify RPC response and read policies in an authorized live session before treating data parity as verified |
| 5 | Stock and In Out | Not started | Preserve stock calculations, adjustments, history, and negative/PO behavior |
| 6 | Regression testing and deployment cutover | Not started | Test all key flows, review deployment, switch production only after approval |

## Audit findings and next actions

- The legacy root app checks a Supabase session and verifies admin access through app_admins before initializing the application. Username login also uses the login-username Edge Function.
- `src/AuthGate.jsx` adds legacy email/password and `login-username` sign-in paths, restores the session, and filters `app_admins` by the current session user's email before rendering the Dashboard. Missing email or failed/empty verification denies access. This is a client-side defense-in-depth check, not a replacement for Supabase RLS. Password recovery/change flows are not yet ported. User has accepted the auth checkpoint for progression; independent live authorization evidence remains unavailable.
- The Dashboard is currently a visual/data-query first pass only. Its stock arithmetic and relation names have not been validated against real production results; do not treat the displayed totals as parity-approved.
- Brand target settings now allow editing a monthly revenue target for each known brand. Values are stored in this browser's localStorage and update the Dashboard progress display immediately; they do not sync between devices and do not modify Supabase. Brands with no sales still appear with zero progress.
- The Sales page is implemented on isolated branch `migration/sales-page`. It uses the legacy `catat_penjualan_atomic` RPC for writes, not direct inserts, to preserve stock and pre-order logic. It reads existing `penjualan` and `barang` data, supports month/brand/name filters and CSV export, and validates quantity and numeric price before enabling save. Edit/delete and Excel/PDF export are not yet ported. CI and live behavior remain to be verified.
- Continue to keep the generated `package-lock.json`/clean-install check and deployment audit on the roadmap. Dashboard query/calculation parity and live auth still need independent verification.
- Do not recreate the scaffold or reimplement the already-merged Dashboard UI.

## Safety constraints

- Keep root production files and the current production deployment workflow untouched until cutover.
- No schema, data, RLS, auth, or production query changes without explicit approval.
- Dashboard queries must remain read-only; browser configuration may use only Vite environment variables and the public/anon key, never a service-role key.
- Do not show sample metrics when Supabase is not configured; clearly display connection/setup status.
- A successful build does not prove that production queries, authorization, or calculations match.
- Keep this roadmap updated after each completed step so completed work is not repeated.
