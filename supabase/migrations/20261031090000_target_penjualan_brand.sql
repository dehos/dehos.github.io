-- Target penjualan per brand yang bisa diubah dari dashboard.
-- Satu baris per brand; target NULL berarti "tanpa target" (hanya dipantau).
-- Brand yang belum punya baris memakai nilai bawaan di script.js.
create table if not exists public.target_penjualan_brand (
  brand text primary key
    check (btrim(brand) <> '' and char_length(brand) <= 60),
  target numeric
    check (target is null or (target >= 0 and target <= 1000000000000)),
  updated_at timestamptz not null default now()
);

alter table public.target_penjualan_brand enable row level security;

revoke all on table public.target_penjualan_brand from anon;
grant select, insert, update, delete on table public.target_penjualan_brand to authenticated;

drop policy if exists "Admin can manage target_penjualan_brand" on public.target_penjualan_brand;
create policy "Admin can manage target_penjualan_brand"
  on public.target_penjualan_brand
  for all
  to authenticated
  using (
    exists (
      select 1 from public.app_admins a
      where a.email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    )
  )
  with check (
    exists (
      select 1 from public.app_admins a
      where a.email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    )
  );

notify pgrst, 'reload schema';
