CREATE TABLE public.ingredient_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name text NOT NULL,
  display_name text,
  suggested_level text NOT NULL DEFAULT 'caution',
  reason text,
  confidence numeric,
  category text,
  occurrences integer NOT NULL DEFAULT 1,
  sample_barcodes text[] NOT NULL DEFAULT '{}',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  reviewer_note text
);

CREATE UNIQUE INDEX ingredient_candidates_uniq ON public.ingredient_candidates (ingredient_name, category);
CREATE INDEX ingredient_candidates_status_idx ON public.ingredient_candidates (status, occurrences DESC);

GRANT INSERT ON public.ingredient_candidates TO anon, authenticated;
GRANT SELECT, UPDATE ON public.ingredient_candidates TO authenticated;
GRANT ALL ON public.ingredient_candidates TO service_role;

ALTER TABLE public.ingredient_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidates insert by app" ON public.ingredient_candidates
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read candidates" ON public.ingredient_candidates
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update candidates" ON public.ingredient_candidates
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_candidates_list(p_status text DEFAULT 'pending', p_limit integer DEFAULT 50)
RETURNS SETOF public.ingredient_candidates
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
    SELECT * FROM public.ingredient_candidates c
    WHERE c.status = COALESCE(p_status, 'pending')
    ORDER BY c.occurrences DESC, c.last_seen_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_candidates_counts()
RETURNS TABLE(pending bigint, approved bigint, rejected bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT
    (SELECT count(*) FROM public.ingredient_candidates WHERE status = 'pending'),
    (SELECT count(*) FROM public.ingredient_candidates WHERE status = 'approved'),
    (SELECT count(*) FROM public.ingredient_candidates WHERE status = 'rejected');
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_candidate_status(p_id uuid, p_status text, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN RAISE EXCEPTION 'invalid status'; END IF;
  UPDATE public.ingredient_candidates SET
    status = p_status,
    reviewed_at = CASE WHEN p_status = 'pending' THEN NULL ELSE now() END,
    reviewer_note = COALESCE(p_note, reviewer_note)
  WHERE id = p_id;
END; $$;