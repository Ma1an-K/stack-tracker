begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public', 'error_log', 'error_log table exists');

-- Seed: users A and B (profiles are created by the on_auth_user_created trigger),
-- and a homegame owned by A with A as member.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test', '{"username":"errlog_a"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@example.test', '{"username":"errlog_b"}');
insert into public.homegames (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000a1', 'Err Game');
insert into public.homegame_members (homegame_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000a1', 'owner')
  on conflict (homegame_id, user_id) do nothing;

-- User A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok(
  $$insert into public.error_log (kind, message) values ('crash', 'no homegame')$$,
  'A can log an error with no homegame');
select lives_ok(
  $$insert into public.error_log (kind, message, homegame_id)
    values ('save_failed', 'own game', '00000000-0000-0000-0000-00000000c001')$$,
  'A can log an error for own homegame');
select throws_ok(
  $$insert into public.error_log (kind, message, user_id)
    values ('crash', 'spoof', '00000000-0000-0000-0000-0000000000b1')$$,
  '42501', null, 'A cannot log as B');
select throws_ok(
  $$insert into public.error_log (kind, message, created_at) values ('crash', 'future', '2099-01-01')$$,
  '42501', null, 'A cannot set created_at');
select throws_ok(
  $$insert into public.error_log (kind, message, fixed_at) values ('crash', 'prefixed', now())$$,
  '42501', null, 'A cannot set fixed_at');
select throws_ok(
  $$insert into public.error_log (kind, message, id) values ('crash', 'own id', gen_random_uuid())$$,
  '42501', null, 'A cannot set id');
select throws_ok(
  $$select count(*) from public.error_log$$,
  '42501', null, 'A cannot read the log');
select throws_ok(
  $$update public.error_log set fixed_at = now()$$,
  '42501', null, 'A cannot update the log');
select throws_ok(
  $$delete from public.error_log$$,
  '42501', null, 'A cannot delete from the log');
select throws_ok(
  $$insert into public.error_log (kind, message) values ('other', 'bad kind')$$,
  '23514', null, 'kind must be crash or save_failed');
select throws_ok(
  $$insert into public.error_log (kind, message) values ('crash', repeat('x', 2001))$$,
  '23514', null, 'message over 2000 chars is rejected');

-- User B
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select throws_ok(
  $$insert into public.error_log (kind, message, homegame_id)
    values ('crash', 'not a member', '00000000-0000-0000-0000-00000000c001')$$,
  '42501', null, 'B cannot log against a homegame B is not in');

-- Anon
reset request.jwt.claims;
set local role anon;
select throws_ok(
  $$insert into public.error_log (kind, message) values ('crash', 'anon')$$,
  '42501', null, 'anon cannot insert');

-- Back to superuser: only the two valid rows landed.
reset role;
select ok(has_table_privilege('service_role', 'public.error_log', 'select'), 'service_role can select');
select ok(has_table_privilege('service_role', 'public.error_log', 'update'), 'service_role can update');
select ok(has_table_privilege('service_role', 'public.error_log', 'delete'), 'service_role can delete');

select is((select count(*)::int from public.error_log), 2, 'only the two valid rows were stored');
select is((select count(*)::int from public.error_log where user_id = '00000000-0000-0000-0000-0000000000a1'), 2,
  'user_id defaulted to the caller');

-- service_role (admin tool): read, mark fixed, prune.
set local role service_role;
select lives_ok($$select count(*) from public.error_log$$, 'service_role can read the log');
select lives_ok($$update public.error_log set fixed_at = now()$$, 'service_role can set fixed_at');
select lives_ok($$delete from public.error_log where created_at < now() - interval '90 days'$$, 'service_role can prune old rows');
reset role;

select * from finish();
rollback;
