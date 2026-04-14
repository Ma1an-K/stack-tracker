-- Security fixes: player_claim_requests RLS + atomic approve_claim RPC

-- ── Fix 1: player_claim_requests SELECT policy ─────────────────────────────
-- Old policy let any homegame member see ALL claim requests for that homegame,
-- leaking other users' identity (user_id + profile) to non-owners.
-- New policy: users see only their own requests; owners see all requests for
-- players in their homegames.

DROP POLICY IF EXISTS "Members can view claim requests" ON public.player_claim_requests;

CREATE POLICY "Users can view own and owners can view homegame claim requests"
ON public.player_claim_requests
FOR SELECT
TO authenticated
USING (
  -- Always see your own requests
  user_id = auth.uid()
  OR
  -- Owners see all requests for players in their homegames
  player_id IN (
    SELECT id FROM public.players
    WHERE is_homegame_owner(auth.uid(), homegame_id)
  )
);


-- ── Fix 2: Atomic approve_claim RPC ────────────────────────────────────────
-- Replaces the two-step client-side approve (update request + update player)
-- with a single atomic transaction. Runs as SECURITY DEFINER so it can bypass
-- RLS internally after verifying the caller is an owner.

CREATE OR REPLACE FUNCTION public.approve_claim(
  p_request_id UUID,
  p_player_id  UUID,
  p_target_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_homegame_id UUID;
BEGIN
  -- Resolve the homegame this player belongs to
  SELECT homegame_id INTO v_homegame_id
  FROM public.players
  WHERE id = p_player_id;

  IF v_homegame_id IS NULL THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  -- Verify the calling user is an owner of that homegame
  IF NOT public.is_homegame_owner(auth.uid(), v_homegame_id) THEN
    RAISE EXCEPTION 'Forbidden: caller is not an owner of this homegame';
  END IF;

  -- Atomically mark the request approved
  UPDATE public.player_claim_requests
  SET
    status      = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_request_id;

  -- Atomically link the player to the target user (only if still unclaimed)
  UPDATE public.players
  SET user_id = p_target_user_id
  WHERE id = p_player_id
    AND user_id IS NULL;
END;
$$;

-- Grant execute to authenticated users (RLS-equivalent check is inside the fn)
GRANT EXECUTE ON FUNCTION public.approve_claim(UUID, UUID, UUID) TO authenticated;
