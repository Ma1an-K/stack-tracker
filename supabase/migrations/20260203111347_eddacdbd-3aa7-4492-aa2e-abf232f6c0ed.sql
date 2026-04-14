-- Create enum for claim request status
CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected');

-- Create table for player claim requests
CREATE TABLE public.player_claim_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.claim_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(player_id, user_id)
);

-- Enable RLS
ALTER TABLE public.player_claim_requests ENABLE ROW LEVEL SECURITY;

-- Members can view claim requests for their homegame
CREATE POLICY "Members can view claim requests"
ON public.player_claim_requests
FOR SELECT
TO authenticated
USING (
  player_id IN (
    SELECT id FROM public.players 
    WHERE is_homegame_member(auth.uid(), homegame_id)
  )
);

-- Authenticated users can create claim requests for players in homegames they're members of
CREATE POLICY "Members can request to claim players"
ON public.player_claim_requests
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  player_id IN (
    SELECT id FROM public.players 
    WHERE is_homegame_member(auth.uid(), homegame_id)
    AND user_id IS NULL  -- Player must be unclaimed
  )
);

-- Owners can update claim requests (approve/reject)
CREATE POLICY "Owners can update claim requests"
ON public.player_claim_requests
FOR UPDATE
TO authenticated
USING (
  player_id IN (
    SELECT id FROM public.players 
    WHERE is_homegame_owner(auth.uid(), homegame_id)
  )
);

-- Users can delete their own pending requests
CREATE POLICY "Users can cancel their pending requests"
ON public.player_claim_requests
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() AND status = 'pending'
);

-- Trigger to update updated_at
CREATE TRIGGER update_player_claim_requests_updated_at
BEFORE UPDATE ON public.player_claim_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();