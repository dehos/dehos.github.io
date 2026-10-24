# DEHOS migration roadmap

Last updated: 2026-10-25

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | In progress; Dashboard RPC, sales fields, item-brand join, stock transaction semantics, and the legacy admin-auth boundary identified | Finish remaining page behavior and deployment workflow audit; document and implement equivalent auth gate before connecting or publishing the migrated UI |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | Scaffold and dependency install/build verified; CI generated a package-lock.json artifact, but the lockfile is not committed | Commit the generated lockfile and verify a clean reproducible build |
| 3 | Dashboard | First React Dashboard pass merged in PR #36; CI build passed (run #12). Live Supabase integration, data parity, and auth parity remain unverified; brand target settings not implemented | Verify authenticated read-only data, stock totals/date semantics, graph, brand performance, recent sales, negative/low stock; add brand-target settings |
| 4 | Penjualan | Not started | Preserve sale entry, filtering, exports, and historical records |
| 5 | Stock and In Out | Not started | Preserve stock calculations, adjustments, history, and negative/PO behavior |
| 6 | Regression testing and deployment cutover | Not started | Test all key flows, review deployment, switch production only after approval |

## Audit findings and next actions

- The legacy root app checks a Supabase session and verifies admin access through app_admins before initializing the application. Username login also uses the login-username Edge Function.
- The isolated React Dashboard currently has no sign-in or admin authorization gate. Do not connect it to real production data for general use, publish it, or cut over until the existing access boundary has been understood and safely reproduced. A public/anon key is not a substitute for authorization; database RLS remains essential.
- The Dashboard is currently a visual/data-query first pass only. Its stock arithmetic and relation names have not been validated against real production results; do not treat the displayed totals as parity-approved.
- Next sequence: commit the generated package-lock.json, complete auth/deployment audit, implement a safe auth gate in the isolated app, then test read-only queries and calculations against the existing project. Only after that, implement brand-target settings and proceed to Penjualan.
- Do not recreate the scaffold or reimplement the already-merged Dashboard UI.

## Safety constraints

- Keep root production files and the current production deployment workflow untouched until cutover.
- No schema, data, RLS, auth, or production query changes without explicit approval.
- Dashboard queries must remain read-only; browser configuration may use only Vite environment variables and the public/anon key, never a service-role key.
- Do not show sample metrics when Supabase is not configured; clearly display connection/setup status.
- A successful build does not prove that production queries, authorization, or calculations match.
- Keep this roadmap updated after each completed step so completed work is not repeated.
