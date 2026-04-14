-- Fix homegames policies - make them PERMISSIVE and allow creator to see their homegame
DROP POLICY IF EXISTS "Members can view their homegames" ON public.homegames;
DROP POLICY IF EXISTS "Authenticated users can create homegames" ON public.homegames;
DROP POLICY IF EXISTS "Owners can update their homegames" ON public.homegames;

-- SELECT: Allow members OR the creator to view
CREATE POLICY "Members can view their homegames"
ON public.homegames
FOR SELECT
TO authenticated
USING (is_homegame_member(auth.uid(), id) OR user_id = auth.uid());

-- INSERT: Allow authenticated users to create (as owner)
CREATE POLICY "Authenticated users can create homegames"
ON public.homegames
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Allow owners
CREATE POLICY "Owners can update their homegames"
ON public.homegames
FOR UPDATE
TO authenticated
USING (is_homegame_owner(auth.uid(), id));

-- Fix homegame_members policies
DROP POLICY IF EXISTS "Members can view their homegame memberships" ON public.homegame_members;
DROP POLICY IF EXISTS "Users can join via invite" ON public.homegame_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.homegame_members;

-- SELECT: Members can view
CREATE POLICY "Members can view their homegame memberships"
ON public.homegame_members
FOR SELECT
TO authenticated
USING (is_homegame_member(auth.uid(), homegame_id) OR user_id = auth.uid());

-- INSERT: Users can add themselves (for joining or creating)
CREATE POLICY "Users can join homegames"
ON public.homegame_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- DELETE: Owners can remove members (except themselves)
CREATE POLICY "Owners can manage members"
ON public.homegame_members
FOR DELETE
TO authenticated
USING (is_homegame_owner(auth.uid(), homegame_id) AND user_id <> auth.uid());