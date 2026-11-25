-- Cap client error logging at 30 rows per user per rolling hour.
-- The client logger already de-duplicates and caps per page load, and swallows failures,
-- so real users never notice; this stops a scripted account from filling the table.

create or replace function public.error_log_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    return new;
  end if;

  -- Serialise inserts per user so concurrent requests can't slip past the count.
  perform pg_advisory_xact_lock(hashtextextended('error_log:' || new.user_id::text, 0));

  if (select count(*) from public.error_log
      where user_id = new.user_id
        and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'error_log rate limit reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.error_log_rate_limit() from public, anon, authenticated;

drop trigger if exists error_log_rate_limit on public.error_log;
create trigger error_log_rate_limit
  before insert on public.error_log
  for each row execute function public.error_log_rate_limit();

-- Supports the per-user count.
create index if not exists error_log_user_id_created_at_idx on public.error_log (user_id, created_at);
