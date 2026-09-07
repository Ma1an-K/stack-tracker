-- Payments made during a game (e.g. an early leaver paying their loss in cash).
-- Netted out of the settlement calculation; never affects profit stats.
CREATE TABLE public.session_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  from_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  to_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT session_payments_distinct_players CHECK (from_player_id <> to_player_id)
);

CREATE INDEX session_payments_session_id ON public.session_payments(session_id);

ALTER TABLE public.session_payments ENABLE ROW LEVEL SECURITY;

-- Member-level read/write for all four operations, matching live_sessions
-- (payments are recorded by whoever is driving the live game), not
-- session_players, whose update/delete are owner-only. Swap
-- is_homegame_member for is_homegame_owner on the UPDATE and DELETE policies
-- below if payments should be owner-managed.
CREATE POLICY "Members can view session_payments" ON public.session_payments
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM public.sessions s WHERE public.is_homegame_member(auth.uid(), s.homegame_id)
    )
  );

CREATE POLICY "Members can insert session_payments" ON public.session_payments
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM public.sessions s WHERE public.is_homegame_member(auth.uid(), s.homegame_id)
    )
  );

CREATE POLICY "Members can update session_payments" ON public.session_payments
  FOR UPDATE USING (
    session_id IN (
      SELECT id FROM public.sessions s WHERE public.is_homegame_member(auth.uid(), s.homegame_id)
    )
  );

CREATE POLICY "Members can delete session_payments" ON public.session_payments
  FOR DELETE USING (
    session_id IN (
      SELECT id FROM public.sessions s WHERE public.is_homegame_member(auth.uid(), s.homegame_id)
    )
  );

-- Live sessions: payments recorded mid-game.
-- [{ "from_player_id": uuid, "to_player_id": uuid, "amount": number }]
-- Entries in `players` may now also carry "cash_out": number (present = player has left).
ALTER TABLE public.live_sessions
  ADD COLUMN payments JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(payments) = 'array');
