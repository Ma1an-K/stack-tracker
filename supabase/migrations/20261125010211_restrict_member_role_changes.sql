-- Member management: owner rows can't be removed by others, and only the owner
-- changes roles (between admin and member). Admins keep removing ordinary members.

-- True-owner check (role = 'owner' only; is_homegame_owner also accepts admins).
-- Answers only for the calling user.
create or replace function public.has_owner_role(_user_id uuid, _homegame_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _user_id = (select auth.uid())
     and exists (
       select 1 from public.homegame_members
       where user_id = _user_id
         and homegame_id = _homegame_id
         and role = 'owner'
     )
$$;

revoke all on function public.has_owner_role(uuid, uuid) from public, anon;
grant execute on function public.has_owner_role(uuid, uuid) to authenticated, service_role;

drop policy if exists "Owners can manage members" on public.homegame_members;
create policy "Owners can manage members"
  on public.homegame_members
  for delete
  to authenticated
  using (
    public.is_homegame_owner((select auth.uid()), homegame_id)
    and user_id <> (select auth.uid())
    and role <> 'owner'
  );

drop policy if exists "Owners can update member roles" on public.homegame_members;
create policy "Owners can update member roles"
  on public.homegame_members
  for update
  to authenticated
  using (
    public.has_owner_role((select auth.uid()), homegame_id)
    and user_id <> (select auth.uid())
    and role <> 'owner'
  )
  with check (
    public.has_owner_role((select auth.uid()), homegame_id)
    and user_id <> (select auth.uid())
    and role in ('admin', 'member')
  );
