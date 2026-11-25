begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- Game A: owner OA, member RA requests player PA. Game B: owner OB, member RB requests player PB.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000005a0', 'oa@example.test', '{"username":"claim_oa"}'),
  ('00000000-0000-0000-0000-0000000005a1', 'ra@example.test', '{"username":"claim_ra"}'),
  ('00000000-0000-0000-0000-0000000005b0', 'ob@example.test', '{"username":"claim_ob"}'),
  ('00000000-0000-0000-0000-0000000005b1', 'rb@example.test', '{"username":"claim_rb"}');
insert into public.homegames (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000b501', '00000000-0000-0000-0000-0000000005a0', 'Claim A'),
  ('00000000-0000-0000-0000-00000000b502', '00000000-0000-0000-0000-0000000005b0', 'Claim B');
insert into public.homegame_members (homegame_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000b501', '00000000-0000-0000-0000-0000000005a0', 'owner'),
  ('00000000-0000-0000-0000-00000000b501', '00000000-0000-0000-0000-0000000005a1', 'member'),
  ('00000000-0000-0000-0000-00000000b502', '00000000-0000-0000-0000-0000000005b0', 'owner'),
  ('00000000-0000-0000-0000-00000000b502', '00000000-0000-0000-0000-0000000005b1', 'member')
  on conflict (homegame_id, user_id) do nothing;
insert into public.players (id, homegame_id, name) values
  ('00000000-0000-0000-0000-00000000c5a1', '00000000-0000-0000-0000-00000000b501', 'Player A'),
  ('00000000-0000-0000-0000-00000000c5a2', '00000000-0000-0000-0000-00000000b501', 'Player A2'),
  ('00000000-0000-0000-0000-00000000c5b1', '00000000-0000-0000-0000-00000000b502', 'Player B');
insert into public.player_claim_requests (id, player_id, user_id) values
  ('00000000-0000-0000-0000-00000000d5a1', '00000000-0000-0000-0000-00000000c5a1', '00000000-0000-0000-0000-0000000005a1'),
  ('00000000-0000-0000-0000-00000000d5b1', '00000000-0000-0000-0000-00000000c5b1', '00000000-0000-0000-0000-0000000005b1');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000005a0","role":"authenticated"}';

select throws_ok(
  $$select public.approve_claim('00000000-0000-0000-0000-00000000d5b1', '00000000-0000-0000-0000-00000000c5a1', '00000000-0000-0000-0000-0000000005a1')$$,
  null, null, 'owner A cannot approve a request from homegame B');
select throws_ok(
  $$select public.approve_claim('00000000-0000-0000-0000-00000000d5a1', '00000000-0000-0000-0000-00000000c5a2', '00000000-0000-0000-0000-0000000005a1')$$,
  null, null, 'request must match the player being linked');
select throws_ok(
  $$select public.approve_claim('00000000-0000-0000-0000-00000000d5a1', '00000000-0000-0000-0000-00000000c5a1', '00000000-0000-0000-0000-0000000005b1')$$,
  null, null, 'player can only be linked to the requester');
select lives_ok(
  $$select public.approve_claim('00000000-0000-0000-0000-00000000d5a1', '00000000-0000-0000-0000-00000000c5a1', '00000000-0000-0000-0000-0000000005a1')$$,
  'owner A approves the matching request');
reset role;

select is((select status::text from public.player_claim_requests where id = '00000000-0000-0000-0000-00000000d5b1'), 'pending',
  'homegame B request is untouched');
select is((select status::text from public.player_claim_requests where id = '00000000-0000-0000-0000-00000000d5a1'), 'approved',
  'matching request is approved');
select is((select user_id from public.players where id = '00000000-0000-0000-0000-00000000c5a1'),
  '00000000-0000-0000-0000-0000000005a1'::uuid, 'player is linked to the requester');

select * from finish();
rollback;
