-- REFERENCE ONLY. This is NOT a migration and must not be applied or moved into supabase/migrations.
-- Captured read-only from the live Supabase project on 2026-10-25 so the React migration can be reviewed
-- against the real definitions (the repository previously had no definition for these two functions).
--
-- Live state observed: both functions are SECURITY INVOKER, executable by `authenticated` only
-- (not anon/PUBLIC). A legacy 5-argument overload
--   edit_penjualan_atomic(p_penjualan_id bigint, p_qty numeric, p_harga numeric, p_brand text, p_tanggal date)
-- also exists as SECURITY DEFINER with no EXECUTE grant to anon/authenticated/PUBLIC; the React app never
-- calls it. Recommend the owner review and drop it in a separately approved change.
--
-- Rollback-only checks on 2026-10-25 (no committed data) showed: qty/price edit updates penjualan and its
-- 'laku' transaksi together; moving a sale to another item moves both rows and returns stock to the old item;
-- invalid qty/brand/ids and deleting twice are rejected; delete removes the sale and its 'laku' transaksi.
-- Not verified: RLS/admin vs non-admin access, concurrent edits.

CREATE OR REPLACE FUNCTION public.edit_penjualan_atomic(p_penjualan_id bigint, p_barang_id bigint, p_brand text, p_qty numeric, p_harga numeric, p_tanggal_pembelian date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    v_old_barang_id bigint;
    v_old_qty numeric;
    v_transaksi_id bigint;
    v_stock_before numeric;
    v_preorder_after numeric;
BEGIN
    IF p_penjualan_id IS NULL OR p_penjualan_id <= 0 THEN
        RAISE EXCEPTION 'ID penjualan tidak valid';
    END IF;
    IF p_barang_id IS NULL OR p_barang_id <= 0 THEN
        RAISE EXCEPTION 'Barang tidak valid';
    END IF;
    IF p_brand IS NULL OR nullif(trim(p_brand), '') IS NULL THEN
        RAISE EXCEPTION 'Brand wajib diisi';
    END IF;
    IF p_qty IS NULL OR p_qty < 1 THEN
        RAISE EXCEPTION 'Quantity minimal 1';
    END IF;
    IF p_harga IS NULL OR p_harga < 0 THEN
        RAISE EXCEPTION 'Harga tidak valid';
    END IF;
    IF p_tanggal_pembelian IS NULL THEN
        RAISE EXCEPTION 'Tanggal pembelian wajib diisi';
    END IF;

    SELECT s.barang_id, s.qty
    INTO v_old_barang_id, v_old_qty
    FROM public.penjualan AS s
    WHERE s.id = p_penjualan_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Penjualan #% tidak ditemukan', p_penjualan_id;
    END IF;

    SELECT t.id
    INTO v_transaksi_id
    FROM public.transaksi AS t
    WHERE t.penjualan_id = p_penjualan_id
      AND t.type = 'laku'
    ORDER BY t.id DESC
    LIMIT 1
    FOR UPDATE;

    IF v_transaksi_id IS NULL THEN
        RAISE EXCEPTION 'Transaksi stok untuk penjualan #% tidak ditemukan', p_penjualan_id;
    END IF;

    -- Lock old and target product rows in a stable order before calculating stock.
    PERFORM b.id
    FROM public.barang AS b
    WHERE b.id IN (v_old_barang_id, p_barang_id)
    ORDER BY b.id
    FOR UPDATE;

    IF NOT EXISTS (
        SELECT 1 FROM public.barang AS b WHERE b.id = p_barang_id
    ) THEN
        RAISE EXCEPTION 'Barang baru tidak ditemukan';
    END IF;

    SELECT
        CASE
            WHEN COALESCE(
                b.tanggal_mulai,
                (b.created_at AT TIME ZONE 'Asia/Jakarta')::date
            ) <= p_tanggal_pembelian
            THEN b.stok_awal
            ELSE 0
        END
        + COALESCE(SUM(
            CASE
                WHEN t.type IN ('masuk', 'adjust_masuk') THEN t.qty
                WHEN t.type IN ('laku', 'adjust_keluar') THEN -t.qty
                WHEN t.type = 'adjust' THEN t.qty
                ELSE 0
            END
        ), 0)
    INTO v_stock_before
    FROM public.barang AS b
    LEFT JOIN public.transaksi AS t
        ON t.barang_id = b.id
       AND t.tanggal <= p_tanggal_pembelian
       -- Match the app's stock snapshot: never count ledger entries before
       -- the product's opening-stock baseline date.
       AND t.tanggal >= COALESCE(
           b.tanggal_mulai,
           (b.created_at AT TIME ZONE 'Asia/Jakarta')::date
       )
       AND t.id <> v_transaksi_id
    WHERE b.id = p_barang_id
    GROUP BY b.id, b.stok_awal, b.tanggal_mulai, b.created_at;

    v_preorder_after := GREATEST(0, p_qty - COALESCE(v_stock_before, 0));

    UPDATE public.penjualan
    SET
        barang_id = p_barang_id,
        brand = trim(p_brand),
        qty = p_qty,
        harga = p_harga,
        tanggal_pembelian = p_tanggal_pembelian
    WHERE id = p_penjualan_id;

    UPDATE public.transaksi
    SET
        barang_id = p_barang_id,
        qty = p_qty,
        tanggal = p_tanggal_pembelian
    WHERE id = v_transaksi_id;

    RETURN jsonb_build_object(
        'success', true,
        'penjualan_id', p_penjualan_id,
        'transaksi_id', v_transaksi_id,
        'old_barang_id', v_old_barang_id,
        'old_qty', v_old_qty,
        'new_barang_id', p_barang_id,
        'new_qty', p_qty,
        'stok_sebelum', COALESCE(v_stock_before, 0),
        'preorder_after', v_preorder_after
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.hapus_penjualan_atomic(p_penjualan_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_transaksi_dihapus integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.penjualan WHERE id = p_penjualan_id) THEN
        RAISE EXCEPTION 'Penjualan tidak ditemukan';
    END IF;

    DELETE FROM public.transaksi
    WHERE penjualan_id = p_penjualan_id
      AND type = 'laku';

    GET DIAGNOSTICS v_transaksi_dihapus = ROW_COUNT;

    IF v_transaksi_dihapus = 0 THEN
        RAISE EXCEPTION 'Transaksi stok tidak ditemukan';
    END IF;

    DELETE FROM public.penjualan WHERE id = p_penjualan_id;

    RETURN true;
END;
$function$;
