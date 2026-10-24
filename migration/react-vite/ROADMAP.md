# DEHOS migration roadmap

Last updated: 2026-10-24

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | In progress | Confirm entry files, Supabase usage, assets, and deploy workflow |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | Scaffold added; build not yet verified | Install dependencies, generate lockfile, successful production build |
| 3 | Dashboard | Not started | Match existing metrics and chart behavior |
| 4 | Penjualan | Not started | Preserve sale entry, filtering, exports, and historical records |
| 5 | Stock and In Out | Not started | Preserve stock calculations, adjustments, history, and negative/PO behavior |
| 6 | Regression testing and deployment cutover | Not started | Test all key flows, review deployment, switch production only after approval |

## Safety constraints
- Keep root production files and current deployment workflow untouched until cutover.
- Do not modify Supabase tables, columns, data, RLS, auth, or existing queries as part of the UI-stack migration.
- Do not claim a build passed until dependencies have been installed and `npm run build` has actually succeeded.
- Keep this roadmap updated after each completed step so completed work is not repeated.
