begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select ok(
  (select bool_and(public.generate_invite_code() ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$') from generate_series(1, 200)),
  'codes are 8 characters from the unambiguous alphabet');
select ok(
  (select count(distinct c) = 200 from (select public.generate_invite_code() c from generate_series(1, 200)) s),
  '200 codes are all different');
select ok(
  (select pg_get_functiondef('public.generate_invite_code()'::regprocedure) like '%gen_random_bytes%'
      and pg_get_functiondef('public.generate_invite_code()'::regprocedure) not like '%random()%'),
  'codes come from a cryptographic random source');

select * from finish();
rollback;
