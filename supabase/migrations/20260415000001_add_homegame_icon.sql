-- Add icon_id column to homegames table for selectable homegame badge icons.
ALTER TABLE public.homegames ADD COLUMN IF NOT EXISTS icon_id TEXT DEFAULT NULL;
