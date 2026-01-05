-- Add new privacy-safe profile fields for GDPR compliance
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age_range text,
ADD COLUMN IF NOT EXISTS sensitivities text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS climate_type text,
ADD COLUMN IF NOT EXISTS email_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_profile_photo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS first_routine_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_analytics boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_personalization boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_date timestamp with time zone;

-- Add comment to clarify privacy-safe approach
COMMENT ON COLUMN public.profiles.age_range IS 'Privacy-safe age ranges: 18-24, 25-34, 35-44, 45-54, 55+';
COMMENT ON COLUMN public.profiles.sensitivities IS 'Product sensitivities/exclusions: fragrance-free, sulfate-free, vegan, etc.';
COMMENT ON COLUMN public.profiles.climate_type IS 'General climate type: tropical, dry, temperate, continental, polar';