-- mira_quota holds per-subject Mira usage counters and must never be reachable
-- from the browser. RLS is already enabled with zero policies (default deny);
-- make the privilege side explicit as well: revoke everything from the Data API
-- roles and grant access only to service_role (edge functions).

REVOKE ALL ON TABLE public.mira_quota FROM anon;
REVOKE ALL ON TABLE public.mira_quota FROM authenticated;
REVOKE ALL ON TABLE public.mira_quota FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mira_quota TO service_role;

ALTER TABLE public.mira_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mira_quota FORCE ROW LEVEL SECURITY;

-- Belt-and-braces: an explicit restrictive policy so that even if a permissive
-- policy is ever added by mistake, anon/authenticated can never read or write.
DROP POLICY IF EXISTS "mira quota service role only" ON public.mira_quota;
CREATE POLICY "mira quota service role only"
  ON public.mira_quota
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
