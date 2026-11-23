-- Write-only client error log. Authenticated users can insert their own rows;
-- nobody but the service role can read, update or delete.
CREATE TABLE public.error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE SET NULL,
  homegame_id uuid NULL REFERENCES public.homegames ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('crash', 'save_failed')),
  action text CHECK (length(action) <= 200),
  message text NOT NULL CHECK (length(message) <= 2000),
  stack text CHECK (length(stack) <= 8000),
  page text CHECK (length(page) <= 300),
  user_agent text CHECK (length(user_agent) <= 400),
  app_version text CHECK (length(app_version) <= 64),
  fixed_at timestamptz NULL
);

CREATE INDEX error_log_created_at_idx ON public.error_log (created_at DESC);

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.error_log FROM anon;
REVOKE ALL ON public.error_log FROM authenticated;
GRANT INSERT ON public.error_log TO authenticated;

CREATE POLICY "Members can log their own errors"
  ON public.error_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (homegame_id IS NULL OR public.is_homegame_member(auth.uid(), homegame_id))
  );
