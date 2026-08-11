
-- Admin read-only RLS
CREATE POLICY "Admins can read all scans" ON public.scan_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can read health profiles" ON public.health_profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Pulse
CREATE OR REPLACE FUNCTION public.admin_pulse()
RETURNS TABLE(
  scans_today bigint, scans_7d bigint, scans_30d bigint,
  active_users_7d bigint, total_users bigint, new_users_7d bigint,
  photo_products_7d bigint, total_products bigint, pending_feedback bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT
    (SELECT count(*) FROM public.scan_history WHERE scanned_at >= date_trunc('day', now())),
    (SELECT count(*) FROM public.scan_history WHERE scanned_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.scan_history WHERE scanned_at > now() - interval '30 days'),
    (SELECT count(DISTINCT user_id) FROM public.scan_history WHERE scanned_at > now() - interval '7 days'),
    (SELECT count(*) FROM auth.users),
    (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.maseya_products WHERE created_at > now() - interval '7 days' AND (barcode LIKE 'photo_%' OR source <> 'off')),
    (SELECT count(*) FROM public.maseya_products),
    (SELECT count(*) FROM public.feedback WHERE resolved_at IS NULL);
END; $$;

-- Feedback counts
CREATE OR REPLACE FUNCTION public.admin_feedback_counts()
RETURNS TABLE(pending bigint, resolved bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT
    (SELECT count(*) FROM public.feedback WHERE resolved_at IS NULL),
    (SELECT count(*) FROM public.feedback WHERE resolved_at IS NOT NULL);
END; $$;

-- Feedback list based on resolved_at
CREATE OR REPLACE FUNCTION public.admin_feedback_list(
  p_pending boolean DEFAULT true, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0
) RETURNS TABLE(
  id uuid, created_at timestamptz, type text, rating text, email text,
  user_id uuid, nickname text, message text, context jsonb,
  resolved_at timestamptz, resolution text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT f.id, f.created_at, f.type, f.rating, f.email, f.user_id, p.nickname,
           f.message, f.context, f.resolved_at,
           COALESCE(f.resolution, f.resolution_notes)
    FROM public.feedback f
    LEFT JOIN public.profiles p ON p.user_id = f.user_id
    WHERE (p_pending AND f.resolved_at IS NULL) OR (NOT p_pending AND f.resolved_at IS NOT NULL)
    ORDER BY f.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100) OFFSET GREATEST(p_offset, 0);
END; $$;

-- Resolve / reopen
CREATE OR REPLACE FUNCTION public.admin_set_feedback_resolved(
  p_id uuid, p_resolved boolean, p_note text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.feedback SET
    resolved = p_resolved,
    resolved_at = CASE WHEN p_resolved THEN now() ELSE NULL END,
    resolved_by = CASE WHEN p_resolved THEN auth.uid() ELSE NULL END,
    resolution = CASE WHEN p_resolved THEN COALESCE(p_note, resolution) ELSE NULL END,
    status = CASE WHEN p_resolved THEN 'resuelto' ELSE 'nuevo' END
  WHERE id = p_id;
END; $$;

-- Recent activity with email
CREATE OR REPLACE FUNCTION public.admin_activity_feed(p_limit integer DEFAULT 30)
RETURNS TABLE(
  id uuid, scanned_at timestamptz, user_email text, nickname text,
  product_name text, barcode text, category text, score integer
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT s.id, s.scanned_at, u.email::text, p.nickname, s.product_name, s.barcode, s.category,
           NULLIF((s.scores->>'score'), '')::numeric::integer
    FROM public.scan_history s
    LEFT JOIN auth.users u ON u.id = s.user_id
    LEFT JOIN public.profiles p ON p.user_id = s.user_id
    ORDER BY s.scanned_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100);
END; $$;

-- Top scanned products
CREATE OR REPLACE FUNCTION public.admin_top_scanned(p_limit integer DEFAULT 10)
RETURNS TABLE(barcode text, product_name text, scans bigint, users bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT s.barcode, max(s.product_name), count(*), count(DISTINCT s.user_id)
    FROM public.scan_history s
    WHERE s.barcode IS NOT NULL
    GROUP BY s.barcode
    ORDER BY count(*) DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50);
END; $$;
