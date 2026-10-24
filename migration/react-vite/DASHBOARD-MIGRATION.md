# Dashboard migration inventory

Last updated: 2026-10-24
Source: production `index.html` on `main`, dashboard section inspected read-only.

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

## Current status
- The inventory above is documented; no dashboard data query or production DOM has been changed.
- Existing dashboard uses DOM IDs that are read by `script.js`; the React migration must replace behavior only after tracing each existing data flow.
- Root `index.html`, `script.js`, `style.css`, and Supabase configuration remain unchanged by this branch.
- Do not invent new Supabase queries or schema changes. Reuse the existing data semantics after inspecting their current implementation.

## Next implementation sequence
1. Trace the existing dashboard render/update functions in `script.js` and document their data dependencies.
2. Define React component boundaries and typed/validated view-model shape without connecting production credentials.
3. Implement and locally/build-test dashboard UI in the isolated scaffold.
4. Compare metric, chart period, brand target, recent sales, negative stock, and low-stock behavior before starting Penjualan migration.
