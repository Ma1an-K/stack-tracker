-- Security fix: tighten homegame_members INSERT policy.
--
-- The old policy "Users can join homegames" only checked `user_id = auth.uid()`,
-- placing no constraint on `homegame_id` or `role`. Any authenticated user could
-- therefore insert themselves as `owner`/`admin` into ANY homegame whose UUID
-- they knew (e.g. one returned by join_with_invite_code) — full takeover.
--
-- Legitimate inserts are only ever:
--   1. createHomegame() — the creator adds themselves as 'owner'.
--   2. Joining via the join_with_invite_code() RPC, which is SECURITY DEFINER
--      and runs as the table owner, so it bypasses RLS and is unaffected here.
--
-- So the direct-INSERT policy only needs to permit case 1.

DROP POLICY IF EXISTS "Users can join homegames" ON public.homegame_members;

CREATE POLICY "Creators can add themselves as owner"
ON public.homegame_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'owner'
  AND EXISTS (
    SELECT 1 FROM public.homegames h
    WHERE h.id = homegame_id
      AND h.user_id = auth.uid()
  )
);
