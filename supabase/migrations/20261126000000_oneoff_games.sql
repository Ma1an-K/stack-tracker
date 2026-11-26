-- Saved one-off games: a personal record of a single game played outside any
-- homegame. Owner-only: the owner can read, save and delete their own rows.
-- No update policy (saved games are not editable in v1), and no access for
-- anyone else, including homegame owners and the admin RPCs.
CREATE TABLE public.oneoff_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  played_on date NOT NULL,
  label text NULL,
  currency text NOT NULL,
  notes text NULL,
  -- [{ id, name, buy_in, cash_out }] (ids from the device game)
  players jsonb NOT NULL,
  -- [{ from_id, to_id, amount }]: payments already made between players
  payments jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- [{ from_id, to_id, amount }]: who pays whom, stored at save time so a later
  -- change to the settlement math never rewrites an old game
  transfers jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX oneoff_games_user_played_idx ON public.oneoff_games (user_id, played_on DESC);

ALTER TABLE public.oneoff_games ENABLE ROW LEVEL SECURITY;

-- Revoke first so the result does not depend on the database's default
-- privileges (older projects grant ALL on new tables to anon and authenticated;
-- newer ones grant nothing). No UPDATE grant: saved games are not editable.
REVOKE ALL ON public.oneoff_games FROM anon;
REVOKE ALL ON public.oneoff_games FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.oneoff_games TO authenticated;

CREATE POLICY oneoff_games_select_own
  ON public.oneoff_games
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY oneoff_games_insert_own
  ON public.oneoff_games
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY oneoff_games_delete_own
  ON public.oneoff_games
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));
