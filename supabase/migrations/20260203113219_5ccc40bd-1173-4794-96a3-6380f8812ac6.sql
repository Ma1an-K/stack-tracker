-- Add 'admin' to the homegame_role enum
ALTER TYPE public.homegame_role ADD VALUE IF NOT EXISTS 'admin';