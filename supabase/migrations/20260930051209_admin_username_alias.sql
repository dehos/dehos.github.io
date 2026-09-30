alter table public.app_admins add column if not exists username text;
create unique index if not exists app_admins_username_lower_key
  on public.app_admins (lower(username)) where username is not null;
alter table public.app_admins add constraint app_admins_username_format
  check (username is null or username ~ '^[A-Za-z][A-Za-z0-9_]{1,31}$');
