begin;
create extension if not exists pgtap with schema extensions;
select plan(2);
select has_table('public', 'players', 'players table exists');
select has_function('public', 'is_homegame_owner', ARRAY['uuid', 'uuid']);
select * from finish();
rollback;
