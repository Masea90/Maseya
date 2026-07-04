ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_health_data boolean NOT NULL DEFAULT false;