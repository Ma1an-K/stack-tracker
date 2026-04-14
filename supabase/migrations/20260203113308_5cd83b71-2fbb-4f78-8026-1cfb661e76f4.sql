-- Update the is_homegame_owner function to also return true for admins
CREATE OR REPLACE FUNCTION public.is_homegame_owner(_user_id uuid, _homegame_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.homegame_members
    WHERE user_id = _user_id 
    AND homegame_id = _homegame_id 
    AND role IN ('owner', 'admin')
  )
$$;