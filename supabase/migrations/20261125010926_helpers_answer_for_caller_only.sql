-- Membership helpers only answer for the signed-in caller. Every policy and function
-- that uses them passes auth.uid(), so behaviour for real callers is unchanged; calls
-- asking about other users now return false.

create or replace function public.is_homegame_member(_user_id uuid, _homegame_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _user_id = (select auth.uid())
     and exists (
       select 1 from public.homegame_members
       where user_id = _user_id and homegame_id = _homegame_id
     )
$$;

create or replace function public.is_homegame_owner(_user_id uuid, _homegame_id uuid)
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
         and role in ('owner', 'admin')
     )
$$;

create or replace function public.shares_homegame_with(_viewer_id uuid, _profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _viewer_id = (select auth.uid())
     and exists (
       select 1
       from public.homegame_members hm1
       join public.homegame_members hm2 on hm1.homegame_id = hm2.homegame_id
       where hm1.user_id = _viewer_id
         and hm2.user_id = _profile_id
     )
$$;

-- Not used by the app; signed-out callers have no reason to resolve codes.
revoke execute on function public.lookup_invite_code(text) from public, anon;
grant execute on function public.lookup_invite_code(text) to authenticated, service_role;
