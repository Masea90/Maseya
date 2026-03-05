
-- 1) Drop and recreate get_public_profile with hardened signature
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  nickname text,
  bio text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.user_id, p.nickname, p.bio, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE p.user_id = p_user_id;
$$;

-- 2) Drop and recreate get_public_profiles: minimal fields + input validation
DROP FUNCTION IF EXISTS public.get_public_profiles(uuid[]);

CREATE FUNCTION public.get_public_profiles(p_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  nickname text,
  avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  clean_ids uuid[];
BEGIN
  -- Remove nulls and duplicates, cap at 100
  SELECT ARRAY(SELECT DISTINCT unnest FROM unnest(p_user_ids) WHERE unnest IS NOT NULL LIMIT 100)
  INTO clean_ids;

  RETURN QUERY
    SELECT p.user_id, p.nickname, p.avatar_url
    FROM public.profiles p
    WHERE p.user_id = ANY(clean_ids);
END;
$$;

-- 3) Revoke anon access, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;
