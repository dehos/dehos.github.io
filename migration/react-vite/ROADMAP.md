# DEHOS migration roadmap

Last updated: 2026-10-25

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | In progress; Dashboard RPC, sales fields, item-brand join, stock transaction semantics, and the legacy admin-auth boundary identified | Finish remaining page behavior and deployment workflow audit; document and implement equivalent auth gate before connecting or publishing the migrated UI |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | Scaffold and dependency install/build verified; CI generated a package-lock.json artifact, but the lockfile is not committed | Commit the generated lockfile and verify a clean reproducible build |
| 3 | Dashboard and authentication | Dashboard first pass merged in PR #36. Auth gate added in PR #38; this follow-up now checks the signed-in session email against `app_admins` instead of accepting any visible admin row. Build/automated tests and live auth/data parity remain pending; brand target settings not implemented | Verify email and username login, admin denial, logout, read-only data/calculation parity; then add brand-target settings |
| 4 | Penjualan | Not started | Preserve sale entry, filtering, exports, and historical records |
| 5 | Stock and In Out | Not started | Preserve stock calculations, adjustments, history, and negative/PO behavior |
| 6 | Regression testing and deployment cutover | Not started | Test all key flows, review deployment, switch production only after approval |

## Audit findings and next actions

- The legacy root app checks a Supabase session and verifies admin access through app_admins before initializing the application. Username login also uses the login-username Edge Function.
- `src/AuthGate.jsx` adds legacy email/password and `login-username` sign-in paths, restores the session, and now filters `app_admins` by the current session user's email before rendering the Dashboard. Missing email or failed/empty verification denies access. This is a client-side defense-in-depth check, not a replacement for Supabase RLS. Password recovery/change flows are not yet ported. Live authorization behavior still needs controlled verification.
- The Dashboard is currently a visual/data-query first pass only. Its stock arithmetic and relation names have not been validated against real production results; do not treat the displayed totals as parity-approved.
- Next sequence: finish automated/build verification for the identity-specific admin check; perform controlled live login and read-only data-parity checks. Then address the reproducible dependency lockfile and finish the deployment audit. Only after auth/data behavior is verified, implement brand-target settings and proceed to Penjualan.
- Do not recreate the scaffold or reimplement the already-merged Dashboard UI.

## Safety constraints

- Keep root production files and the current production deployment workflow untouched until cutover.
- No schema, data, RLS, auth, or production query changes without explicit approval.
- Dashboard queries must remain read-only; browser configuration may use only Vite environment variables and the public/anon key, never a service-role key.
- Do not show sample metrics when Supabase is not configured; clearly display connection/setup status.
- A successful build does not prove that production queries, authorization, or calculations match.
- Keep this roadmap updated after each completed step so completed work is not repeated.
