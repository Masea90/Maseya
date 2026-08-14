CREATE OR REPLACE FUNCTION public.admin_activity_feed(p_limit integer DEFAULT 30)
 RETURNS TABLE(id uuid, scanned_at timestamp with time zone, user_email text, nickname text, product_name text, barcode text, category text, score integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT s.id, s.scanned_at, u.email::text, p.nickname, s.product_name, s.barcode, s.category,
           NULLIF(COALESCE(s.scores->>'global', s.scores->>'score'), '')::numeric::integer
    FROM public.scan_history s
    LEFT JOIN auth.users u ON u.id = s.user_id
    LEFT JOIN public.profiles p ON p.user_id = s.user_id
    ORDER BY s.scanned_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100);
END; $function$;