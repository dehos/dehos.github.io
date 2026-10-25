-- REFERENCE ONLY. This is NOT a migration and must not be applied or moved into supabase/migrations.
--
-- Reproducible access-control check used on 2026-10-25 against the live Supabase project.
-- It changes nothing: it simulates the `anon` role, a signed-in NON-admin and a signed-in admin
-- (via SET LOCAL ROLE + request.jwt.claims) and ALWAYS ends with RAISE EXCEPTION, so the whole
-- transaction (including the test inserts that are expected to be refused) is rolled back.
-- The result is read from the error text "ROLLBACK_HASIL: {...}". No admin email is printed.
-- Run it as a privileged role (e.g. postgres) as ONE statement; do not wrap it in a client-side COMMIT.
--
-- Observed result (2026-10-25): see ROADMAP.md, "Access-control verification".
-- It does NOT test Supabase Auth itself (sign-up settings, email delivery, password rules).

DO $$
DECLARE
  v_admin text; res jsonb := '{}'::jsonb; e text; n bigint; v_item bigint;
  claims_nonadmin text := '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001","email":"bukan-admin-uji@example.invalid"}';
BEGIN
  SELECT email INTO v_admin FROM public.app_admins ORDER BY created_at LIMIT 1;
  SELECT id INTO v_item FROM public.barang WHERE brand_id IS NOT NULL ORDER BY id LIMIT 1;
  IF v_admin IS NULL OR v_item IS NULL THEN
    RAISE EXCEPTION 'Prasyarat tidak ada: butuh minimal satu baris app_admins dan satu barang ber-brand';
  END IF;

  -- Privilege facts (no execution).
  res := res || jsonb_build_object('privileges', (
    select jsonb_object_agg(t, jsonb_build_object(
      'anon_select', has_table_privilege('anon','public.'||t,'SELECT'),
      'anon_insert', has_table_privilege('anon','public.'||t,'INSERT'),
      'anon_truncate', has_table_privilege('anon','public.'||t,'TRUNCATE'),
      'auth_truncate', has_table_privilege('authenticated','public.'||t,'TRUNCATE'),
      'auth_trigger', has_table_privilege('authenticated','public.'||t,'TRIGGER'),
      'auth_references', has_table_privilege('authenticated','public.'||t,'REFERENCES')))
    from unnest(array['barang','penjualan','transaksi','brand','app_admins','app_login_attempts','import_brand_barang','import_brand_barang_csv']) t));

  -- Catalog facts: RLS flag + policy names per table, and SECURITY DEFINER/INVOKER of the functions the app calls.
  res := res || jsonb_build_object('rls', (
    select jsonb_object_agg(c.relname, jsonb_build_object('rls_on', c.relrowsecurity,
      'policies', (select coalesce(jsonb_agg(p.polname),'[]'::jsonb) from pg_policy p where p.polrelid=c.oid)))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'));
  res := res || jsonb_build_object('function_security', (
    select jsonb_agg(jsonb_build_object('fn',p.proname||'('||pg_get_function_identity_arguments(p.oid)||')','security_definer',p.prosecdef,
      'anon_exec',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_exec',has_function_privilege('authenticated',p.oid,'EXECUTE')) order by 1)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('catat_penjualan_atomic','catat_transaksi_stok_atomic','edit_penjualan_atomic','hapus_penjualan_atomic','get_dashboard_summary')));

  -- anon
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN PERFORM count(*) FROM public.penjualan; res := res || jsonb_build_object('anon_select_penjualan','NOT REFUSED');
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS e = MESSAGE_TEXT; res := res || jsonb_build_object('anon_select_penjualan','refused: '||e); END;
  BEGIN PERFORM public.catat_penjualan_atomic(v_item,'X',1,1,current_date); res := res || jsonb_build_object('anon_rpc_catat','NOT REFUSED');
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS e = MESSAGE_TEXT; res := res || jsonb_build_object('anon_rpc_catat','refused: '||e); END;
  BEGIN PERFORM public.edit_penjualan_atomic(1, v_item, 'X', 1, 1, current_date); res := res || jsonb_build_object('anon_rpc_edit','NOT REFUSED');
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS e = MESSAGE_TEXT; res := res || jsonb_build_object('anon_rpc_edit','refused: '||e); END;
  BEGIN PERFORM public.hapus_penjualan_atomic(1); res := res || jsonb_build_object('anon_rpc_hapus','NOT REFUSED');
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS e = MESSAGE_TEXT; res := res || jsonb_build_object('anon_rpc_hapus','refused: '||e); END;
  EXECUTE 'RESET ROLE';

  -- signed-in, NOT an admin
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', claims_nonadmin, true);
  SELECT count(*) INTO n FROM public.penjualan;  res := res || jsonb_build_object('nonadmin_rows_penjualan', n);
  SELECT count(*) INTO n FROM public.barang;     res := res || jsonb_build_object('nonadmin_rows_barang', n);
  SELECT count(*) INTO n FROM public.transaksi;  res := res || jsonb_build_object('nonadmin_rows_transaksi', n);
  SELECT count(*) INTO n FROM public.app_admins; res := res || jsonb_build_object('nonadmin_rows_app_admins', n);
  res := res || jsonb_build_object('nonadmin_dashboard_summary', public.get_dashboard_summary(current_date, date_trunc('month',current_date)::date, (date_trunc('month',current_date)+interval '1 month')::date));
  BEGIN PERFORM public.catat_penjualan_atomic(v_item,'X',1,1,current_date); res := res || jsonb_build_object('nonadmin_rpc_catat','NOT REFUSED');
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS e = MESSAGE_TEXT; res := res || jsonb_build_object('nonadmin_rpc_catat','refused: '||e); END;
  BEGIN PERFORM public.edit_penjualan_atomic(1, v_item, 'X', 1, 1, current_date); res := res || jsonb_build_object('nonadmin_rpc_edit','NOT REFUSED');
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS e = MESSAGE_TEXT; res := res || jsonb_build_object('nonadmin_rpc_edit','refused: '||e); END;
  BEGIN PERFORM public.hapus_penjualan_atomic(1); res := res || jsonb_build_object('nonadmin_rpc_hapus','NOT REFUSED');
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS e = MESSAGE_TEXT; res := res || jsonb_build_object('nonadmin_rpc_hapus','refused: '||e); END;
  BEGIN INSERT INTO public.app_admins(email) VALUES ('penyusup@example.invalid'); res := res || jsonb_build_object('nonadmin_insert_app_admins','NOT REFUSED');
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS e = MESSAGE_TEXT; res := res || jsonb_build_object('nonadmin_insert_app_admins','refused: '||e); END;
  BEGIN INSERT INTO public.barang(nama,stok_awal) VALUES ('__UJI_NONADMIN__',1); res := res || jsonb_build_object('nonadmin_insert_barang','NOT REFUSED');
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS e = MESSAGE_TEXT; res := res || jsonb_build_object('nonadmin_insert_barang','refused: '||e); END;
  EXECUTE 'RESET ROLE';

  -- signed-in admin (read-only checks; email deliberately upper-cased to test case handling)
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', json_build_object('role','authenticated','sub','00000000-0000-0000-0000-000000000002','email',upper(v_admin))::text, true);
  SELECT count(*) INTO n FROM public.penjualan;  res := res || jsonb_build_object('admin_rows_penjualan', n);
  SELECT count(*) INTO n FROM public.barang;     res := res || jsonb_build_object('admin_rows_barang', n);
  SELECT count(*) INTO n FROM public.app_admins; res := res || jsonb_build_object('admin_rows_app_admins_visible', n);
  SELECT count(*) INTO n FROM public.app_admins WHERE email = lower(v_admin); res := res || jsonb_build_object('admin_sees_own_app_admins_row', n);
  res := res || jsonb_build_object('admin_dashboard_total_stok', public.get_dashboard_summary(current_date, date_trunc('month',current_date)::date, (date_trunc('month',current_date)+interval '1 month')::date)->'total_stok');
  EXECUTE 'RESET ROLE';

  RAISE EXCEPTION 'ROLLBACK_HASIL: %', res::text;   -- always roll back
END $$;
