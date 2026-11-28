begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- Host setup adds the owner to their own crew as a player linked to their account.
-- Seed: homegame with owner O and member M.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000015a0', 'self_o@example.test', '{"username":"self_o"}'),
  ('00000000-0000-0000-0000-0000000015a1', 'self_m@example.test', '{"username":"self_m"}');
insert into public.homegames (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000f150', '00000000-0000-0000-0000-0000000015a0', 'Self Player Game');
insert into public.homegame_members (homegame_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000f150', '00000000-0000-0000-0000-0000000015a0', 'owner'),
  ('00000000-0000-0000-0000-00000000f150', '00000000-0000-0000-0000-0000000015a1', 'member')
  on conflict (homegame_id, user_id) do nothing;

-- ── As owner O ──
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000015a0","role":"authenticated"}';

select lives_ok(
  $$insert into public.players (homegame_id, name, user_id)
    values ('00000000-0000-0000-0000-00000000f150', 'Owner Self', auth.uid())$$,
  'an owner can add themselves as a player linked to their account');
reset role;

select is(
  (select user_id from public.players
    where homegame_id = '00000000-0000-0000-0000-00000000f150' and name = 'Owner Self'),
  '00000000-0000-0000-0000-0000000015a0'::uuid,
  'the owner''s player row is linked to the owner');

-- ── As member M ──
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000015a1","role":"authenticated"}';

select throws_ok(
  $$insert into public.players (homegame_id, name, user_id)
    values ('00000000-0000-0000-0000-00000000f150', 'Member Self', auth.uid())$$,
  '42501', null,
  'a member cannot add a player, even one linked to themselves');
reset role;

select is(
  (select count(*)::int from public.players
    where homegame_id = '00000000-0000-0000-0000-00000000f150' and name = 'Member Self'),
  0, 'no player row was created by the member');

select * from finish();
rollback;
