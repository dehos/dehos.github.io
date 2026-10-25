# DEHOS migration roadmap

Last updated: 2026-10-25

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | In progress; Dashboard RPC, sales fields, item-brand join, stock transaction semantics, and legacy admin-auth boundary identified | Finish remaining page behavior and deployment workflow audit before any production cutover |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | Scaffold and dependency install/build verified; CI has generated a lockfile artifact, but package-lock.json is not yet committed | Commit a reproducible dependency lockfile and verify clean install/build |
| 3 | Dashboard and authentication boundary | Dashboard first pass merged in PR #36. Auth gate implemented in PR #38 branch; isolated unit tests added in follow-up branch, pending CI. Live sign-in/admin and data parity remain unverified; brand target settings not implemented | CI tests pass; then controlled test of email and username login, admin denial, read-only dashboard data and calculation parity; add brand-target settings |
| 4 | Penjualan | Not started | Preserve sale entry, filtering, exports, and historical records |
| 5 | Stock and In Out | Not started | Preserve stock calculations, adjustments, history, and negative/PO behavior |
| 6 | Regression testing and deployment cutover | Test tooling being added; no production changes | Test all key flows, review deployment, switch production only after explicit approval |

## Verified progress and next actions

- The legacy root app requires a Supabase session and checks app_admins before initializing the app. Username login uses the existing login-username Edge Function.
- src/AuthGate.jsx adds session restoration, email/password login, legacy username login, and an admin-table check before rendering the migrated Dashboard. The gate is defense-in-depth, not a replacement for database RLS. Password recovery/change flows are not ported yet.
- src/AuthGate.test.jsx adds mocked tests for missing configuration, signed-out state, authorized admin, empty admin list, and admin-check errors. These tests do not call the live Supabase project and cannot prove real credentials or production RLS behavior.
- The Dashboard remains a first pass. Stock arithmetic and relation names are not validated against production results; do not treat totals as parity-approved.
- Next sequence: run the new CI test/build; fix any test failures; commit the generated lockfile through the workflow artifact or another verified method; finish auth/deployment audit; then controlled read-only data parity checks. Brand target settings follow after data/auth behavior is verified. Penjualan and Stock/In Out remain later stages.
- Do not recreate the scaffold or reimplement the already-merged Dashboard UI.

## Safety constraints

- Keep root production files and the current production deployment workflow untouched until cutover.
- No schema, data, RLS, auth settings, Edge Functions, or production query changes without explicit approval.
- Dashboard queries remain read-only; frontend configuration may use only Vite environment variables and the public/anon key, never a service-role key.
- Do not show sample metrics when Supabase is not configured.
- A successful build or mocked unit test does not prove real login, production authorization, or data calculation parity.
- Update this roadmap after each verified stage so completed work is not repeated.
