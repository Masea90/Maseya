CREATE TABLE public.usage_quota (
  fn text NOT NULL,
  subject text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fn, subject, day)
);
GRANT ALL ON public.usage_quota TO service_role;
ALTER TABLE public.usage_quota ENABLE ROW LEVEL SECURITY;

-- Atomically checks every (subject, limit) pair; increments all only if none is exhausted.
CREATE OR REPLACE FUNCTION public.consume_usage_quota(p_fn text, p_subjects text[], p_limits integer[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d date := (now() AT TIME ZONE 'utc')::date;
  i int;
  c int;
BEGIN
  IF p_subjects IS NULL OR array_length(p_subjects, 1) IS NULL THEN RETURN true; END IF;
  FOR i IN 1..array_length(p_subjects, 1) LOOP
    INSERT INTO public.usage_quota (fn, subject, day, count) VALUES (p_fn, p_subjects[i], d, 0)
      ON CONFLICT DO NOTHING;
  END LOOP;
  FOR i IN 1..array_length(p_subjects, 1) LOOP
    SELECT count INTO c FROM public.usage_quota
      WHERE fn = p_fn AND subject = p_subjects[i] AND day = d FOR UPDATE;
    IF c >= p_limits[i] THEN RETURN false; END IF;
  END LOOP;
  UPDATE public.usage_quota SET count = count + 1, updated_at = now()
    WHERE fn = p_fn AND day = d AND subject = ANY(p_subjects);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_usage_quota(text, text[], integer[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_usage_quota(text, text[], integer[]) TO service_role;