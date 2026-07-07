
-- Admin stats
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS TABLE(
  total_users bigint,
  total_scans bigint,
  total_products bigint,
  active_users_7d bigint,
  scans_today bigint,
  products_added_7d bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT
      (SELECT count(*) FROM public.profiles),
      (SELECT count(*) FROM public.scan_history),
      (SELECT count(*) FROM public.maseya_products),
      (SELECT count(DISTINCT user_id) FROM public.scan_history WHERE scanned_at > now() - interval '7 days'),
      (SELECT count(*) FROM public.scan_history WHERE scanned_at > now() - interval '1 day'),
      (SELECT count(*) FROM public.maseya_products WHERE created_at > now() - interval '7 days');
END;
$$;

-- Latest scans across all users
CREATE OR REPLACE FUNCTION public.admin_recent_scans(p_limit int DEFAULT 25)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  nickname text,
  product_name text,
  barcode text,
  category text,
  scanned_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT s.id, s.user_id, p.nickname, s.product_name, s.barcode, s.category, s.scanned_at
    FROM public.scan_history s
    LEFT JOIN public.profiles p ON p.user_id = s.user_id
    ORDER BY s.scanned_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200);
END;
$$;

-- Latest products added to the DB
CREATE OR REPLACE FUNCTION public.admin_recent_products(p_limit int DEFAULT 25)
RETURNS TABLE(
  barcode text,
  product_name text,
  brand text,
  category text,
  source text,
  verified boolean,
  submitted_by uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT m.barcode, m.product_name, m.brand, m.category, m.source, m.verified, m.submitted_by, m.created_at
    FROM public.maseya_products m
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200);
END;
$$;

-- Active users ordered by last scan
CREATE OR REPLACE FUNCTION public.admin_active_users(p_limit int DEFAULT 25)
RETURNS TABLE(
  user_id uuid,
  nickname text,
  last_scan_at timestamptz,
  scan_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT s.user_id, p.nickname, max(s.scanned_at) AS last_scan_at, count(*) AS scan_count
    FROM public.scan_history s
    LEFT JOIN public.profiles p ON p.user_id = s.user_id
    GROUP BY s.user_id, p.nickname
    ORDER BY max(s.scanned_at) DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_scans(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_recent_products(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_active_users(int) TO authenticated;
