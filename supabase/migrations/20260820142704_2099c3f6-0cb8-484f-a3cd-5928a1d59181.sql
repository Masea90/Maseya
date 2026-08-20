-- Anonymous, GDPR-safe usage analytics.
-- NOTE (retention): no automatic purge for now. It is advisable to purge rows
-- older than 90 days (e.g. DELETE FROM public.app_events WHERE created_at < now() - interval '90 days').
CREATE TABLE public.app_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  user_id uuid,
  event text NOT NULL,
  props jsonb
);

CREATE INDEX app_events_created_at_idx ON public.app_events (created_at DESC);
CREATE INDEX app_events_event_created_at_idx ON public.app_events (event, created_at DESC);

GRANT INSERT ON public.app_events TO anon, authenticated;
GRANT SELECT ON public.app_events TO authenticated;
GRANT ALL ON public.app_events TO service_role;

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert events"
  ON public.app_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins can read events"
  ON public.app_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.admin_usage_stats()
RETURNS TABLE(
  window_days integer,
  sessions bigint,
  sessions_anon bigint,
  sessions_auth bigint,
  scans bigint,
  scans_not_found bigint,
  not_found_pct numeric,
  photo_start bigint,
  photo_success bigint,
  photo_error bigint,
  register_prompt bigint,
  register_completed bigint,
  register_conv_pct numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  WITH w(d) AS (VALUES (7), (30)),
  ev AS (
    SELECT w.d AS wd, e.session_id, e.user_id, e.event
    FROM w JOIN public.app_events e ON e.created_at > now() - (w.d || ' days')::interval
  ),
  sess AS (
    SELECT wd, session_id, bool_or(user_id IS NOT NULL) AS has_user
    FROM ev GROUP BY wd, session_id
  )
  SELECT
    w.d,
    COALESCE((SELECT count(*) FROM sess s WHERE s.wd = w.d), 0),
    COALESCE((SELECT count(*) FROM sess s WHERE s.wd = w.d AND NOT s.has_user), 0),
    COALESCE((SELECT count(*) FROM sess s WHERE s.wd = w.d AND s.has_user), 0),
    COALESCE((SELECT count(*) FROM ev WHERE wd = w.d AND event IN ('scan_success','scan_not_found')), 0),
    COALESCE((SELECT count(*) FROM ev WHERE wd = w.d AND event = 'scan_not_found'), 0),
    ROUND(
      100.0 * COALESCE((SELECT count(*) FROM ev WHERE wd = w.d AND event = 'scan_not_found'), 0)
      / NULLIF((SELECT count(*) FROM ev WHERE wd = w.d AND event IN ('scan_success','scan_not_found')), 0)
    , 1),
    COALESCE((SELECT count(*) FROM ev WHERE wd = w.d AND event = 'photo_flow_start'), 0),
    COALESCE((SELECT count(*) FROM ev WHERE wd = w.d AND event = 'photo_flow_success'), 0),
    COALESCE((SELECT count(*) FROM ev WHERE wd = w.d AND event = 'photo_flow_error'), 0),
    COALESCE((SELECT count(*) FROM ev WHERE wd = w.d AND event = 'register_prompt_shown'), 0),
    COALESCE((SELECT count(*) FROM ev WHERE wd = w.d AND event = 'register_completed'), 0),
    ROUND(
      100.0 * COALESCE((SELECT count(*) FROM ev WHERE wd = w.d AND event = 'register_completed'), 0)
      / NULLIF((SELECT count(*) FROM ev WHERE wd = w.d AND event = 'register_prompt_shown'), 0)
    , 1)
  FROM w
  ORDER BY w.d;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_recent_events(p_limit integer DEFAULT 20)
RETURNS TABLE(created_at timestamptz, event text, is_auth boolean, props jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT e.created_at, e.event, e.user_id IS NOT NULL, e.props
    FROM public.app_events e
    ORDER BY e.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100);
END; $$;