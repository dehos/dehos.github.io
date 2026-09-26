-- One confirmed sale on 23 September was linked to two identical stock-out
-- rows nine seconds apart. Keep the first movement and archive the duplicate.
create schema if not exists internal;
revoke all on schema internal from public, anon, authenticated;

create table if not exists internal.stock_correction_backup (
    captured_at timestamptz not null default now(),
    reason text not null,
    original_row jsonb not null
);
revoke all on internal.stock_correction_backup from public, anon, authenticated;

do $correction$
declare
    v_sale_id bigint;
    v_movement_ids bigint[];
    v_duplicate public.transaksi%rowtype;
begin
    select p.id into strict v_sale_id
    from public.penjualan p
    join public.barang b on b.id = p.barang_id
    where p.tanggal_pembelian = date '2026-09-23'
      and p.brand = 'Dekkson'
      and b.nama = 'DEKKSON HINGE NYLON ES IR 4X3X2MM 4NR WH'
      and p.qty = 1
      and p.harga = 33000;

    select array_agg(t.id order by t.created_at, t.id)
    into v_movement_ids
    from public.transaksi t
    where t.penjualan_id = v_sale_id
      and t.type = 'laku'
      and t.qty = 1
      and t.tanggal = date '2026-09-23';

    if array_length(v_movement_ids, 1) is distinct from 2 or
       (select count(*) from public.transaksi where penjualan_id = v_sale_id) <> 2 then
        raise exception 'Catatan lama telah berubah; koreksi dibatalkan';
    end if;

    select * into strict v_duplicate
    from public.transaksi
    where id = v_movement_ids[2];

    insert into internal.stock_correction_backup (reason, original_row)
    values ('Duplikat pengurangan stok untuk satu nota penjualan 2026-09-23',
            to_jsonb(v_duplicate));

    delete from public.transaksi
    where id = v_duplicate.id and penjualan_id = v_sale_id;
end;
$correction$;

create unique index transaksi_one_stock_out_per_sale_idx
    on public.transaksi (penjualan_id)
    where penjualan_id is not null and type = 'laku';
