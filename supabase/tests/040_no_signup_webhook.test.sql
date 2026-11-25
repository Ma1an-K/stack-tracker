begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- No trigger on auth.users may send user rows to an external webhook.
select ok(
  not exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'New user'),
  'old "New user" webhook trigger is removed');
select ok(
  not exists (select 1 from pg_trigger t join pg_proc p on p.oid = t.tgfoid
              where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal
                and p.proname in ('http_request', 'notify_new_user_webhook')),
  'no webhook trigger remains on auth.users');

-- Profile creation on sign-up still works.
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created'),
  'profile trigger is still installed');
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000e1', 'signup@example.test', '{"username":"signup_ok"}');
select is((select username from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'), 'signup_ok',
  'sign-up still creates a profile');

select * from finish();
rollback;
