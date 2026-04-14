-- Allow homegame owners to delete their homegame.
-- Cascade handles all child rows: homegame_members, players, sessions, session_players, invite_codes.
CREATE POLICY "Owners can delete their homegame"
  ON public.homegames FOR DELETE
  USING (user_id = auth.uid());
