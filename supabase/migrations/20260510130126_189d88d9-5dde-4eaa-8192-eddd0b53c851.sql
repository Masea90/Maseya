
ALTER TABLE public.maseya_products
  ADD COLUMN IF NOT EXISTS scan_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_enriched_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_maseya_products_scan_count
  ON public.maseya_products (scan_count DESC);

CREATE OR REPLACE FUNCTION public.increment_product_scan_count(p_barcode text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.maseya_products
  SET scan_count = scan_count + 1
  WHERE barcode = p_barcode;
$$;

GRANT EXECUTE ON FUNCTION public.increment_product_scan_count(text) TO anon, authenticated;
