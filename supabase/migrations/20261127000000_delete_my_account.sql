-- delete_my_account: the signed-in user deletes their own account.
--
-- Homegames they own are handed to another member so the group keeps its
-- history: an existing co-owner first, then an admin, then the longest-standing
-- member. A homegame with no other members is deleted.
--
-- Everything else follows the existing foreign keys when auth.users goes:
--   profiles, memberships, invite codes they created, their claim requests and
--   one-off games are deleted; players they had claimed stay in the history as
--   unclaimed names; live_sessions.started_by and error_log.user_id are nulled.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_game record;
  v_successor uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  for v_game in
    select id from public.homegames where user_id = v_uid for update
  loop
    select m.user_id into v_successor
    from public.homegame_members m
    where m.homegame_id = v_game.id
      and m.user_id <> v_uid
    order by case m.role when 'owner' then 0 when 'admin' then 1 else 2 end,
             m.created_at,
             m.id
    limit 1;

    if v_successor is null then
      delete from public.homegames where id = v_game.id;
    else
      update public.homegames set user_id = v_successor where id = v_game.id;
      update public.homegame_members set role = 'owner'
      where homegame_id = v_game.id and user_id = v_successor;
    end if;
  end loop;

  -- reviewed_by has no ON DELETE rule, so it would block the delete.
  update public.player_claim_requests set reviewed_by = null where reviewed_by = v_uid;

  -- push_subscriptions has no foreign key to the user.
  delete from public.push_subscriptions where user_id = v_uid;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
