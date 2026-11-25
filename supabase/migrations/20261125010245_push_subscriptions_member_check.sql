-- Push subscriptions: only for homegames the user belongs to, and only https endpoints.
drop policy if exists "Users can create own subscriptions" on public.push_subscriptions;
create policy "Users can create own subscriptions"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_homegame_member((select auth.uid()), homegame_id)
    and endpoint like 'https://%'
  );
