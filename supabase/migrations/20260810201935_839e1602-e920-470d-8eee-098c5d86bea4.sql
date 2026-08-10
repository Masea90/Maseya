-- Slim down scan_history payloads (idempotent, no rows deleted)
WITH keep(k) AS (
  VALUES ('ingredients_text'),('ingredients_text_es'),('ingredients_text_en'),('ingredients_text_fr'),
         ('nutriscore_grade'),('nutriments'),('ingredients_tags'),('additives_tags'),
         ('allergens_tags'),('traces_tags'),('labels_tags'),('categories_tags'),
         ('ingredients_analysis_tags'),('nova_group'),('alcohol_by_volume')
)
UPDATE public.scan_history s
SET product_data = COALESCE((
  SELECT jsonb_object_agg(e.key, e.value)
  FROM jsonb_each(s.product_data) e
  WHERE e.key IN (SELECT k FROM keep)
), '{}'::jsonb)
WHERE jsonb_typeof(s.product_data) = 'object'
  AND EXISTS (
    SELECT 1 FROM jsonb_each(s.product_data) e
    WHERE e.key NOT IN (SELECT k FROM keep)
  );

-- Keep only the nutriment keys the scoring engine reads
WITH keepn(k) AS (
  VALUES ('energy-kcal_100g'),('energy-kj_100g'),('fat_100g'),('saturated-fat_100g'),
         ('carbohydrates_100g'),('sugars_100g'),('fiber_100g'),('proteins_100g'),
         ('salt_100g'),('sodium_100g'),
         ('fruits-vegetables-legumes-estimate-from-ingredients_100g'),
         ('fruits-vegetables-nuts-estimate-from-ingredients_100g')
)
UPDATE public.scan_history s
SET product_data = jsonb_set(
  s.product_data,
  '{nutriments}',
  COALESCE((
    SELECT jsonb_object_agg(e.key, e.value)
    FROM jsonb_each(s.product_data->'nutriments') e
    WHERE e.key IN (SELECT k FROM keepn)
  ), '{}'::jsonb)
)
WHERE jsonb_typeof(s.product_data) = 'object'
  AND jsonb_typeof(s.product_data->'nutriments') = 'object'
  AND EXISTS (
    SELECT 1 FROM jsonb_each(s.product_data->'nutriments') e
    WHERE e.key NOT IN (SELECT k FROM keepn)
  );

-- Drop base64 data-URL images stored inside the table
UPDATE public.scan_history
SET product_image = NULL
WHERE product_image LIKE 'data:%';
