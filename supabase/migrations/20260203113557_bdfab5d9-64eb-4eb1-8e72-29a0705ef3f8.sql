-- Allow owners and admins to update member roles (except their own and the original owner's)
CREATE POLICY "Owners can update member roles"
ON public.homegame_members
FOR UPDATE
TO authenticated
USING (
  is_homegame_owner(auth.uid(), homegame_id) 
  AND user_id != auth.uid()
  AND role != 'owner'
)
WITH CHECK (
  is_homegame_owner(auth.uid(), homegame_id)
  AND user_id != auth.uid()
);