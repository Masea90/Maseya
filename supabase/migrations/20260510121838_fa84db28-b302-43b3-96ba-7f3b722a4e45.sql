
-- 1) maseya_products: ownership column + restricted policies
ALTER TABLE public.maseya_products
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

DROP POLICY IF EXISTS "authenticated can insert maseya products" ON public.maseya_products;
DROP POLICY IF EXISTS "authenticated can update maseya products" ON public.maseya_products;

CREATE POLICY "users can insert own maseya products"
ON public.maseya_products FOR INSERT TO authenticated
WITH CHECK (auth.uid() = submitted_by AND verified = false);

CREATE POLICY "submitter or admin can update maseya products"
ON public.maseya_products FOR UPDATE TO authenticated
USING (
  (auth.uid() = submitted_by AND verified = false)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  (auth.uid() = submitted_by AND verified = false)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 2) post-images storage: enforce path ownership on insert
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "post images authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'INSERT'
      AND qual IS NULL
      AND with_check ILIKE '%post-images%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "post images user folder insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3) Realtime channel authorization for notifications
-- Users can only subscribe to a topic named 'notifications:<their-user-id>'
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own notification channel" ON realtime.messages;
CREATE POLICY "users can read own notification channel"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() = 'notifications:' || auth.uid()::text
  OR realtime.topic() LIKE 'public:%'
);
