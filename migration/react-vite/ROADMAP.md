# DEHOS migration roadmap

Last updated: 2026-10-24

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | Partial: production entry, dashboard DOM/data flow, Supabase initialization, and Supabase function config checked; full deployment workflow inventory remains | Confirm deployment workflow and regression-critical behavior |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | **Build verified in GitHub Actions** (run 40111050633, conclusion: success); lockfile not committed | Commit deterministic lockfile and retain successful build |
| 3 | Dashboard migration | **Data-flow audit completed; implementation not started** | Implement isolated React dashboard and verify parity with production behavior |
| 4 | Penjualan | Not started | Preserve sale entry, filtering, exports, and historical records |
| 5 | Stock and In Out | Not started | Preserve stock calculations, adjustments, history, and negative/PO behavior |
| 6 | Regression testing and deployment cutover | Not started | Test key flows, review deployment, switch production only after approval |

## Work completed (do not repeat)

- Created branch `migration/react-vite-foundation`.
- Added isolated scaffold under `migration/react-vite/` with React, Vite, Tailwind CSS v4, Radix Dialog/Dropdown Menu, Supabase JS client wrapper, and Lucide React.
- Added isolated GitHub Actions build workflow `.github/workflows/react-migration-check.yml`.
- Confirmed workflow run 40111050633 completed successfully; install and production build steps passed. This verification was for the scaffold code at that commit, not for subsequent documentation-only commits.
- Opened draft PR #32: https://github.com/dehos/dehos.github.io/pull/32.
- Checked production `index.html`, `script.js`, `style.css`, and `supabase/config.toml`; traced dashboard rendering/data dependencies and documented them in `DASHBOARD-MIGRATION.md`.
- Root production files and live deployment have not been changed by this migration branch.

## Safety constraints

- Keep root production files and current production deployment untouched until cutover.
- Do not modify Supabase tables, columns, data, RLS, auth, or existing queries as part of this UI-stack migration.
- Do not use a Supabase service-role key in frontend code.
- Do not claim a build passed unless the relevant workflow run reports success.
- Update this roadmap after each completed step so completed work is not repeated.
