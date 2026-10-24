# Dashboard migration inventory

Last updated: 2026-10-24
Source: read-only inspection of production `index.html` and `script.js` on `main`.

## Existing dashboard surface (preserve during migration)

| Existing UI | DOM id | Migration requirement |
|---|---|---|
| Total Barang | `totalBarang` | Preserve current computed count |
| Total Stok | `totalStok` | Preserve current stock total semantics |
| Transaksi Hari Ini | `transaksiHariIni` | Preserve current day boundary and transaction counting |
| Omzet Hari Ini | `omzetHariIni` | Preserve existing revenue calculation |
| Ringkasan Penjualan | `dashboardChart` | Preserve chart series and aggregation |
| Chart period selector | `dashboardChartPeriod` | Keep 7-day / 30-day selection |
| Chart summary label/value/trend | `dashboardChartLabel`, `dashboardChartTotal`, `dashboardChartTrend` | Keep period-specific labels and totals |
| Performa Brand | `targetPenjualanList` | Preserve brand targets and achievement semantics |
| Combined target summary | `targetPenjualanTotal`, `targetPenjualanAchievement`, `targetPenjualanMonthLabel` | Preserve monthly target and progress calculations |
| Transaksi Terbaru | `dashboardRecentSales` | Preserve latest-sale ordering and navigation |
| Barang Minus | `dashboardNegativeStock` | Preserve negative stock detection and quantities |
| Perlu Restock | `dashboardLowStock` | Preserve current threshold (5 units or less) |

## Data-flow audit (completed)

| Current function | Existing source / dependency | Behavior that the React version must preserve |
|---|---|---|
| `loadDashboardSummary()` | Supabase RPC `get_dashboard_summary` with today's date and current-month boundaries; `penjualan` query for the latest purchase date in the month | Populates total product count, total stock, today's transaction count, and passes monthly brand sales to target rendering. If the RPC fails, falls back to `ensureCoreData()`. |
| `renderTargetPenjualan(penjualan, bulan, tanggalTerakhir)` | `TARGET_PENJUALAN_BRAND`, `getCanonicalTargetBrand()`, monthly sales supplied by the summary RPC | Normalizes brand aliases and calculates monthly target/achievement; do not hardcode a second target list in React. |
| `loadDashboardExtras()` | Parallel requests: 60 days of `penjualan`, latest 5 sales, and `refreshCoreData()` | Coordinates the chart, revenue, recent-sales list and stock widgets; prevents duplicate concurrent loads. |
| `fetchPenjualanDashboard(dariTanggal)` | `penjualan` columns `id, barang_id, brand, qty, harga, tanggal_pembelian`; pages by 1,000 rows | Loads enough history for the 7/30-day chart and current-day revenue. Existing calculation is `qty × harga`. |
| `renderGrafikPenjualanDashboard()` | `dashboardExtraState.penjualan`, selected period (7 or 30 days) | Aggregates revenue by local calendar date; compares the selected period with the preceding equal-length period. |
| `renderTransaksiTerbaruDashboard()` | Latest 5 rows from `penjualan` plus `dataBarang` | Resolves product names from existing core data and displays the newest sales first. |
| `renderStokMenipisDashboard()` | `dataBarang`, `getRawCurrentStock()` | Uses current stock calculation; shows items at 5 or fewer units, sorted by lowest stock. |
| `renderBarangMinusDashboard()` | `dataBarang`, `getRawCurrentStock()` | Shows items whose current stock is below zero. |
| `renderOmzetHariIniDashboard()` | Loaded dashboard sales history and `getTodayDate()` | Sums `qty × harga` for today's local date. |

## Component/data contract for the isolated React implementation

- Keep Supabase access behind `src/lib/supabase.js`; never add a service-role key or expose secrets in frontend code.
- Do not call new tables/RPCs or change the database schema as part of this migration.
- Preserve existing RPC name, current-month date boundaries, 60-day sales-history window, 1,000-row pagination, latest-five ordering, brand alias mapping, and stock helper semantics.
- Suggested component boundaries: `DashboardPage`, `DashboardMetrics`, `SalesSummaryChart`, `BrandPerformance`, `RecentSales`, `NegativeStockList`, and `LowStockList`. Extract only after tracing dependencies; these are design boundaries, not implemented components.
- Use a normalized view model for presentation, but keep data calculations and behavior equivalent to the existing implementation.
- The isolated scaffold currently has no production dashboard behavior connected. This audit is documentation only.

## Current status

- Dashboard DOM and data flow have been traced from production `script.js`; no production files were changed.
- Root `index.html`, `script.js`, `style.css`, and Supabase configuration remain untouched by this branch.
- Build verification applies to the scaffold code at the successful GitHub Actions run documented in `ROADMAP.md`; documentation-only commits have not been represented as a new successful build.
- Do not repeat the DOM/function audit above unless production `main` changes.

## Next implementation sequence

1. Commit a deterministic lockfile for the isolated scaffold and verify CI.
2. Implement the dashboard in the isolated React app using the audited contracts above.
3. Run build checks and compare metric, chart period, brand target, recent sales, negative stock, and low-stock behavior.
4. Only after dashboard parity is verified, begin Penjualan migration.
