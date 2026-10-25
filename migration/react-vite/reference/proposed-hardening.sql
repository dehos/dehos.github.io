-- PROPOSED, NOT APPLIED. This is NOT a migration and must not be moved into supabase/migrations
-- until the project owner has reviewed and approved it. Nothing here was executed against production.
--
-- Why (see ROADMAP.md, "Security findings"):
--  1. `public.v_stock` is owned by postgres and has no security_invoker option, so it runs with the
--     owner's rights and bypasses row-level security. Verified in a rolled-back session on 2026-10-26:
--     a signed-in NON-admin reads 0 rows from `barang` but 1,259 rows (item names and stock levels)
--     from `v_stock`. Neither the legacy root app nor the React migration references `v_stock`.
--  2. `authenticated` holds TRUNCATE, TRIGGER and REFERENCES on every public table. TRUNCATE is not
--     subject to RLS. The app needs only SELECT/INSERT/UPDATE/DELETE (all kept below).
--
-- Rolled-back verification (2026-10-26): this exact change was applied inside a transaction that always
-- ended with RAISE EXCEPTION, then production was re-checked and was unchanged. Inside it:
--   non-admin: v_stock rows 1,259 -> 0; TRUNCATE refused ("permission denied for table penjualan")
--   admin: v_stock 1,259 rows, barang 1,259 rows, get_dashboard_summary total_stok 5,660,
--          catat_penjualan_atomic, edit_penjualan_atomic, catat_transaksi_stok_atomic and
--          hapus_penjualan_atomic all succeeded; SELECT/INSERT/UPDATE/DELETE privileges unchanged.
-- Not tested: the legacy root app in a browser (it does not use v_stock and only does DML, so no
-- impact is expected, but test it first), Edge Function `login-username`, and the Android build.

BEGIN;

ALTER VIEW public.v_stock SET (security_invoker = true);

REVOKE TRUNCATE, TRIGGER, REFERENCES ON
  public.barang, public.penjualan, public.transaksi, public.brand, public.app_admins,
  public.app_login_attempts, public.import_brand_barang, public.import_brand_barang_csv,
  public.v_stock
FROM authenticated;

COMMIT;

-- Roll back this change later if ever needed:
--   ALTER VIEW public.v_stock SET (security_invoker = false);
--   GRANT TRUNCATE, TRIGGER, REFERENCES ON <tables above> TO authenticated;
--
-- Separate owner-only setting (cannot be changed by SQL): Supabase Dashboard > Authentication >
-- enable "Leaked password protection" (advisor WARN), and confirm email sign-ups are disabled.
