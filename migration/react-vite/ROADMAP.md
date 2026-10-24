# DEHOS migration roadmap

Last updated: 2026-10-25

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | In progress; dashboard data/behavior audit partially completed | Confirm entry files, Supabase usage, assets, deployment workflow, and remaining page behaviors |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | Scaffold merged; GitHub Actions build passed (run #9); lockfile generation/capture in progress | Successful dependency install and production build; commit lockfile |
| 3 | Dashboard | Not started; existing dashboard behavior has been mapped | Implement React dashboard using verified legacy data semantics; match metrics, graph, brand performance, minus-stock list |
| 4 | Penjualan | Not started | Preserve sale entry, filtering, exports, and historical records |
| 5 | Stock and In Out | Not started | Preserve stock calculations, adjustments, history, and negative/PO behavior |
| 6 | Regression testing and deployment cutover | Not started | Test all key flows, review deployment, switch production only after approval |

## Current next action
The foundation build has passed. The workflow now uploads the lockfile created by npm install; trigger the migration build on a migration-path PR, retrieve the artifact, commit package-lock.json, then begin Dashboard React implementation. Do not recreate the scaffold.

## Safety constraints
- Keep root production files and current production deployment workflow untouched until cutover.
- Do not modify Supabase tables, columns, data, RLS, auth, or legacy production queries as part of the UI-stack migration.
- Never claim a build passed until dependencies have been installed and `npm run build` has actually succeeded.
- Keep this roadmap updated after each completed step so completed work is not repeated.
