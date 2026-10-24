# DEHOS migration roadmap

Last updated: 2026-10-25

| Step | Scope | Status | Exit criteria |
|---|---|---|---|
| 1 | Audit current root app and deployment | In progress; Dashboard RPC, sales fields, item-brand join, and stock transaction semantics mapped | Finish remaining page behavior, auth boundaries, and deployment workflow audit |
| 2 | React + Vite + Tailwind v4 + Radix + Supabase JS + Lucide scaffold | Scaffold and dependency install/build verified; lockfile artifact generated, but `package-lock.json` is not yet committed | Commit generated lockfile and verify clean reproducible build |
| 3 | Dashboard | First React Dashboard pass merged in PR #36; CI build passed (run #12). Live Supabase integration and data-parity checks remain unverified; brand target settings not implemented | Verify real read-only data, stock totals/date semantics, graph, brand performance, recent sales, negative/low stock; add brand-target settings |
| 4 | Penjualan | Not started | Preserve sale entry, filtering, exports, and historical records |
| 5 | Stock and In Out | Not started | Preserve stock calculations, adjustments, history, and negative/PO behavior |
| 6 | Regression testing and deployment cutover | Not started | Test all key flows, review deployment, switch production only after approval |

## Current next action
Commit the generated `package-lock.json` from the successful CI artifact, then continue Dashboard verification against the existing Supabase project. Do not recreate the scaffold or reimplement already-merged Dashboard UI. Only after data parity is confirmed, implement brand-target settings and then proceed to Penjualan.

## Safety constraints
- Keep root production files and current production deployment workflow untouched until cutover.
- Dashboard performs read-only queries only; no insert, update, delete, schema, RLS, or auth changes.
- Browser configuration must use Vite environment variables and the public/anon key only, never a service-role key.
- Show no sample metrics when Supabase is not configured; clearly display connection/setup status.
- A successful build does not prove that production data queries or calculations match; verify separately.
- Keep this roadmap updated after each completed step so completed work is not repeated.
