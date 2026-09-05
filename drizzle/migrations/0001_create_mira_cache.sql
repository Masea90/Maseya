CREATE TABLE public.mira_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  barcode text NOT NULL,
  language text NOT NULL,
  analysis text NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mira_cache_cache_key_idx ON public.mira_cache (cache_key);
CREATE INDEX mira_cache_last_used_at_idx ON public.mira_cache (last_used_at);

GRANT SELECT ON public.mira_cache TO anon, authenticated;
GRANT ALL ON public.mira_cache TO service_role;

ALTER TABLE public.mira_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mira cache public read" ON public.mira_cache
  FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.mira_quota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject, day)
);

GRANT ALL ON public.mira_quota TO service_role;

ALTER TABLE public.mira_quota ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_mira_cache_stats()
RETURNS TABLE(entries bigint, hits bigint, hit_rate numeric, entries_7d bigint, hits_7d bigint,
              button_shown_7d bigint, button_click_7d bigint, shown_cached_7d bigint, click_rate_7d numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.mira_cache),
    (SELECT COALESCE(sum(c.hits), 0) FROM public.mira_cache c),
    ROUND(100.0 * COALESCE((SELECT sum(c.hits) FROM public.mira_cache c), 0)
      / NULLIF(COALESCE((SELECT sum(c.hits) FROM public.mira_cache c), 0) + (SELECT count(*) FROM public.mira_cache), 0), 1),
    (SELECT count(*) FROM public.mira_cache WHERE created_at > now() - interval '7 days'),
    (SELECT COALESCE(sum(c.hits), 0) FROM public.mira_cache c WHERE c.last_used_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.app_events WHERE event = 'mira_button_shown' AND created_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.app_events WHERE event = 'mira_button_click' AND created_at > now() - interval '7 days'),
    (SELECT count(*) FROM public.app_events WHERE event = 'mira_shown_cached' AND created_at > now() - interval '7 days'),
    ROUND(100.0 * (SELECT count(*) FROM public.app_events WHERE event = 'mira_button_click' AND created_at > now() - interval '7 days')
      / NULLIF((SELECT count(*) FROM public.app_events WHERE event = 'mira_button_shown' AND created_at > now() - interval '7 days'), 0), 1);
END; $$;