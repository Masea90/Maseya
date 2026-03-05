
-- 1) Drop the overly permissive public SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view any profile publicly" ON public.profiles;

-- 2) Restore strict SELECT: users can only read their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) Create a safe public view exposing only non-sensitive fields
CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
  SELECT
    user_id,
    nickname,
    bio,
    avatar_url,
    created_at
  FROM public.profiles;

-- 4) Allow anyone (authenticated) to SELECT from the view's underlying rows
--    by creating a separate policy scoped to the service role reading through the view.
--    Since security_invoker=on, the view runs as the calling user.
--    We need a policy that allows SELECT for the limited columns via the view.
--    The trick: we use a SECURITY DEFINER function to power the view instead.
