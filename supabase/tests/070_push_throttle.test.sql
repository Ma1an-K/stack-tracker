begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000003a0', 'thr@example.test', '{"username":"throttle_a"}');
insert into public.homegames (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000003a0', 'Throttle Game');

select ok(not has_function_privilege('anon', 'public.claim_push_slot(uuid, integer)', 'execute'), 'anon cannot claim a push slot');
select ok(not has_function_privilege('authenticated', 'public.claim_push_slot(uuid, integer)', 'execute'), 'authenticated cannot claim a push slot');
select ok(has_function_privilege('service_role', 'public.claim_push_slot(uuid, integer)', 'execute'), 'service_role can claim a push slot');
select ok(not has_table_privilege('authenticated', 'public.push_send_log', 'select'), 'clients cannot read the push log');

set local role service_role;
select is(public.claim_push_slot('00000000-0000-0000-0000-00000000f001', 60), true, 'first send is allowed');
select is(public.claim_push_slot('00000000-0000-0000-0000-00000000f001', 60), false, 'second send within the window is refused');
reset role;

update public.push_send_log set last_sent_at = now() - interval '2 minutes'
  where homegame_id = '00000000-0000-0000-0000-00000000f001';

set local role service_role;
select is(public.claim_push_slot('00000000-0000-0000-0000-00000000f001', 60), true, 'send is allowed again after the window');
reset role;

delete from public.homegames where id = '00000000-0000-0000-0000-00000000f001';
select is((select count(*)::int from public.push_send_log where homegame_id = '00000000-0000-0000-0000-00000000f001'), 0,
  'log row is removed with its homegame');

select * from finish();
rollback;
