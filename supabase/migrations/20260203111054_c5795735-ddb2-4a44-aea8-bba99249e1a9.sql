-- Allow authenticated users to look up invite codes by code (needed for joining)
CREATE POLICY "Anyone can look up invite codes by code"
ON public.invite_codes
FOR SELECT
TO authenticated
USING (true);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Members can view invite codes" ON public.invite_codes;