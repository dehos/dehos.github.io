-- Keep a sale and its stock movement in the same database transaction.
create function public.catat_penjualan_atomic(
    p_barang_id bigint,
    p_brand text,
    p_qty numeric,
    p_harga numeric,
    p_tanggal_pembelian date
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_penjualan_id bigint;
    v_transaksi_id bigint;
    v_stok_sebelum numeric;
begin
    if p_barang_id is null or p_barang_id <= 0 or
       p_qty is null or p_qty < 1 or
       p_harga is null or p_harga < 0 or
       nullif(trim(p_brand), '') is null or
       p_tanggal_pembelian is null then
        raise exception 'Data penjualan tidak valid';
    end if;

    perform 1 from public.barang where id = p_barang_id for update;
    if not found then
        raise exception 'Barang tidak ditemukan';
    end if;

    select b.stok_awal + coalesce(sum(
        case
            when t.type in ('masuk', 'adjust_masuk') then t.qty
            when t.type in ('laku', 'adjust_keluar') then -t.qty
            else 0
        end
    ), 0)
    into v_stok_sebelum
    from public.barang b
    left join public.transaksi t
        on t.barang_id = b.id and t.tanggal <= p_tanggal_pembelian
    where b.id = p_barang_id
    group by b.id, b.stok_awal;

    insert into public.penjualan
        (barang_id, brand, qty, harga, tanggal_pembelian)
    values
        (p_barang_id, trim(p_brand), p_qty, p_harga, p_tanggal_pembelian)
    returning id into v_penjualan_id;

    insert into public.transaksi
        (barang_id, tanggal, type, qty, penjualan_id)
    values
        (p_barang_id, p_tanggal_pembelian, 'laku', p_qty, v_penjualan_id)
    returning id into v_transaksi_id;

    return jsonb_build_object(
        'penjualan_id', v_penjualan_id,
        'transaksi_id', v_transaksi_id,
        'stok_sebelum', v_stok_sebelum,
        'preorder_setelah', greatest(0, p_qty - v_stok_sebelum)
    );
end;
$$;

-- Lock the same product row for manual in/out/adjust operations. The
-- expected stock rejects a submission if another user changed it meanwhile.
create function public.catat_transaksi_stok_atomic(
    p_barang_id bigint,
    p_tanggal date,
    p_type text,
    p_qty numeric,
    p_expected_stock numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_stok numeric;
    v_simpan_type text;
    v_simpan_qty numeric;
    v_transaksi_id bigint;
begin
    if p_barang_id is null or p_barang_id <= 0 or
       p_tanggal is null or p_expected_stock is null or
       p_type is null or p_type not in ('masuk', 'laku', 'adjust') or
       p_qty is null or
       (p_type = 'adjust' and p_qty < 0) or
       (p_type <> 'adjust' and p_qty < 1) then
        raise exception 'Data transaksi tidak valid';
    end if;

    perform 1 from public.barang where id = p_barang_id for update;
    if not found then
        raise exception 'Barang tidak ditemukan';
    end if;

    select b.stok_awal + coalesce(sum(
        case
            when t.type in ('masuk', 'adjust_masuk') then t.qty
            when t.type in ('laku', 'adjust_keluar') then -t.qty
            else 0
        end
    ), 0)
    into v_stok
    from public.barang b
    left join public.transaksi t
        on t.barang_id = b.id and t.tanggal <= p_tanggal
    where b.id = p_barang_id
    group by b.id, b.stok_awal;

    if v_stok <> p_expected_stock then
        raise exception 'Stok berubah menjadi %. Periksa kembali sebelum menyimpan.', greatest(0, v_stok);
    end if;

    if p_type = 'adjust' then
        if p_qty = v_stok then
            raise exception 'Stok sudah sesuai';
        end if;
        v_simpan_type := case when p_qty > v_stok then 'adjust_masuk' else 'adjust_keluar' end;
        v_simpan_qty := abs(p_qty - v_stok);
    else
        if p_type = 'laku' and p_qty > greatest(0, v_stok) then
            raise exception 'Jumlah keluar melebihi stok tersedia (%)', greatest(0, v_stok);
        end if;
        v_simpan_type := p_type;
        v_simpan_qty := p_qty;
    end if;

    insert into public.transaksi (barang_id, tanggal, type, qty)
    values (p_barang_id, p_tanggal, v_simpan_type, v_simpan_qty)
    returning id into v_transaksi_id;

    return jsonb_build_object(
        'transaksi_id', v_transaksi_id,
        'stok_sebelum', v_stok,
        'stok_setelah', v_stok + case when v_simpan_type in ('masuk', 'adjust_masuk')
            then v_simpan_qty else -v_simpan_qty end
    );
end;
$$;

revoke all on function public.catat_penjualan_atomic(bigint, text, numeric, numeric, date) from public, anon;
revoke all on function public.catat_transaksi_stok_atomic(bigint, date, text, numeric, numeric) from public, anon;
grant execute on function public.catat_penjualan_atomic(bigint, text, numeric, numeric, date) to authenticated;
grant execute on function public.catat_transaksi_stok_atomic(bigint, date, text, numeric, numeric) to authenticated;
