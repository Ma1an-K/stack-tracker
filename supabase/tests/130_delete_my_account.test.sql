begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- D owns game G1 (admin A joined after member M) and solo game G2, and is a member of O's game G3.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000006d0', 'd@example.test', '{"username":"del_d"}'),
  ('00000000-0000-0000-0000-0000000006a0', 'a@example.test', '{"username":"del_a"}'),
  ('00000000-0000-0000-0000-0000000006e0', 'm@example.test', '{"username":"del_m"}'),
  ('00000000-0000-0000-0000-0000000006f0', 'o@example.test', '{"username":"del_o"}');
insert into public.homegames (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000e601', '00000000-0000-0000-0000-0000000006d0', 'Shared'),
  ('00000000-0000-0000-0000-00000000e602', '00000000-0000-0000-0000-0000000006d0', 'Solo'),
  ('00000000-0000-0000-0000-00000000e603', '00000000-0000-0000-0000-0000000006f0', 'Other');
insert into public.homegame_members (homegame_id, user_id, role, created_at) values
  ('00000000-0000-0000-0000-00000000e601', '00000000-0000-0000-0000-0000000006d0', 'owner',  now() - interval '3 days'),
  ('00000000-0000-0000-0000-00000000e601', '00000000-0000-0000-0000-0000000006e0', 'member', now() - interval '2 days'),
  ('00000000-0000-0000-0000-00000000e601', '00000000-0000-0000-0000-0000000006a0', 'admin',  now() - interval '1 day'),
  ('00000000-0000-0000-0000-00000000e602', '00000000-0000-0000-0000-0000000006d0', 'owner',  now()),
  ('00000000-0000-0000-0000-00000000e603', '00000000-0000-0000-0000-0000000006f0', 'owner',  now() - interval '2 days'),
  ('00000000-0000-0000-0000-00000000e603', '00000000-0000-0000-0000-0000000006d0', 'member', now() - interval '1 day')
  on conflict (homegame_id, user_id) do update set role = excluded.role, created_at = excluded.created_at;
insert into public.players (id, homegame_id, name, user_id) values
  ('00000000-0000-0000-0000-00000000f601', '00000000-0000-0000-0000-00000000e601', 'D in Shared', '00000000-0000-0000-0000-0000000006d0'),
  ('00000000-0000-0000-0000-00000000f603', '00000000-0000-0000-0000-00000000e603', 'D in Other',  '00000000-0000-0000-0000-0000000006d0'),
  ('00000000-0000-0000-0000-00000000f604', '00000000-0000-0000-0000-00000000e603', 'O in Other',  '00000000-0000-0000-0000-0000000006f0');
insert into public.sessions (id, homegame_id, date) values
  ('00000000-0000-0000-0000-00000000a601', '00000000-0000-0000-0000-00000000e601', current_date);
-- D reviewed a claim in G3 (as if D had been an admin there).
insert into public.player_claim_requests (id, player_id, user_id, status, reviewed_by) values
  ('00000000-0000-0000-0000-00000000b601', '00000000-0000-0000-0000-00000000f604', '00000000-0000-0000-0000-0000000006f0',
   'approved', '00000000-0000-0000-0000-0000000006d0');
insert into public.push_subscriptions (user_id, homegame_id, endpoint, p256dh, auth) values
  ('00000000-0000-0000-0000-0000000006d0', '00000000-0000-0000-0000-00000000e601', 'https://push.example.test/d', 'k', 'a');
insert into public.oneoff_games (user_id, played_on, currency, players, transfers) values
  ('00000000-0000-0000-0000-0000000006d0', current_date, 'AUD',
   '[{"id":"p1","name":"Dan","buy_in":50,"cash_out":80},{"id":"p2","name":"Sam","buy_in":50,"cash_out":20}]', '[]');

-- Anonymous callers cannot run it.
set local role anon;
select throws_ok($$select public.delete_my_account()$$, '42501', null, 'anon cannot call delete_my_account');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000006d0","role":"authenticated"}';
select lives_ok($$select public.delete_my_account()$$, 'D deletes their own account');
reset role;

select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-0000000006d0'), 0, 'auth user is gone');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000006d0'), 0, 'profile is gone');
select is((select count(*)::int from public.homegame_members where user_id = '00000000-0000-0000-0000-0000000006d0'), 0, 'memberships are gone');

select is((select user_id from public.homegames where id = '00000000-0000-0000-0000-00000000e601'),
  '00000000-0000-0000-0000-0000000006a0'::uuid, 'shared game goes to the admin before the older member');
select is((select role::text from public.homegame_members
           where homegame_id = '00000000-0000-0000-0000-00000000e601' and user_id = '00000000-0000-0000-0000-0000000006a0'),
  'owner', 'new owner has the owner role');
select is((select role::text from public.homegame_members
           where homegame_id = '00000000-0000-0000-0000-00000000e601' and user_id = '00000000-0000-0000-0000-0000000006e0'),
  'member', 'other member is unchanged');
select is((select count(*)::int from public.sessions where homegame_id = '00000000-0000-0000-0000-00000000e601'), 1,
  'shared game keeps its sessions');

select is((select count(*)::int from public.homegames where id = '00000000-0000-0000-0000-00000000e602'), 0,
  'solo game is deleted');

select is((select user_id from public.homegames where id = '00000000-0000-0000-0000-00000000e603'),
  '00000000-0000-0000-0000-0000000006f0'::uuid, 'game D only belonged to keeps its owner');
select is((select user_id from public.players where id = '00000000-0000-0000-0000-00000000f603'), null::uuid,
  'D''s claimed player stays in the history, unclaimed');
select is((select reviewed_by from public.player_claim_requests where id = '00000000-0000-0000-0000-00000000b601'), null::uuid,
  'claim reviewed by D keeps its outcome without the reviewer');
select is((select count(*)::int from public.push_subscriptions where user_id = '00000000-0000-0000-0000-0000000006d0'), 0,
  'push subscriptions are gone');
select is((select count(*)::int from public.oneoff_games where user_id = '00000000-0000-0000-0000-0000000006d0'), 0,
  'one-off games are gone');

-- Signed-out callers are refused.
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated"}';
select throws_ok($$select public.delete_my_account()$$, null, 'Not signed in', 'a call without a user is refused');
reset role;

select * from finish();
rollback;
