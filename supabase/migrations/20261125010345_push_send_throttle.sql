-- Per-homegame throttle for the send-push-notification edge function.
-- Only the service role (the edge function) touches this table or function.

create table if not exists public.push_send_log (
  homegame_id uuid primary key references public.homegames(id) on delete cascade,
  last_sent_at timestamptz not null default now()
);

alter table public.push_send_log enable row level security;
revoke all on public.push_send_log from public, anon, authenticated;
grant select, insert, update, delete on public.push_send_log to service_role;

-- Returns true and records the send if no push went out for this homegame in the
-- last p_min_interval_seconds; otherwise returns false. Atomic under concurrency.
create or replace function public.claim_push_slot(p_homegame_id uuid, p_min_interval_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed boolean;
begin
  insert into public.push_send_log as l (homegame_id, last_sent_at)
  values (p_homegame_id, now())
  on conflict (homegame_id) do update
    set last_sent_at = now()
    where l.last_sent_at < now() - make_interval(secs => p_min_interval_seconds)
  returning true into v_claimed;
  return coalesce(v_claimed, false);
end;
$$;

revoke all on function public.claim_push_slot(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_push_slot(uuid, integer) to service_role;
