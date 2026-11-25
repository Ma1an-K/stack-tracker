begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- The old dashboard trigger posted the whole auth.users row. It must be gone.
select ok(
  not exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'New user'),
  'old "New user" trigger is removed');

select has_function('public', 'notify_new_user_webhook', 'webhook trigger function exists');
select ok(
  (select prosecdef from pg_proc where oid = 'public.notify_new_user_webhook()'::regprocedure),
  'webhook function is SECURITY DEFINER');
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.notify_new_user_webhook()'::regprocedure),
  'webhook function pins an empty search_path');
select ok(not has_function_privilege('anon', 'public.notify_new_user_webhook()', 'execute'), 'anon cannot execute');
select ok(not has_function_privilege('authenticated', 'public.notify_new_user_webhook()', 'execute'), 'authenticated cannot execute');
select ok(
  exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'new_user_webhook' and tgenabled = 'O'),
  'new_user_webhook trigger is installed on auth.users');

-- Not configured (no vault secrets): sign-up still works and nothing is queued.
select lives_ok(
  $$insert into auth.users (id, email, raw_user_meta_data, encrypted_password)
    values ('00000000-0000-0000-0000-0000000000e1', 'nocfg@example.test', '{"username":"nocfg"}', 'HASH-SHOULD-NOT-LEAVE')$$,
  'sign-up works when the webhook is not configured');
select is(
  (select count(*)::int from net.http_request_queue where url = 'https://hooks.example.test/new-user'),
  0, 'nothing is queued without configuration');

-- Configured: exactly one request, minimal body, secret header, no password hash.
select vault.create_secret('https://hooks.example.test/new-user', 'new_user_webhook_url');
select vault.create_secret('test-secret-value', 'new_user_webhook_secret');

insert into auth.users (id, email, raw_user_meta_data, encrypted_password)
values ('00000000-0000-0000-0000-0000000000e2', 'cfg@example.test', '{"username":"cfg_user","display_name":"Cfg"}', 'HASH-SHOULD-NOT-LEAVE');

select is(
  (select count(*)::int from net.http_request_queue where url = 'https://hooks.example.test/new-user'),
  1, 'one request is queued for the new user');
select is(
  (select convert_from(body, 'utf8')::jsonb -> 'record'
     from net.http_request_queue where url = 'https://hooks.example.test/new-user'),
  jsonb_build_object(
    'id', '00000000-0000-0000-0000-0000000000e2',
    'email', 'cfg@example.test',
    'created_at', (select created_at from auth.users where id = '00000000-0000-0000-0000-0000000000e2'),
    'username', 'cfg_user',
    'display_name', 'Cfg'),
  'body carries only id, email, created_at, username, display_name');
select is(
  (select headers ->> 'X-Webhook-Secret' from net.http_request_queue where url = 'https://hooks.example.test/new-user'),
  'test-secret-value', 'request carries the shared-secret header');

select * from finish();
rollback;
