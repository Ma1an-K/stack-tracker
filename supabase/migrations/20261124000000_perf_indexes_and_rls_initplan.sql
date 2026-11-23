-- Performance tuning (Supabase advisor lints).
--
-- Part A (unindexed_foreign_keys): index every foreign-key column that has no
-- covering index. Tables are small, so plain CREATE INDEX (not CONCURRENTLY)
-- keeps the whole script runnable inside one transaction.
--
-- Part B (auth_rls_initplan): RLS policies that call auth.uid() directly have
-- it re-evaluated for every row. Wrapping it as (select auth.uid()) lets the
-- planner evaluate it once per statement as an InitPlan. Semantics are
-- identical. ALTER POLICY keeps each policy's name, command, roles and
-- permissive flag; only USING / WITH CHECK are rewritten.
--
-- Idempotent: indexes use IF NOT EXISTS, and the policy rewrite only touches
-- auth.uid() calls not already wrapped (Postgres deparses the wrapped form as
-- "( SELECT auth.uid() AS uid)", which the lookbehind skips).

-- ---------------------------------------------------------------- Part A
create index if not exists error_log_homegame_id_idx               on public.error_log (homegame_id);
create index if not exists error_log_user_id_idx                   on public.error_log (user_id);
create index if not exists homegame_members_user_id_idx            on public.homegame_members (user_id);
create index if not exists homegames_user_id_idx                   on public.homegames (user_id);
create index if not exists invite_codes_created_by_idx             on public.invite_codes (created_by);
create index if not exists invite_codes_homegame_id_idx            on public.invite_codes (homegame_id);
create index if not exists live_sessions_started_by_idx            on public.live_sessions (started_by);
create index if not exists player_claim_requests_reviewed_by_idx   on public.player_claim_requests (reviewed_by);
create index if not exists player_claim_requests_user_id_idx       on public.player_claim_requests (user_id);
create index if not exists players_user_id_idx                     on public.players (user_id);
create index if not exists session_payments_from_player_id_idx     on public.session_payments (from_player_id);
create index if not exists session_payments_to_player_id_idx       on public.session_payments (to_player_id);
create index if not exists session_players_player_id_idx           on public.session_players (player_id);
create index if not exists sessions_homegame_id_idx                on public.sessions (homegame_id);

-- ---------------------------------------------------------------- Part B
do $$
declare
  -- an auth.uid() call that is not already the body of "SELECT auth.uid()"
  unwrapped constant text := '(?<!SELECT )auth\.uid\(\)';
  wrapped   constant text := '(select auth.uid())';
  old_path  text := current_setting('search_path');
  p         record;
  stmt      text;
  altered   int := 0;
begin
  -- pg_policies deparses expressions relative to search_path, and ALTER POLICY
  -- re-parses them under the same setting; pin it so both sides agree.
  perform set_config('search_path', 'public', true);

  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ unwrapped or coalesce(with_check, '') ~ unwrapped)
    order by tablename, policyname
  loop
    stmt := format('alter policy %I on public.%I', p.policyname, p.tablename);
    if p.qual is not null then
      stmt := stmt || format(' using (%s)', regexp_replace(p.qual, unwrapped, wrapped, 'g'));
    end if;
    if p.with_check is not null then
      stmt := stmt || format(' with check (%s)', regexp_replace(p.with_check, unwrapped, wrapped, 'g'));
    end if;
    execute stmt;
    altered := altered + 1;
  end loop;

  perform set_config('search_path', old_path, true);
  raise notice 'auth_rls_initplan: altered % polic(y/ies)', altered;
end
$$;
