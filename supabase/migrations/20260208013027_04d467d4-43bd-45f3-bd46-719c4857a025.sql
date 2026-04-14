-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a helper function to check if two users share a homegame
CREATE OR REPLACE FUNCTION public.shares_homegame_with(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.homegame_members hm1
    JOIN public.homegame_members hm2 ON hm1.homegame_id = hm2.homegame_id
    WHERE hm1.user_id = _viewer_id 
      AND hm2.user_id = _profile_id
  )
$$;

-- Create new restrictive policy: users can only view their own profile 
-- or profiles of users they share a homegame with
CREATE POLICY "Users can view their own or co-member profiles"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid() 
  OR shares_homegame_with(auth.uid(), id)
);