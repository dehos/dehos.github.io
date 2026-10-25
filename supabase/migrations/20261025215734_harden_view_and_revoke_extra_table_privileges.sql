-- Recorded after being applied to the live project on 2026-10-26 with the owner's approval
-- (version 20261025215734 in supabase_migrations). Idempotent: safe to re-run.
-- Fixes: public.v_stock bypassed RLS (a signed-in non-admin could read every item and stock level), and
-- `authenticated` held TRUNCATE/TRIGGER/REFERENCES (TRUNCATE is not subject to RLS) on the app tables.
-- SELECT/INSERT/UPDATE/DELETE are unchanged. Verified after applying: non-admin v_stock rows 0, TRUNCATE
-- refused for non-admin and admin, admin dashboard total and sale/stock RPCs unchanged.

ALTER VIEW public.v_stock SET (security_invoker = true);

REVOKE TRUNCATE, TRIGGER, REFERENCES ON
  public.barang, public.penjualan, public.transaksi, public.brand, public.app_admins,
  public.app_login_attempts, public.import_brand_barang, public.import_brand_barang_csv,
  public.v_stock
FROM authenticated;
