CREATE OR REPLACE FUNCTION public.admin_funnel()
RETURNS TABLE(window_days integer, step text, step_order integer, sessions bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  WITH w(d) AS (VALUES (7), (30)),
  steps(name, ord) AS (VALUES
    ('app_open', 1), ('welcome_view', 2), ('welcome_cta', 3), ('scanner_view', 4),
    ('camera_permission_granted', 5), ('scan_success', 6), ('result_view', 7),
    ('register_prompt_shown', 8), ('register_completed', 9))
  SELECT w.d, s.name, s.ord,
    COALESCE((
      SELECT count(DISTINCT e.session_id)
      FROM public.app_events e
      WHERE e.event = s.name AND e.created_at > now() - (w.d || ' days')::interval
    ), 0)
  FROM w CROSS JOIN steps s
  ORDER BY w.d, s.ord;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_camera_denials()
RETURNS TABLE(window_days integer, reason text, events bigint, sessions bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  WITH w(d) AS (VALUES (7), (30))
  SELECT w.d, COALESCE(e.props->>'reason', 'unknown'), count(*), count(DISTINCT e.session_id)
  FROM w JOIN public.app_events e
    ON e.event = 'camera_permission_denied' AND e.created_at > now() - (w.d || ' days')::interval
  GROUP BY w.d, COALESCE(e.props->>'reason', 'unknown')
  ORDER BY w.d, count(*) DESC;
END; $$;