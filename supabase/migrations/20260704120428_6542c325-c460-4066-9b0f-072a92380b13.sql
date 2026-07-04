CREATE POLICY "Public read product-images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Service role manages product-images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');