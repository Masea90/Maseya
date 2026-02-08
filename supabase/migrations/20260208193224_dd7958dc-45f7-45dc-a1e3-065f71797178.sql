
-- Drop the overly permissive SELECT policy (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can read all completions" ON public.routine_completions;
