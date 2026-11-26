-- Checks for 20261124000000_perf_indexes_and_rls_initplan.sql:
-- foreign-key indexes exist, every auth.uid() in a public RLS policy is
-- wrapped exactly once as (select auth.uid()), and no policy was lost or had
-- its command / roles / permissive flag changed.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

-- 1. foreign-key indexes (14)
select has_index('public', 'error_log',             'error_log_homegame_id_idx',             'homegame_id');
select has_index('public', 'error_log',             'error_log_user_id_idx',                 'user_id');
select has_index('public', 'homegame_members',      'homegame_members_user_id_idx',          'user_id');
select has_index('public', 'homegames',             'homegames_user_id_idx',                 'user_id');
select has_index('public', 'invite_codes',          'invite_codes_created_by_idx',           'created_by');
select has_index('public', 'invite_codes',          'invite_codes_homegame_id_idx',          'homegame_id');
select has_index('public', 'live_sessions',         'live_sessions_started_by_idx',          'started_by');
select has_index('public', 'player_claim_requests', 'player_claim_requests_reviewed_by_idx', 'reviewed_by');
select has_index('public', 'player_claim_requests', 'player_claim_requests_user_id_idx',     'user_id');
select has_index('public', 'players',               'players_user_id_idx',                   'user_id');
select has_index('public', 'session_payments',      'session_payments_from_player_id_idx',   'from_player_id');
select has_index('public', 'session_payments',      'session_payments_to_player_id_idx',     'to_player_id');
select has_index('public', 'session_players',       'session_players_player_id_idx',         'player_id');
select has_index('public', 'sessions',              'sessions_homegame_id_idx',              'homegame_id');

-- 2. no unwrapped auth.uid() left (same detection as the migration)
select is(
  (select count(*) from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ '(?<!SELECT )auth\.uid\(\)'
        or coalesce(with_check, '') ~ '(?<!SELECT )auth\.uid\(\)')),
  0::bigint,
  'no public RLS policy calls auth.uid() unwrapped');

-- 4. idempotency: nothing was wrapped twice
select is(
  (select count(*) from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ '\( SELECT \( SELECT'
        or coalesce(with_check, '') ~ '\( SELECT \( SELECT')),
  0::bigint,
  'no public RLS policy has a double-wrapped auth.uid()');

-- 3. policy set unchanged: same count, and every pre-migration policy still
--    exists with the same command, roles and PERMISSIVE flag
select is(
  -- tables created after that migration are excluded
  (select count(*) from pg_policies where schemaname = 'public'
     and tablename not in ('oneoff_games')),
  43::bigint,
  'public schema still has 43 RLS policies');

select is(
  (select count(*) from (values
    ('error_log', 'Members can log their own errors', 'INSERT', '{authenticated}'),
    ('homegame_members', 'Creators can add themselves as owner', 'INSERT', '{authenticated}'),
    ('homegame_members', 'Members can view their homegame memberships', 'SELECT', '{authenticated}'),
    ('homegame_members', 'Owners can manage members', 'DELETE', '{authenticated}'),
    ('homegame_members', 'Owners can update member roles', 'UPDATE', '{authenticated}'),
    ('homegames', 'Authenticated users can create homegames', 'INSERT', '{authenticated}'),
    ('homegames', 'Members can view their homegames', 'SELECT', '{authenticated}'),
    ('homegames', 'Owners can delete their homegame', 'DELETE', '{public}'),
    ('homegames', 'Owners can update their homegames', 'UPDATE', '{authenticated}'),
    ('invite_codes', 'Members can view their homegame codes', 'SELECT', '{public}'),
    ('invite_codes', 'Owners can create invite codes', 'INSERT', '{public}'),
    ('invite_codes', 'Owners can delete invite codes', 'DELETE', '{public}'),
    ('invite_codes', 'Owners can update invite codes', 'UPDATE', '{public}'),
    ('live_sessions', 'Members can delete live sessions', 'DELETE', '{public}'),
    ('live_sessions', 'Members can insert live sessions', 'INSERT', '{public}'),
    ('live_sessions', 'Members can update live sessions', 'UPDATE', '{public}'),
    ('live_sessions', 'Members can view live sessions', 'SELECT', '{public}'),
    ('player_claim_requests', 'Members can request to claim players', 'INSERT', '{authenticated}'),
    ('player_claim_requests', 'Owners can update claim requests', 'UPDATE', '{authenticated}'),
    ('player_claim_requests', 'Users can cancel their pending requests', 'DELETE', '{authenticated}'),
    ('player_claim_requests', 'Users can view own and owners can view homegame claim requests', 'SELECT', '{authenticated}'),
    ('players', 'Members can view players', 'SELECT', '{public}'),
    ('players', 'Owners can delete players', 'DELETE', '{public}'),
    ('players', 'Owners can insert players', 'INSERT', '{public}'),
    ('players', 'Owners can update players', 'UPDATE', '{public}'),
    ('profiles', 'Users can insert their own profile', 'INSERT', '{public}'),
    ('profiles', 'Users can update their own profile', 'UPDATE', '{public}'),
    ('profiles', 'Users can view their own or co-member profiles', 'SELECT', '{public}'),
    ('push_subscriptions', 'Users can create own subscriptions', 'INSERT', '{authenticated}'),
    ('push_subscriptions', 'Users can delete own subscriptions', 'DELETE', '{authenticated}'),
    ('push_subscriptions', 'Users can view own subscriptions', 'SELECT', '{authenticated}'),
    ('session_payments', 'Members can delete session_payments', 'DELETE', '{public}'),
    ('session_payments', 'Members can insert session_payments', 'INSERT', '{public}'),
    ('session_payments', 'Members can update session_payments', 'UPDATE', '{public}'),
    ('session_payments', 'Members can view session_payments', 'SELECT', '{public}'),
    ('session_players', 'Members can insert session_players', 'INSERT', '{public}'),
    ('session_players', 'Members can view session_players', 'SELECT', '{public}'),
    ('session_players', 'Owners can delete session_players', 'DELETE', '{public}'),
    ('session_players', 'Owners can update session_players', 'UPDATE', '{public}'),
    ('sessions', 'Members can insert sessions', 'INSERT', '{public}'),
    ('sessions', 'Members can view sessions', 'SELECT', '{public}'),
    ('sessions', 'Owners can delete sessions', 'DELETE', '{public}'),
    ('sessions', 'Owners can update sessions', 'UPDATE', '{public}')
  ) as expected(tablename, policyname, cmd, roles)
  where not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = expected.tablename
      and p.policyname = expected.policyname
      and p.cmd = expected.cmd
      and p.roles::text = expected.roles
      and p.permissive = 'PERMISSIVE')),
  0::bigint,
  'every pre-migration policy exists with unchanged command, roles and permissive flag');

select * from finish();
rollback;
