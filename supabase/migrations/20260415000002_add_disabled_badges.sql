ALTER TABLE public.homegames
  ADD COLUMN IF NOT EXISTS disabled_badges TEXT[] DEFAULT '{}';
