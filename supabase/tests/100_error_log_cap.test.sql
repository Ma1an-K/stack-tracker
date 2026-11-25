begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000006a0', 'cap@example.test', '{"username":"cap_a"}'),
  ('00000000-0000-0000-0000-0000000006b0', 'cap2@example.test', '{"username":"cap_b"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000006a0","role":"authenticated"}';

select lives_ok(
  $$insert into public.error_log (kind, message) select 'crash', 'n' || g from generate_series(1, 30) g$$,
  'a user can log 30 errors in an hour');
select throws_ok(
  $$insert into public.error_log (kind, message) values ('crash', 'one too many')$$,
  'P0001', null, 'the 31st error in an hour is refused');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000006b0","role":"authenticated"}';
select lives_ok(
  $$insert into public.error_log (kind, message) values ('crash', 'other user')$$,
  'the cap is per user');
reset role;

select ok(not has_function_privilege('authenticated', 'public.error_log_rate_limit()', 'execute'),
  'clients cannot call the rate-limit function directly');

select * from finish();
rollback;
