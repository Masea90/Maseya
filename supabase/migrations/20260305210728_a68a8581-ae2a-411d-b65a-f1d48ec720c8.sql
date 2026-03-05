
-- Drop the security_invoker view (it won't work for other users' profiles)
DROP VIEW IF EXISTS public.public_profiles;

-- Create a SECURITY DEFINER function that returns safe public profile data
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id uuid)
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
  SELECT
    p.user_id,
    p.nickname,
    p.bio,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = p_user_id;
$$;

-- Also create a function for community page to get multiple public profiles at once
CREATE OR REPLACE FUNCTION public.get_public_profiles(p_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  nickname text,
  bio text,
  avatar_url text,
  skin_concerns text[],
  hair_type text,
  hair_concerns text[],
  goals text[],
  sensitivities text[],
  age_range text,
  country text,
  climate_type text,
  has_profile_photo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    p.user_id,
    p.nickname,
    p.bio,
    p.avatar_url,
    p.skin_concerns,
    p.hair_type,
    p.hair_concerns,
    p.goals,
    p.sensitivities,
    p.age_range,
    p.country,
    p.climate_type,
    p.has_profile_photo
  FROM public.profiles p
  WHERE p.user_id = ANY(p_user_ids);
$$;
