-- Invite codes from a cryptographic random source. Same alphabet and length as before.
-- 32 symbols divide 256 evenly, so byte % 32 is unbiased.
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  result text := '';
  i integer;
begin
  for i in 0..7 loop
    result := result || substr(chars, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;
