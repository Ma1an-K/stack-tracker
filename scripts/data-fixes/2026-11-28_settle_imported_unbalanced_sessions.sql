-- Data fix (issue #13): mark the 24 imported unbalanced Sessions Settled.
--
-- Why: these Sessions were imported into the "Bialik Poker" Homegame
-- (1d02e1ea-503c-4151-9383-d598221fb9ac) on 2026-02-03, all dated 2025-10-04.
-- Their total Cash-outs don't equal their total Buy-ins to the cent, so no
-- Settlement can be worked out for them and they would sit unsettled forever.
-- The owner confirmed the money for these games was squared up long ago.
--
-- The ids come from a read-only query against the live database on 2026-11-28
-- (Sessions whose sum(cash_out) <> sum(buy_in), rounded to the cent). They are
-- listed one by one on purpose: this is not a rule like "every unbalanced Session".
--
-- Expected: exactly 24 rows updated. The DO block aborts the whole transaction
-- if any other count comes back, so nothing changes in that case.
--
-- NOT a migration. It lives outside supabase/migrations so it is never applied
-- automatically. The owner applies it by hand (SQL editor or
-- `supabase db query --linked -f <this file>`).

begin;

do $$
declare
  updated_count integer;
begin
  update public.sessions
  set is_settled = true
  where is_settled is not true
    and id in (
    'b7171db0-ac47-4827-8424-13d2734bd4ac', -- created 2026-02-03 10:40:42.119316+00, cash-outs minus buy-ins -273.00
    '13e9b183-959e-49e3-9a72-9f0bebb7c94f', -- created 2026-02-03 10:40:42.466372+00, cash-outs minus buy-ins 99.50
    'b43adcf0-06b3-4e8c-81e5-72519d9ec59e', -- created 2026-02-03 10:40:43.058555+00, cash-outs minus buy-ins 182.50
    'a1d3be6a-f415-4146-9a02-700de654c4d3', -- created 2026-02-03 10:40:43.383351+00, cash-outs minus buy-ins 109.50
    'dd597f35-4e78-4e12-bbcd-97a6c15ac61c', -- created 2026-02-03 10:40:43.701175+00, cash-outs minus buy-ins 100.50
    '3ea13480-dc93-4024-8419-1ad80a1983e0', -- created 2026-02-03 10:40:44.022733+00, cash-outs minus buy-ins -216.00
    '4e90b9af-dba6-427c-a878-a21779b1c633', -- created 2026-02-03 10:40:44.391385+00, cash-outs minus buy-ins -31.50
    '0d70f0db-6e1f-4fef-b747-ce7326fb22a8', -- created 2026-02-03 10:40:44.717072+00, cash-outs minus buy-ins -270.50
    '9a905cd3-2a99-40fc-91aa-8e4eb4273ecf', -- created 2026-02-03 10:40:45.049917+00, cash-outs minus buy-ins 22.00
    'ceb7391d-b4af-4f0c-9cc5-59d5d314ef96', -- created 2026-02-03 10:40:45.371732+00, cash-outs minus buy-ins 38.00
    '9e903e31-13c4-40a4-8382-27ddfccb7d17', -- created 2026-02-03 10:40:45.702568+00, cash-outs minus buy-ins -93.00
    '4eb49955-a190-4d96-adcd-0f5e8339ab95', -- created 2026-02-03 10:40:46.047845+00, cash-outs minus buy-ins 198.00
    'a859a60f-6f05-4f66-afb2-21d5fe9962e9', -- created 2026-02-03 10:40:46.364018+00, cash-outs minus buy-ins -96.50
    'a6dc9f24-0eba-472f-90c7-3b5f02d7bdca', -- created 2026-02-03 10:40:46.682334+00, cash-outs minus buy-ins 563.50
    '33b8d738-0e5f-40cd-9954-3e82bd0ffe6c', -- created 2026-02-03 10:40:47.008488+00, cash-outs minus buy-ins -156.00
    '20c29b5d-5e5a-4a23-8c78-0b2bd4a5e33f', -- created 2026-02-03 10:40:47.342451+00, cash-outs minus buy-ins 118.00
    'ebf56ce6-afd4-4f44-b663-be52fa2edc83', -- created 2026-02-03 10:40:47.665794+00, cash-outs minus buy-ins 117.00
    '06835f87-987d-491b-813c-d531fc3c84b2', -- created 2026-02-03 10:40:47.989866+00, cash-outs minus buy-ins -183.00
    '018df326-327b-4195-8794-8a9453044bce', -- created 2026-02-03 10:40:48.309443+00, cash-outs minus buy-ins -93.00
    '45884185-f257-4cc1-bab9-e8145924fcd4', -- created 2026-02-03 10:40:48.664497+00, cash-outs minus buy-ins -79.50
    'ffd54371-1b1e-4d36-b6f8-2d22a63b0071', -- created 2026-02-03 10:40:49.011249+00, cash-outs minus buy-ins 76.00
    '1d359284-1c63-4249-afe3-454cf434674d', -- created 2026-02-03 10:40:49.339449+00, cash-outs minus buy-ins -257.50
    '2e572d2e-a3f8-48ac-a527-a680bd602d45', -- created 2026-02-03 10:40:49.666175+00, cash-outs minus buy-ins 5.50
    'e81332ea-f8a9-4454-bb0e-600ea6c297c5'  -- created 2026-02-03 10:40:49.997012+00, cash-outs minus buy-ins 120.00
    );

  get diagnostics updated_count = row_count;
  if updated_count <> 24 then
    raise exception 'Expected to settle 24 Sessions, would have settled %. Rolled back.', updated_count;
  end if;
end
$$;

commit;

-- Read-only check, run after applying. Expect a single row:
--   listed = 24, listed_settled = 24, unbalanced_unsettled = 0,
--   other_changed_today = 0 (no Session outside the list has an updated_at on
--   the day it was applied; change the date if it is applied on another day.
--   Ordinary app use that day also counts here, so look at any such rows
--   before blaming the script).
--
-- with listed(id) as (
--   values
--     ('b7171db0-ac47-4827-8424-13d2734bd4ac'::uuid),
--     ('13e9b183-959e-49e3-9a72-9f0bebb7c94f'::uuid),
--     ('b43adcf0-06b3-4e8c-81e5-72519d9ec59e'::uuid),
--     ('a1d3be6a-f415-4146-9a02-700de654c4d3'::uuid),
--     ('dd597f35-4e78-4e12-bbcd-97a6c15ac61c'::uuid),
--     ('3ea13480-dc93-4024-8419-1ad80a1983e0'::uuid),
--     ('4e90b9af-dba6-427c-a878-a21779b1c633'::uuid),
--     ('0d70f0db-6e1f-4fef-b747-ce7326fb22a8'::uuid),
--     ('9a905cd3-2a99-40fc-91aa-8e4eb4273ecf'::uuid),
--     ('ceb7391d-b4af-4f0c-9cc5-59d5d314ef96'::uuid),
--     ('9e903e31-13c4-40a4-8382-27ddfccb7d17'::uuid),
--     ('4eb49955-a190-4d96-adcd-0f5e8339ab95'::uuid),
--     ('a859a60f-6f05-4f66-afb2-21d5fe9962e9'::uuid),
--     ('a6dc9f24-0eba-472f-90c7-3b5f02d7bdca'::uuid),
--     ('33b8d738-0e5f-40cd-9954-3e82bd0ffe6c'::uuid),
--     ('20c29b5d-5e5a-4a23-8c78-0b2bd4a5e33f'::uuid),
--     ('ebf56ce6-afd4-4f44-b663-be52fa2edc83'::uuid),
--     ('06835f87-987d-491b-813c-d531fc3c84b2'::uuid),
--     ('018df326-327b-4195-8794-8a9453044bce'::uuid),
--     ('45884185-f257-4cc1-bab9-e8145924fcd4'::uuid),
--     ('ffd54371-1b1e-4d36-b6f8-2d22a63b0071'::uuid),
--     ('1d359284-1c63-4249-afe3-454cf434674d'::uuid),
--     ('2e572d2e-a3f8-48ac-a527-a680bd602d45'::uuid),
--     ('e81332ea-f8a9-4454-bb0e-600ea6c297c5'::uuid)
-- ),
-- unbalanced as (
--   select sp.session_id as id
--   from public.session_players sp
--   group by sp.session_id
--   having round(sum(sp.cash_out)::numeric, 2) <> round(sum(sp.buy_in)::numeric, 2)
-- )
-- select
--   (select count(*) from public.sessions s join listed l using (id)) as listed,
--   (select count(*) from public.sessions s join listed l using (id) where s.is_settled) as listed_settled,
--   (select count(*) from public.sessions s join unbalanced u using (id) where not s.is_settled) as unbalanced_unsettled,
--   (select count(*) from public.sessions s
--     where s.id not in (select id from listed)
--       and s.updated_at::date = date '2026-11-28') as other_changed_today;
