begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Privileges: service_role only, for each function.
select ok(not has_function_privilege('anon', 'public.admin_overview()', 'execute'), 'anon cannot run admin_overview');
select ok(not has_function_privilege('authenticated', 'public.admin_overview()', 'execute'), 'authenticated cannot run admin_overview');
select ok(has_function_privilege('service_role', 'public.admin_overview()', 'execute'), 'service_role can run admin_overview');
select ok(not has_function_privilege('anon', 'public.admin_homegames()', 'execute'), 'anon cannot run admin_homegames');
select ok(not has_function_privilege('authenticated', 'public.admin_homegames()', 'execute'), 'authenticated cannot run admin_homegames');
select ok(has_function_privilege('service_role', 'public.admin_homegames()', 'execute'), 'service_role can run admin_homegames');
select ok(not has_function_privilege('anon', 'public.admin_recent_activity(integer)', 'execute'), 'anon cannot run admin_recent_activity');
select ok(not has_function_privilege('authenticated', 'public.admin_recent_activity(integer)', 'execute'), 'authenticated cannot run admin_recent_activity');
select ok(has_function_privilege('service_role', 'public.admin_recent_activity(integer)', 'execute'), 'service_role can run admin_recent_activity');
select ok(not has_function_privilege('anon', 'public.admin_errors(text)', 'execute'), 'anon cannot run admin_errors');
select ok(not has_function_privilege('authenticated', 'public.admin_errors(text)', 'execute'), 'authenticated cannot run admin_errors');
select ok(has_function_privilege('service_role', 'public.admin_errors(text)', 'execute'), 'service_role can run admin_errors');

-- Seed
insert into auth.users (id, email, raw_user_meta_data, created_at, last_sign_in_at) values
  ('00000000-0000-0000-0000-0000000000a2', 'adm@example.test', '{"username":"adm_a"}', now(), now());
insert into public.homegames (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000a2', 'Admin Game');
insert into public.homegame_members (homegame_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000a2', 'owner')
  on conflict (homegame_id, user_id) do nothing;
insert into public.sessions (homegame_id, date) values
  ('00000000-0000-0000-0000-00000000c002', current_date);
insert into public.live_sessions (homegame_id) values
  ('00000000-0000-0000-0000-00000000c002');
insert into public.error_log (user_id, homegame_id, kind, message, fixed_at) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000c002', 'crash', 'open one', null),
  ('00000000-0000-0000-0000-0000000000a2', null, 'save_failed', 'fixed one', now());

set local role service_role;

select is((select admin_overview()->>'live_now'), '1', 'overview live_now = 1');
select is((select admin_overview()->>'errors_open'), '1', 'overview errors_open = 1');

select ok(
  exists (select 1 from admin_homegames() h
          where h.id = '00000000-0000-0000-0000-00000000c002'
            and h.live_now and h.sessions_30d = 1 and h.owner like 'adm_a#%'),
  'admin_homegames returns the seeded game with live_now and sessions_30d');

select ok(
  (select jsonb_array_length(admin_recent_activity(30)->'signups') >= 1
      and jsonb_array_length(admin_recent_activity(30)->'homegames') >= 1
      and jsonb_array_length(admin_recent_activity(30)->'sessions') >= 1
      and jsonb_array_length(admin_recent_activity(30)->'joins') >= 1),
  'admin_recent_activity returns the four arrays');

select is((select count(*)::int from admin_errors('open')), 1, 'admin_errors open = 1');
select is((select count(*)::int from admin_errors('all')), 2, 'admin_errors all = 2');
select throws_ok($$select * from admin_errors('bogus')$$, null, null, 'admin_errors rejects bad status');

reset role;
select * from finish();
rollback;
