# DEHOS migration roadmap

Last updated: 2026-10-25

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | In progress; Dashboard queries, summary RPC, sales fields, and stock calculation semantics mapped | Confirm remaining page behaviors, authentication boundaries, and deployment workflow |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | Scaffold merged; GitHub Actions build passed previously; lockfile still not committed | Build passes on current dashboard branch and generated lockfile is committed |
| 3 | Dashboard | First React implementation added on isolated branch; awaiting CI build and review | Verify read-only Supabase integration, metrics, 7/30-day chart, brand performance, latest sales, negative/low stock; add brand-target settings in a later pass |
| 4 | Penjualan | Not started | Preserve sale entry, filtering, exports, and historical records |
| 5 | Stock and In Out | Not started | Preserve stock calculations, adjustments, history, and negative/PO behavior |
| 6 | Regression testing and deployment cutover | Not started | Test all key flows, review deployment, switch production only after approval |

## Current next action
Run the migration CI against the new Dashboard implementation. Retrieve and commit the generated `package-lock.json` after the build succeeds. Keep the Dashboard isolated until its query behavior and stock calculation are reviewed. Do not recreate the existing scaffold.

## Safety constraints
- Keep root production files and current production deployment workflow untouched until cutover.
- Dashboard uses read-only queries only; no insert, update, delete, schema, RLS, or auth changes.
- Browser configuration must use Vite environment variables and the public/anon key only, never a service-role key.
- Show no sample metrics when Supabase is not configured; clearly display connection/setup status.
- Never claim a build passed until the current branch's `npm run build` succeeds.
- Keep this roadmap updated after each completed step so completed work is not repeated.
