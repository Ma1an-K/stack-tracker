begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Seed: homegame with owner O, admin A, members M1 and M2.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000001a0', 'o@example.test',  '{"username":"roles_o"}'),
  ('00000000-0000-0000-0000-0000000001a1', 'a@example.test',  '{"username":"roles_a"}'),
  ('00000000-0000-0000-0000-0000000001a2', 'm1@example.test', '{"username":"roles_m1"}'),
  ('00000000-0000-0000-0000-0000000001a3', 'm2@example.test', '{"username":"roles_m2"}');
insert into public.homegames (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000001a0', 'Roles Game');
insert into public.homegame_members (homegame_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000001a0', 'owner'),
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000001a1', 'admin'),
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000001a2', 'member'),
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-0000000001a3', 'member')
  on conflict (homegame_id, user_id) do nothing;

-- ── As admin A ──
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000001a1","role":"authenticated"}';

delete from public.homegame_members
  where homegame_id = '00000000-0000-0000-0000-00000000d001'
    and user_id = '00000000-0000-0000-0000-0000000001a0';
update public.homegame_members set role = 'owner'
  where homegame_id = '00000000-0000-0000-0000-00000000d001'
    and user_id = '00000000-0000-0000-0000-0000000001a2';
update public.homegame_members set role = 'admin'
  where homegame_id = '00000000-0000-0000-0000-00000000d001'
    and user_id = '00000000-0000-0000-0000-0000000001a3';

reset role;
select is(
  (select count(*)::int from public.homegame_members
    where homegame_id = '00000000-0000-0000-0000-00000000d001' and role = 'owner'),
  1, 'admin cannot remove the owner or create a new owner');
select is(
  (select role::text from public.homegame_members
    where homegame_id = '00000000-0000-0000-0000-00000000d001' and user_id = '00000000-0000-0000-0000-0000000001a0'),
  'owner', 'owner row is untouched');
select is(
  (select role::text from public.homegame_members
    where homegame_id = '00000000-0000-0000-0000-00000000d001' and user_id = '00000000-0000-0000-0000-0000000001a2'),
  'member', 'admin cannot promote a member to owner');
select is(
  (select role::text from public.homegame_members
    where homegame_id = '00000000-0000-0000-0000-00000000d001' and user_id = '00000000-0000-0000-0000-0000000001a3'),
  'member', 'admin cannot promote a member to admin');

-- Admin can still remove an ordinary member (UI allows it).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000001a1","role":"authenticated"}';
delete from public.homegame_members
  where homegame_id = '00000000-0000-0000-0000-00000000d001'
    and user_id = '00000000-0000-0000-0000-0000000001a3';
reset role;
select is(
  (select count(*)::int from public.homegame_members
    where homegame_id = '00000000-0000-0000-0000-00000000d001' and user_id = '00000000-0000-0000-0000-0000000001a3'),
  0, 'admin can still remove a member');

-- ── As owner O ──
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000001a0","role":"authenticated"}';

update public.homegame_members set role = 'admin'
  where homegame_id = '00000000-0000-0000-0000-00000000d001'
    and user_id = '00000000-0000-0000-0000-0000000001a2';
reset role;
select is(
  (select role::text from public.homegame_members
    where homegame_id = '00000000-0000-0000-0000-00000000d001' and user_id = '00000000-0000-0000-0000-0000000001a2'),
  'admin', 'owner can promote a member to admin');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000001a0","role":"authenticated"}';
update public.homegame_members set role = 'member'
  where homegame_id = '00000000-0000-0000-0000-00000000d001'
    and user_id = '00000000-0000-0000-0000-0000000001a1';
reset role;
select is(
  (select role::text from public.homegame_members
    where homegame_id = '00000000-0000-0000-0000-00000000d001' and user_id = '00000000-0000-0000-0000-0000000001a1'),
  'member', 'owner can demote an admin');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000001a0","role":"authenticated"}';
select throws_ok(
  $$update public.homegame_members set role = 'owner'
     where homegame_id = '00000000-0000-0000-0000-00000000d001'
       and user_id = '00000000-0000-0000-0000-0000000001a2'$$,
  '42501', null, 'owner cannot create a second owner through role edits');
delete from public.homegame_members
  where homegame_id = '00000000-0000-0000-0000-00000000d001'
    and user_id = '00000000-0000-0000-0000-0000000001a2';
reset role;
select is(
  (select count(*)::int from public.homegame_members
    where homegame_id = '00000000-0000-0000-0000-00000000d001' and user_id = '00000000-0000-0000-0000-0000000001a2'),
  0, 'owner can remove a member');

-- Helper is locked down.
select ok(not has_function_privilege('anon', 'public.has_owner_role(uuid, uuid)', 'execute'), 'anon cannot run has_owner_role');
select ok(
  (select prosecdef from pg_proc where oid = 'public.has_owner_role(uuid, uuid)'::regprocedure),
  'has_owner_role is SECURITY DEFINER');

-- Only the role column is updatable by clients.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000001a0","role":"authenticated"}';
select throws_ok(
  $$update public.homegame_members set user_id = '00000000-0000-0000-0000-0000000001a3'
     where homegame_id = '00000000-0000-0000-0000-00000000d001'
       and user_id = '00000000-0000-0000-0000-0000000001a1'$$,
  '42501', null, 'owner cannot move a membership to another user');
select throws_ok(
  $$update public.homegame_members set homegame_id = '00000000-0000-0000-0000-00000000d001'
     where homegame_id = '00000000-0000-0000-0000-00000000d001'
       and user_id = '00000000-0000-0000-0000-0000000001a1'$$,
  '42501', null, 'owner cannot change a membership homegame');
reset role;

select * from finish();
rollback;
