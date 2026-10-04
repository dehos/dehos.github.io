-- Dashboard uses the same dated, adjustment-aware balance as the stock page.
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_today date, p_month_start date, p_month_end date)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY INVOKER
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select jsonb_build_object(
    'total_barang',
      (select count(*) from public.barang),
    'total_stok',
      (select coalesce(sum(greatest(balance.stok, 0)), 0)
       from (
         select b.id,
           case when coalesce(b.tanggal_mulai, (b.created_at at time zone 'Asia/Jakarta')::date) <= p_today
                then coalesce(b.stok_awal, 0) else 0 end
           + coalesce(sum(case
               when t.type in ('masuk', 'adjust_masuk') then t.qty
               when t.type in ('laku', 'adjust_keluar') then -t.qty
               else 0 end), 0) as stok
         from public.barang b
         left join public.transaksi t on t.barang_id = b.id and t.tanggal <= p_today
         group by b.id
       ) balance),
    'transaksi_hari_ini',
      (select count(*) from public.transaksi t where t.tanggal = p_today),
    'brand_sales',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'brand', totals.brand,
              'total', totals.total
            )
            order by totals.brand
          )
          from (
            select
              coalesce(nullif(trim(p.brand), ''), 'Tanpa Brand') as brand,
              sum(coalesce(p.qty, 0) * coalesce(p.harga, 0)) as total
            from public.penjualan p
            where p.tanggal_pembelian >= p_month_start
              and p.tanggal_pembelian < p_month_end
            group by coalesce(nullif(trim(p.brand), ''), 'Tanpa Brand')
          ) totals
        ),
        '[]'::jsonb
      )
  );
$function$
