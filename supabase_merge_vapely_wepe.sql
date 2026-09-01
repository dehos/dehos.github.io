-- Menggabungkan brand Vapely dan Wepe menjadi Vapely/Wepe.
-- Aman dijalankan dari Supabase SQL Editor.
-- Brand lama dinonaktifkan, tidak dihapus.

begin;

do $$
declare
    target_brand_id bigint;
    old_brand record;
begin
    -- Gunakan brand gabungan jika sebelumnya sudah pernah dibuat.
    select id
    into target_brand_id
    from public.brand
    where lower(trim(nama)) in ('vapely/wepe', 'wepe/vapely')
    order by id
    limit 1;

    -- Jika belum ada, gunakan ID Vapely sebagai brand utama.
    if target_brand_id is null then
        select id
        into target_brand_id
        from public.brand
        where lower(trim(nama)) = 'vapely'
        order by id
        limit 1;
    end if;

    -- Fallback jika Vapely tidak ada tetapi Wepe tersedia.
    if target_brand_id is null then
        select id
        into target_brand_id
        from public.brand
        where lower(trim(nama)) = 'wepe'
        order by id
        limit 1;
    end if;

    if target_brand_id is null then
        raise exception
            'Brand Vapely maupun Wepe tidak ditemukan.';
    end if;

    -- Jadikan satu brand utama yang aktif.
    update public.brand
    set
        nama = 'Vapely/Wepe',
        aktif = true
    where id = target_brand_id;

    -- Pindahkan seluruh barang dari brand lama ke brand utama,
    -- lalu nonaktifkan record brand lama.
    for old_brand in
        select id
        from public.brand
        where id <> target_brand_id
          and lower(trim(nama)) in (
              'vapely',
              'wepe',
              'vapely/wepe',
              'wepe/vapely'
          )
    loop
        update public.barang
        set brand_id = target_brand_id
        where brand_id = old_brand.id;

        update public.brand
        set aktif = false
        where id = old_brand.id;
    end loop;

    -- Seragamkan seluruh riwayat penjualan.
    update public.penjualan
    set brand = 'Vapely/Wepe'
    where lower(trim(coalesce(brand, ''))) in (
        'vapely',
        'wepe',
        'vapely/wepe',
        'wepe/vapely'
    );
end
$$;

commit;

-- Pemeriksaan hasil.
select
    id,
    nama,
    aktif
from public.brand
where lower(trim(nama)) in (
    'vapely',
    'wepe',
    'vapely/wepe',
    'wepe/vapely'
)
order by aktif desc, id;

select
    b.nama as brand,
    count(br.id) as jumlah_barang
from public.brand b
left join public.barang br
    on br.brand_id = b.id
where b.nama = 'Vapely/Wepe'
group by b.id, b.nama;

select
    brand,
    count(*) as jumlah_penjualan,
    coalesce(sum(qty * harga), 0) as total_penjualan
from public.penjualan
where brand = 'Vapely/Wepe'
group by brand;
