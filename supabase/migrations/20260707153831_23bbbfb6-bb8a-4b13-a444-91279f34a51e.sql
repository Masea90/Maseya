ALTER TABLE public.scan_history DROP CONSTRAINT IF EXISTS scan_history_source_check;
ALTER TABLE public.scan_history ADD CONSTRAINT scan_history_source_check
  CHECK (source = ANY (ARRAY['off'::text, 'obf'::text, 'photo'::text, 'maseya'::text]));