# Controlled migration verification runbook

This checklist is for the isolated React migration preview only. It is not permission to change production deployment or Supabase configuration. Do not run writes against production unless an owner has explicitly approved the test and the data impact is understood.

## Safety prerequisites

- Use a private/controlled preview of `migration/react-vite`, not the live website.
- Configure only the existing Supabase project URL and its public/anon (publishable) key in local `.env.local`. Never use or paste a service-role/secret key into the browser, GitHub, chat, or CI.
- Use an authorized test account and a separate known non-admin account. Do not share passwords or tokens in test evidence.
- Before testing write paths, agree on a disposable test item or a clearly reversible test transaction and its cleanup owner. If no safe test fixture exists, skip writes and record them as blocked.
- Record only pass/fail, timestamps, redacted screenshots, and non-sensitive row identifiers. Never include session tokens, passwords, customer data, or full environment files.

## Automated checks

Run from `migration/react-vite/`:

```sh
npm ci
npm audit --audit-level=high
npm test
npm run build
```

All four commands must pass. This verifies dependency installation, known dependency advisories, deterministic unit tests, and compilation; it does not prove live authorization or data parity.

## Authentication and authorization

- [ ] With no Supabase environment configured, the app shows the setup state and no dashboard data.
- [ ] Signed-out visitor sees the login screen and cannot access dashboard content.
- [ ] Authorized admin can sign in by email/password and sees the dashboard only after the exact session email matches an `app_admins` result.
- [ ] If legacy username login is supported in the environment, verify it returns a valid session and passes the same exact-email admin check.
- [ ] A valid non-admin account is denied; dashboard content remains hidden.
- [ ] Missing session email, an empty/mismatched admin result, and an admin-query failure all deny access (fail closed).
- [ ] Logout returns to the signed-out screen; refreshing while signed out does not reveal cached dashboard content.
- [ ] Inspect browser network requests and built assets to confirm no service-role/secret key is present.

## Read-only data parity

Using the same authorized admin account and the same date range in the legacy app and migration preview, compare:

- [ ] Dashboard item count, stock totals, today's sales, brand totals, recent sales, low-stock items, and negative-stock/pre-order indicators.
- [ ] Sales page monthly totals, filters, historical rows, and CSV export against the legacy app.
- [ ] Stock balance for a few known items across opening stock, incoming transactions, sales, adjustments, and a chosen historical date.
- [ ] Pagination does not omit records or double-count totals.
- [ ] Loading, empty, missing configuration, and query-error states are explicit and do not substitute fabricated metrics.

Record differences and investigate before approving parity. A successful build or mocked test is not evidence of parity.

## Write-path verification (only with explicit test approval)

- [ ] Submit one reversible test sale through the existing `catat_penjualan_atomic` RPC and verify its returned result and corresponding row/balance.
- [ ] Submit one approved stock-in/out/adjustment through `catat_transaksi_stok_atomic` and verify the result and calculated balance.
- [ ] Confirm invalid quantities, stock-out above available stock, RPC errors, and concurrent/duplicate submission paths fail safely and display a useful message.
- [ ] Verify the legacy app reflects the same successful test transaction, then perform only the pre-agreed cleanup procedure if applicable.
- [ ] Confirm the browser client performs no direct table writes to `penjualan`, `barang`, or `transaksi`; writes must use the existing atomic RPCs.

If safe fixtures or explicit approval are unavailable, mark this section BLOCKED rather than improvising against production.

## Deployment gate

- [ ] Independently inspect the actual GitHub Pages source/build configuration in repository settings; workflow files alone do not prove the configured source.
- [ ] Review relevant Supabase RLS policies and effective grants in an authorized read-only review; confirm client-side admin gating is not treated as the data security boundary.
- [ ] Complete authentication, data-parity, and approved write-path checks with evidence.
- [ ] Review the final diff and rollback plan, then obtain explicit cutover approval.

Until every applicable gate is satisfied, keep the React app isolated and do not change `main`, production root files, Supabase schema/data/RLS/Auth, Edge Functions, RPCs, or Pages settings.
