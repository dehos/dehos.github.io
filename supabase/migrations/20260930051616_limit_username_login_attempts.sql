create table if not exists public.app_login_attempts (
  username text primary key,
  window_started timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.app_login_attempts enable row level security;
revoke all on public.app_login_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.app_login_attempts to service_role;

create or replace function public.check_username_login_rate(p_username text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  attempt_count integer;
begin
  insert into public.app_login_attempts as limit_row (username, window_started, attempts)
  values (lower(p_username), now(), 1)
  on conflict (username) do update
  set attempts = case
    when limit_row.window_started < now() - interval '15 minutes' then 1
    else limit_row.attempts + 1
  end,
  window_started = case
    when limit_row.window_started < now() - interval '15 minutes' then now()
    else limit_row.window_started
  end
  returning attempts into attempt_count;
  return attempt_count <= 10;
end;
$$;
revoke all on function public.check_username_login_rate(text) from public, anon, authenticated;
grant execute on function public.check_username_login_rate(text) to service_role;
