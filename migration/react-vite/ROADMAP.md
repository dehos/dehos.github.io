# DEHOS migration roadmap

Last updated: 2026-10-25

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | In progress; Dashboard RPC, sales fields, item-brand join, stock transaction semantics, and legacy admin-auth boundary identified | Finish remaining page behavior and deployment workflow audit before any production cutover |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | Scaffold and dependency install/build verified; CI generates a package-lock artifact, but package-lock.json is not committed | Commit a reproducible dependency lockfile and verify clean install/build |
| 3 | Dashboard and authentication boundary | Dashboard first pass merged in PR #36. Auth gate is in PR #38; mocked tests and manual Codespaces instructions are in follow-up branches. CI test/build passed; real sign-in/admin and data parity are still unverified. Brand target settings not implemented | Controlled test of email and username login, admin denial, logout, read-only dashboard data and calculation parity; then add brand-target settings |
| 4 | Penjualan | Not started | Preserve sale entry, filtering, exports, and historical records |
| 5 | Stock and In Out | Not started | Preserve stock calculations, adjustments, history, and negative/PO behavior |
| 6 | Regression testing and deployment cutover | Not started; production unchanged | Test all key flows, review deployment, switch production only after explicit approval |

## Verified progress and next actions

- The legacy root app requires a Supabase session and checks app_admins before initializing the app. Username login uses the existing login-username Edge Function.
- src/AuthGate.jsx adds session restoration, email/password login, legacy username login, and an admin-table check before rendering the migrated Dashboard. The gate is defense-in-depth, not a replacement for database RLS. Password recovery/change flows are not ported yet.
- src/AuthGate.test.jsx adds mocked tests for missing configuration, signed-out state, authorized admin, empty admin list, and admin-check errors. The mocked CI tests pass but do not call the live Supabase project.
- migration/react-vite/README.md now includes an explicit Codespaces preview setup and a manual test checklist. It requires GitHub Codespaces access and the existing project's URL/public anon key; no credentials should be shared in chat.
- The Dashboard remains a first pass. Stock arithmetic and relation names are not validated against production results; do not treat totals as parity-approved.
- Next sequence: merge the test and instructions branches into the auth implementation branch after review; perform controlled manual login tests in an isolated Codespaces preview; then read-only data parity checks. Brand target settings follow after auth/data behavior is verified. Penjualan and Stock/In Out remain later stages.
- Do not recreate the scaffold or reimplement the already-merged Dashboard UI.

## Safety constraints

- Keep root production files and the current production deployment workflow untouched until cutover.
- No schema, data, RLS, auth settings, Edge Functions, or production query changes without explicit approval.
- Dashboard queries remain read-only; frontend configuration may use only Vite environment variables and the public/anon key, never a service-role key.
- Do not show sample metrics when Supabase is not configured.
- A successful build or mocked unit test does not prove real login, production authorization, or data calculation parity.
- Update this roadmap after each verified stage so completed work is not repeated.
