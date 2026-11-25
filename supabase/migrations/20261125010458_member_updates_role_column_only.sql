-- Clients may only change a membership's role; user_id and homegame_id stay fixed.
-- (The app only ever updates role.) Policies still decide which rows and roles.
revoke update on public.homegame_members from anon, authenticated;
grant update (role) on public.homegame_members to authenticated;
