CREATE TABLE public.maseya_products (
  barcode text NOT NULL PRIMARY KEY,
  product_name text NOT NULL,
  brand text,
  category text NOT NULL CHECK (category IN ('food','cosmetic','unknown')),
  ingredients_text text,
  image_url text,
  source text NOT NULL DEFAULT 'maseya',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maseya_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maseya products public read"
ON public.maseya_products FOR SELECT
USING (true);

CREATE POLICY "authenticated can insert maseya products"
ON public.maseya_products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated can update maseya products"
ON public.maseya_products FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER maseya_products_updated_at
BEFORE UPDATE ON public.maseya_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.maseya_products (barcode, product_name, brand, category, ingredients_text, source, verified)
VALUES
  ('3337875696548', 'Lipikar Baume AP+M', 'La Roche-Posay', 'cosmetic',
   'Aqua/water, Butyrospermum parkii butter/shea butter, glycerin, dimethicone, niacinamide, cetearyl alcohol, Brassica campestris seed oil, glyceryl stearate, ammonium polyacryloyldimethyl taurate, PEG-100 stearate, propanediol, Ophiopogon japonicus root extract, PEG-20 methyl glucose sesquistearate, sorbitan tristearate, dimethiconol, sodium chloride, mannose, coco-betaine, disodium EDTA, capryloyl glycine, caprylyl glycol, Vitreoscilla ferment, citric acid, maltodextrin, xanthan gum, tocopherol',
   'maseya', true),
  ('3337872418570', 'Lipikar Baume AP+M', 'La Roche-Posay', 'cosmetic',
   'Aqua/water, Butyrospermum parkii butter/shea butter, glycerin, dimethicone, niacinamide, cetearyl alcohol, Brassica campestris seed oil, glyceryl stearate, ammonium polyacryloyldimethyl taurate, PEG-100 stearate, propanediol, Ophiopogon japonicus root extract, PEG-20 methyl glucose sesquistearate, sorbitan tristearate, dimethiconol, sodium chloride, mannose, coco-betaine, disodium EDTA, capryloyl glycine, caprylyl glycol, Vitreoscilla ferment, citric acid, maltodextrin, xanthan gum, tocopherol',
   'maseya', true);