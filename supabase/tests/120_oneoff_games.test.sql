begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_table('public', 'oneoff_games', 'oneoff_games table exists');

-- Seed: users A and B (profiles are created by the on_auth_user_created trigger).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000012a1', 'oa@example.test', '{"username":"oneoff_a"}'),
  ('00000000-0000-0000-0000-0000000012b1', 'ob@example.test', '{"username":"oneoff_b"}');

-- User A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000012a1","role":"authenticated"}';

select lives_ok(
  $$insert into public.oneoff_games (id, played_on, label, currency, players, payments, transfers)
    values ('00000000-0000-0000-0000-00000000f001', '2026-11-26', 'Dan''s place', 'AUD',
            '[{"id":"p1","name":"Dan","buy_in":50,"cash_out":80},{"id":"p2","name":"Sam","buy_in":50,"cash_out":20}]',
            '[]',
            '[{"from_id":"p2","to_id":"p1","amount":30}]')$$,
  'A can save a one-off game');
select throws_ok(
  $$insert into public.oneoff_games (user_id, played_on, currency, players, transfers)
    values ('00000000-0000-0000-0000-0000000012b1', '2026-11-26', 'AUD', '[]', '[]')$$,
  '42501', null, 'A cannot save a game as B');
select throws_ok(
  $$insert into public.oneoff_games (played_on, currency, players, transfers)
    values ('2026-11-26', 'AUD', null, '[]')$$,
  '23502', null, 'players is not null');
select throws_ok(
  $$insert into public.oneoff_games (played_on, currency, players, payments, transfers)
    values ('2026-11-26', 'AUD', '[]', null, '[]')$$,
  '23502', null, 'payments is not null');
select throws_ok(
  $$insert into public.oneoff_games (played_on, currency, players)
    values ('2026-11-26', 'AUD', '[]')$$,
  '23502', null, 'transfers is not null');

select is((select count(*)::int from public.oneoff_games), 1, 'A sees own game');
select is((select payments from public.oneoff_games), '[]'::jsonb, 'payments defaults to []');

-- Saved games are not editable: no UPDATE grant (and no update policy).
select throws_ok(
  $$update public.oneoff_games set label = 'edited'$$,
  '42501', null, 'A cannot update a saved game');

-- User B
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000012b1","role":"authenticated"}';
select is((select count(*)::int from public.oneoff_games), 0, 'B sees none of A''s games');
select lives_ok(
  $$delete from public.oneoff_games where id = '00000000-0000-0000-0000-00000000f001'$$,
  'B delete runs');

-- Superuser: A's row survived B's delete, and A's update changed nothing.
reset role;
select is(
  (select label from public.oneoff_games where id = '00000000-0000-0000-0000-00000000f001'),
  'Dan''s place', 'A''s update changed nothing and B''s delete affected 0 rows');
select is(
  (select user_id from public.oneoff_games where id = '00000000-0000-0000-0000-00000000f001'),
  '00000000-0000-0000-0000-0000000012a1'::uuid, 'user_id defaulted to the caller');

-- Anon has no access.
set local role anon;
select throws_ok(
  $$select count(*) from public.oneoff_games$$,
  '42501', null, 'anon cannot read saved games');
reset role;

-- User A deletes own game.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000012a1","role":"authenticated"}';
select lives_ok(
  $$delete from public.oneoff_games where id = '00000000-0000-0000-0000-00000000f001'$$,
  'A can delete own game');

reset role;
select is((select count(*)::int from public.oneoff_games), 0, 'A''s delete removed the row');

select * from finish();
rollback;
