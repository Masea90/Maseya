
-- Archive/resolution fields on feedback
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid;

GRANT SELECT, UPDATE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

-- Admins can read all feedback (in addition to the existing INSERT-anyone policy)
DROP POLICY IF EXISTS "Admins can read feedback" ON public.feedback;
CREATE POLICY "Admins can read feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
CREATE POLICY "Admins can update feedback"
  ON public.feedback FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- List feedback (open or resolved)
CREATE OR REPLACE FUNCTION public.admin_recent_feedback(p_resolved boolean DEFAULT false, p_limit integer DEFAULT 50, p_barcode text DEFAULT NULL)
RETURNS TABLE(
  id uuid, created_at timestamptz, type text, email text,
  user_id uuid, nickname text, message text, context jsonb,
  resolved boolean, resolution_notes text, resolved_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT f.id, f.created_at, f.type, f.email, f.user_id, p.nickname,
           f.message, f.context, f.resolved, f.resolution_notes, f.resolved_at
    FROM public.feedback f
    LEFT JOIN public.profiles p ON p.user_id = f.user_id
    WHERE f.resolved = p_resolved
      AND (p_barcode IS NULL OR f.context->>'barcode' = p_barcode)
    ORDER BY f.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200);
END;
$$;

-- Resolve / re-open feedback
CREATE OR REPLACE FUNCTION public.admin_resolve_feedback(p_id uuid, p_notes text, p_resolved boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.feedback
    SET resolved = p_resolved,
        resolution_notes = COALESCE(p_notes, resolution_notes),
        resolved_at = CASE WHEN p_resolved THEN now() ELSE NULL END,
        resolved_by = CASE WHEN p_resolved THEN auth.uid() ELSE NULL END
    WHERE id = p_id;
END;
$$;

-- Users list for admin dashboard
CREATE OR REPLACE FUNCTION public.admin_users_list(p_limit integer DEFAULT 100, p_search text DEFAULT NULL)
RETURNS TABLE(
  user_id uuid, nickname text, email text, created_at timestamptz,
  last_sign_in_at timestamptz, scan_count bigint, is_admin boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT u.id, p.nickname, u.email::text, u.created_at, u.last_sign_in_at,
           COALESCE((SELECT count(*) FROM public.scan_history s WHERE s.user_id = u.id), 0),
           public.has_role(u.id, 'admin')
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE p_search IS NULL
       OR u.email ILIKE '%' || p_search || '%'
       OR p.nickname ILIKE '%' || p_search || '%'
    ORDER BY u.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 500);
END;
$$;
