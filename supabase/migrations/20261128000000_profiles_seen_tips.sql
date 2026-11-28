-- One-time tips (ids 'home-plus', 'mystats-member') the user has already seen.
-- Stored on the account so a tip is shown once per user, not once per device.
ALTER TABLE public.profiles
  ADD COLUMN seen_tips text[] NOT NULL DEFAULT '{}';

-- The tips are for new users only: mark every existing account as having seen them.
UPDATE public.profiles SET seen_tips = ARRAY['home-plus','mystats-member'];
