ALTER TABLE public.health_profiles
  ALTER COLUMN diet TYPE TEXT[] USING (
    CASE
      WHEN diet IS NULL OR diet = '' THEN '{}'::text[]
      ELSE ARRAY[diet]
    END
  ),
  ALTER COLUMN diet SET DEFAULT '{}'::text[];