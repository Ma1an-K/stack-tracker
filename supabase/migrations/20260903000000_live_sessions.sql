-- Live sessions: a durable draft of a game in progress.
-- Buy-ins are tracked here while the game runs; on "End Session & Cash Out"
-- the draft is handed to the normal session form and this row is deleted.
-- Kept fully separate from sessions/session_players so stats, leaderboards
-- and badges never see an unfinished game.

CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homegame_id UUID NOT NULL REFERENCES public.homegames(id) ON DELETE CASCADE,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  default_buy_in NUMERIC(10, 2) NOT NULL DEFAULT 50 CHECK (default_buy_in >= 0),
  notes TEXT,
  -- [{ "player_id": uuid, "buy_in": number }]
  players JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(players) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one game in progress per homegame.
CREATE UNIQUE INDEX live_sessions_one_per_homegame ON public.live_sessions(homegame_id);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Any member can see and drive the live game; members can already insert
-- finished sessions, so letting them add buy-ins to a draft is consistent.
CREATE POLICY "Members can view live sessions" ON public.live_sessions
  FOR SELECT USING (public.is_homegame_member(auth.uid(), homegame_id));

CREATE POLICY "Members can insert live sessions" ON public.live_sessions
  FOR INSERT WITH CHECK (public.is_homegame_member(auth.uid(), homegame_id));

CREATE POLICY "Members can update live sessions" ON public.live_sessions
  FOR UPDATE USING (public.is_homegame_member(auth.uid(), homegame_id));

CREATE POLICY "Members can delete live sessions" ON public.live_sessions
  FOR DELETE USING (public.is_homegame_member(auth.uid(), homegame_id));

CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
