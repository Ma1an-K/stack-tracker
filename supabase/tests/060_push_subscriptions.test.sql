begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000002a0', 'pa@example.test', '{"username":"push_a"}'),
  ('00000000-0000-0000-0000-0000000002b0', 'pb@example.test', '{"username":"push_b"}');
insert into public.homegames (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000002a0', 'Push A'),
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-0000000002b0', 'Push B');
insert into public.homegame_members (homegame_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000002a0', 'owner'),
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-0000000002b0', 'owner')
  on conflict (homegame_id, user_id) do nothing;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000002a0","role":"authenticated"}';

select lives_ok(
  $$insert into public.push_subscriptions (user_id, homegame_id, endpoint, p256dh, auth)
    values ('00000000-0000-0000-0000-0000000002a0', '00000000-0000-0000-0000-00000000e001',
            'https://fcm.googleapis.com/fcm/send/abc', 'k', 'a')$$,
  'member can subscribe to own homegame');
select throws_ok(
  $$insert into public.push_subscriptions (user_id, homegame_id, endpoint, p256dh, auth)
    values ('00000000-0000-0000-0000-0000000002a0', '00000000-0000-0000-0000-00000000e002',
            'https://fcm.googleapis.com/fcm/send/def', 'k', 'a')$$,
  '42501', null, 'cannot subscribe to a homegame you are not in');
select throws_ok(
  $$insert into public.push_subscriptions (user_id, homegame_id, endpoint, p256dh, auth)
    values ('00000000-0000-0000-0000-0000000002a0', '00000000-0000-0000-0000-00000000e001',
            'http://example.test/hook', 'k', 'a')$$,
  '42501', null, 'endpoint must be https');
select throws_ok(
  $$insert into public.push_subscriptions (user_id, homegame_id, endpoint, p256dh, auth)
    values ('00000000-0000-0000-0000-0000000002b0', '00000000-0000-0000-0000-00000000e001',
            'https://fcm.googleapis.com/fcm/send/ghi', 'k', 'a')$$,
  '42501', null, 'cannot subscribe on behalf of someone else');

reset role;
select * from finish();
rollback;
