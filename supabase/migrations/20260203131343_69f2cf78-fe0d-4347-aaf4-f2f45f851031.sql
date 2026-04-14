-- Drop the permissive SELECT policy that exposes all invite codes
DROP POLICY IF EXISTS "Anyone can look up invite codes by code" ON public.invite_codes;

-- Create a restricted SELECT policy for homegame members only
CREATE POLICY "Members can view their homegame codes"
ON public.invite_codes
FOR SELECT
USING (is_homegame_member(auth.uid(), homegame_id));

-- Create a secure SECURITY DEFINER function for invite code lookup
-- This function only returns a matching code if the user provides the exact code
CREATE OR REPLACE FUNCTION public.lookup_invite_code(code_input TEXT)
RETURNS TABLE (
  id UUID,
  homegame_id UUID,
  code TEXT,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses_count INTEGER,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ic.id,
    ic.homegame_id,
    ic.code,
    ic.expires_at,
    ic.max_uses,
    ic.uses_count,
    ic.is_active
  FROM public.invite_codes ic
  WHERE ic.code = UPPER(TRIM(code_input))
    AND ic.is_active = true
  LIMIT 1;
END;
$$;