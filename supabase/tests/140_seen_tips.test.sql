begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select has_column('public', 'profiles', 'seen_tips', 'profiles.seen_tips exists');
select col_type_is('public', 'profiles', 'seen_tips', 'text[]', 'seen_tips is text[]');
select col_not_null('public', 'profiles', 'seen_tips', 'seen_tips is NOT NULL');

-- Seed: users A and B (profiles are created by the on_auth_user_created trigger).
-- They are not co-members, so neither can see the other's profile.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000007a0', 'tips_a@example.test', '{"username":"tips_a"}'),
  ('00000000-0000-0000-0000-0000000007b0', 'tips_b@example.test', '{"username":"tips_b"}');

select is((select seen_tips from public.profiles where id = '00000000-0000-0000-0000-0000000007a0'),
  '{}'::text[], 'a profile created after the migration has seen no tips');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000007a0","role":"authenticated"}';

select lives_ok(
  $$update public.profiles set seen_tips = array_append(seen_tips, 'home-plus') where id = auth.uid()$$,
  'a user can mark a tip seen on their own profile');
-- Targets user B's row; RLS hides it, so this affects 0 rows.
update public.profiles set seen_tips = array_append(seen_tips, 'home-plus')
  where id = '00000000-0000-0000-0000-0000000007b0';
reset role;

select is((select seen_tips from public.profiles where id = '00000000-0000-0000-0000-0000000007a0'),
  array['home-plus']::text[], 'own seen_tips now holds the tip');
select is((select seen_tips from public.profiles where id = '00000000-0000-0000-0000-0000000007b0'),
  '{}'::text[], 'another user''s seen_tips is untouched');

select * from finish();
rollback;
