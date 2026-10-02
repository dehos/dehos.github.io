alter table public.barang add column if not exists tanggal_mulai date;
comment on column public.barang.tanggal_mulai is 'Tanggal efektif stok awal; NULL memakai tanggal created_at untuk data lama.';
notify pgrst, 'reload schema';