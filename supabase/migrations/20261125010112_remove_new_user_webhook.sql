-- Remove the dashboard-made "New user" database webhook on auth.users.
-- Nothing in the app depends on it; it posted the whole auth.users row to an external URL.
-- (Also removes the interim replacement from an earlier draft of this migration, if present.)

drop trigger if exists "New user" on auth.users;
drop trigger if exists new_user_webhook on auth.users;
drop function if exists public.notify_new_user_webhook();
