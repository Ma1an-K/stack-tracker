-- Replace the dashboard-made "New user" database webhook with a trigger that
-- sends only the fields the sign-up workflow needs, plus a shared-secret header.
--
-- Configuration lives in Supabase Vault (never in this repo):
--   new_user_webhook_url     the workflow's webhook URL
--   new_user_webhook_secret  value sent in the X-Webhook-Secret header
-- If either secret is missing the trigger does nothing, so sign-up never depends on it.
--
-- Body shape keeps the old {"type": ..., "record": {...}} envelope so the workflow can
-- keep reading body.record.email, body.record.id, etc.
--
-- Rollback: see docs in the PR hand-over (recreates the original trigger).

drop trigger if exists "New user" on auth.users;

create or replace function public.notify_new_user_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'new_user_webhook_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'new_user_webhook_secret' limit 1;

  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object(
        'id', new.id,
        'email', new.email,
        'created_at', new.created_at,
        'username', new.raw_user_meta_data ->> 'username',
        'display_name', new.raw_user_meta_data ->> 'display_name'
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Webhook-Secret', v_secret
    ),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- A notification problem must never block account creation.
  return new;
end;
$$;

revoke all on function public.notify_new_user_webhook() from public, anon, authenticated;

drop trigger if exists new_user_webhook on auth.users;
create trigger new_user_webhook
  after insert on auth.users
  for each row execute function public.notify_new_user_webhook();
