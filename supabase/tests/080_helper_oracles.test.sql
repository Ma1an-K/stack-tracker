begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- A owns game A. B and C share game B.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000004a0', 'ha@example.test', '{"username":"helper_a"}'),
  ('00000000-0000-0000-0000-0000000004b0', 'hb@example.test', '{"username":"helper_b"}'),
  ('00000000-0000-0000-0000-0000000004c0', 'hc@example.test', '{"username":"helper_c"}');
insert into public.homegames (id, user_id, name) values
  ('00000000-0000-0000-0000-00000000a401', '00000000-0000-0000-0000-0000000004a0', 'Helper A'),
  ('00000000-0000-0000-0000-00000000a402', '00000000-0000-0000-0000-0000000004b0', 'Helper B');
insert into public.homegame_members (homegame_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000a401', '00000000-0000-0000-0000-0000000004a0', 'owner'),
  ('00000000-0000-0000-0000-00000000a402', '00000000-0000-0000-0000-0000000004b0', 'owner'),
  ('00000000-0000-0000-0000-00000000a402', '00000000-0000-0000-0000-0000000004c0', 'member')
  on conflict (homegame_id, user_id) do nothing;
insert into public.invite_codes (homegame_id, code, created_by) values
  ('00000000-0000-0000-0000-00000000a402', 'HELPRTST', '00000000-0000-0000-0000-0000000004b0');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000004a0","role":"authenticated"}';

select is(public.is_homegame_member('00000000-0000-0000-0000-0000000004a0', '00000000-0000-0000-0000-00000000a401'), true,
  'helper still answers for the caller');
select is(public.is_homegame_owner('00000000-0000-0000-0000-0000000004a0', '00000000-0000-0000-0000-00000000a401'), true,
  'owner helper still answers for the caller');
select is(public.is_homegame_member('00000000-0000-0000-0000-0000000004b0', '00000000-0000-0000-0000-00000000a402'), false,
  'is_homegame_member does not reveal other users');
select is(public.is_homegame_owner('00000000-0000-0000-0000-0000000004b0', '00000000-0000-0000-0000-00000000a402'), false,
  'is_homegame_owner does not reveal other users');
select is(public.shares_homegame_with('00000000-0000-0000-0000-0000000004b0', '00000000-0000-0000-0000-0000000004c0'), false,
  'shares_homegame_with does not reveal other users');

-- RLS built on the helpers still works for the caller.
select is((select count(*)::int from public.homegames where id = '00000000-0000-0000-0000-00000000a401'), 1,
  'caller still sees own homegame through RLS');
select is((select count(*)::int from public.homegames where id = '00000000-0000-0000-0000-00000000a402'), 0,
  'caller does not see another homegame');
reset role;

select ok(not has_function_privilege('anon', 'public.lookup_invite_code(text)', 'execute'), 'anon cannot look up invite codes');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000004c0","role":"authenticated"}';
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000004b0'), 1,
  'co-members still see each other''s profiles');
reset role;

select * from finish();
rollback;
