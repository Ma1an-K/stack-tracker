-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can create homegames" ON public.homegames;

CREATE POLICY "Authenticated users can create homegames"
ON public.homegames
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());