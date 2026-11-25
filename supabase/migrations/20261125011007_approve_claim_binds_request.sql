-- approve_claim: the request must be a pending request for this player, and the
-- player is linked to the user who made it. Same signature as before.
create or replace function public.approve_claim(p_request_id uuid, p_player_id uuid, p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_homegame_id uuid;
  v_requester uuid;
begin
  select homegame_id into v_homegame_id
  from public.players
  where id = p_player_id;

  if v_homegame_id is null then
    raise exception 'Player not found';
  end if;

  if not public.is_homegame_owner(auth.uid(), v_homegame_id) then
    raise exception 'Forbidden: caller is not an owner of this homegame';
  end if;

  select user_id into v_requester
  from public.player_claim_requests
  where id = p_request_id
    and player_id = p_player_id
    and status = 'pending'
  for update;

  if v_requester is null then
    raise exception 'Claim request not found';
  end if;

  if p_target_user_id is distinct from v_requester then
    raise exception 'Claim request does not match this user';
  end if;

  update public.player_claim_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_request_id;

  update public.players
  set user_id = v_requester
  where id = p_player_id
    and user_id is null;
end;
$$;

revoke all on function public.approve_claim(uuid, uuid, uuid) from public, anon;
grant execute on function public.approve_claim(uuid, uuid, uuid) to authenticated, service_role;
