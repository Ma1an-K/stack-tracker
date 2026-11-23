-- Service-role-only report functions for the local admin tool.
-- SECURITY DEFINER so they can read auth.users and every table; execute is
-- revoked from PUBLIC/anon/authenticated and granted to service_role only.

CREATE FUNCTION public.admin_overview()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'users_total',     (SELECT count(*) FROM auth.users),
    'users_active_7d', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '7 days'),
    'users_active_30d',(SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '30 days'),
    'signups_7d',      (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'homegames_total', (SELECT count(*) FROM public.homegames),
    'sessions_7d',     (SELECT count(*) FROM public.sessions WHERE created_at > now() - interval '7 days'),
    'live_now',        (SELECT count(*) FROM public.live_sessions),
    'errors_open',     (SELECT count(*) FROM public.error_log WHERE fixed_at IS NULL)
  );
$$;

CREATE FUNCTION public.admin_homegames()
RETURNS TABLE (
  id uuid,
  name text,
  owner text,
  members int,
  players int,
  last_session date,
  sessions_30d int,
  live_now boolean,
  last_activity timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    hg.id,
    hg.name,
    COALESCE(p.username, '(no profile)') || '#' || COALESCE(p.discriminator::text, '?') AS owner,
    (SELECT count(*)::int FROM public.homegame_members m WHERE m.homegame_id = hg.id) AS members,
    (SELECT count(*)::int FROM public.players pl WHERE pl.homegame_id = hg.id) AS players,
    s.last_session,
    s.sessions_30d,
    (ls.updated_at IS NOT NULL) AS live_now,
    GREATEST(s.last_created, ls.updated_at, hg.created_at) AS last_activity
  FROM public.homegames hg
  LEFT JOIN public.profiles p ON p.id = hg.user_id
  LEFT JOIN LATERAL (
    SELECT
      max(se.date) AS last_session,
      max(se.created_at) AS last_created,
      (count(*) FILTER (WHERE se.created_at > now() - interval '30 days'))::int AS sessions_30d
    FROM public.sessions se
    WHERE se.homegame_id = hg.id
  ) s ON TRUE
  LEFT JOIN LATERAL (
    SELECT l.updated_at FROM public.live_sessions l WHERE l.homegame_id = hg.id LIMIT 1
  ) ls ON TRUE
  ORDER BY last_activity DESC;
$$;

CREATE FUNCTION public.admin_recent_activity(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'signups', COALESCE((
      SELECT jsonb_agg(r ORDER BY (r->>'at') DESC) FROM (
        SELECT jsonb_build_object(
          'at', u.created_at,
          'label', COALESCE(p.username || '#' || p.discriminator, u.email),
          'detail', u.email
        ) AS r
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE u.created_at > now() - make_interval(days => p_days)
        ORDER BY u.created_at DESC
        LIMIT 50
      ) x), '[]'::jsonb),
    'homegames', COALESCE((
      SELECT jsonb_agg(r ORDER BY (r->>'at') DESC) FROM (
        SELECT jsonb_build_object(
          'at', hg.created_at,
          'label', hg.name,
          'detail', 'owner ' || COALESCE(p.username || '#' || p.discriminator, '(no profile)')
            || ', ' || (SELECT count(*) FROM public.homegame_members m WHERE m.homegame_id = hg.id) || ' members'
            || ', ' || (SELECT count(*) FROM public.sessions se WHERE se.homegame_id = hg.id) || ' sessions'
        ) AS r
        FROM public.homegames hg
        LEFT JOIN public.profiles p ON p.id = hg.user_id
        WHERE hg.created_at > now() - make_interval(days => p_days)
        ORDER BY hg.created_at DESC
        LIMIT 50
      ) x), '[]'::jsonb),
    'joins', COALESCE((
      SELECT jsonb_agg(r ORDER BY (r->>'at') DESC) FROM (
        SELECT jsonb_build_object(
          'at', m.created_at,
          'label', COALESCE(p.username || '#' || p.discriminator, '(no profile)'),
          'detail', 'joined ' || hg.name || ' as ' || m.role
        ) AS r
        FROM public.homegame_members m
        JOIN public.homegames hg ON hg.id = m.homegame_id
        LEFT JOIN public.profiles p ON p.id = m.user_id
        WHERE m.created_at > now() - make_interval(days => p_days)
        ORDER BY m.created_at DESC
        LIMIT 50
      ) x), '[]'::jsonb),
    'sessions', COALESCE((
      SELECT jsonb_agg(r ORDER BY (r->>'at') DESC) FROM (
        SELECT jsonb_build_object(
          'at', se.created_at,
          'label', hg.name,
          'detail', se.date || ', ' || count(sp.id) || ' players, buy-in '
            || COALESCE(ROUND(SUM(sp.buy_in)::numeric, 2), 0)
            || CASE WHEN se.is_settled THEN ', settled' ELSE '' END
        ) AS r
        FROM public.sessions se
        JOIN public.homegames hg ON hg.id = se.homegame_id
        LEFT JOIN public.session_players sp ON sp.session_id = se.id
        WHERE se.created_at > now() - make_interval(days => p_days)
        GROUP BY se.id, hg.name
        ORDER BY se.created_at DESC
        LIMIT 50
      ) x), '[]'::jsonb)
  );
$$;

CREATE FUNCTION public.admin_errors(p_status text DEFAULT 'open')
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  kind text,
  action text,
  message text,
  stack text,
  page text,
  user_agent text,
  app_version text,
  fixed_at timestamptz,
  user_label text,
  homegame_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('open', 'fixed', 'all') THEN
    RAISE EXCEPTION 'invalid status %, expected open|fixed|all', p_status;
  END IF;

  RETURN QUERY
  SELECT
    e.id, e.created_at, e.kind, e.action, e.message, e.stack, e.page,
    e.user_agent, e.app_version, e.fixed_at,
    p.username || '#' || p.discriminator AS user_label,
    hg.name AS homegame_name
  FROM public.error_log e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN public.homegames hg ON hg.id = e.homegame_id
  WHERE p_status = 'all'
     OR (p_status = 'open' AND e.fixed_at IS NULL)
     OR (p_status = 'fixed' AND e.fixed_at IS NOT NULL)
  ORDER BY e.created_at DESC
  LIMIT 500;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_overview() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_homegames() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_recent_activity(int) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_errors(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_homegames() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_recent_activity(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_errors(text) TO service_role;
