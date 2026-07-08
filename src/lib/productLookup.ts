/**
 * Product lookup — Maseya DB → Open Food Facts → Open Beauty Facts.
 */
import { supabase } from '@/integrations/supabase/client';

export type ProductSource = 'maseya' | 'off' | 'obf' | 'photo';

export interface ProductData {
  barcode: string;
  source: ProductSource;
  name: string;
  brand: string;
  image: string | null;
  category: 'food' | 'cosmetic' | 'unknown';
  nutriscore_grade?: string | null;
  ingredients_text?: string | null;
  ingredients_tags: string[];
  labels_tags: string[];
  ingredients_analysis_tags: string[];
  /** Structured allergen tags from OFF/OBF (e.g. "en:gluten"). Empty for maseya/photo sources. */
  allergens_tags: string[];
  /** Structured trace-allergen tags from OFF/OBF (e.g. "en:milk"). Empty for maseya/photo sources. */
  traces_tags: string[];
  raw: Record<string, unknown>;
}

interface OFFResponse {
  status: number;
  product?: {
    product_name?: string;
    product_name_es?: string;
    brands?: string;
    image_front_url?: string;
    image_url?: string;
    nutriscore_grade?: string;
    ingredients_text?: string;
    ingredients_text_es?: string;
    ingredients_text_en?: string;
    ingredients_text_fr?: string;
    composition_en?: string;
    ingredients?: Array<{ text?: string; id?: string }>;
    ingredients_tags?: string[];
    labels_tags?: string[];
    categories_tags?: string[];
    ingredients_analysis_tags?: string[];
    allergens_tags?: string[];
    traces_tags?: string[];
  };
}


const fetchFrom = async (host: string, barcode: string): Promise<OFFResponse | null> => {
  try {
    const res = await fetch(`https://${host}/api/v2/product/${encodeURIComponent(barcode)}.json`);
    if (!res.ok) return null;
    return (await res.json()) as OFFResponse;
  } catch (e) {
    console.error(`[productLookup] ${host} fetch failed`, e);
    return null;
  }
};

const normalize = (
  json: OFFResponse,
  barcode: string,
  source: ProductSource,
  category: 'food' | 'cosmetic'
): ProductData => {
  const p = json.product ?? {};
  const ingredientsFromArray = Array.isArray(p.ingredients)
    ? p.ingredients.map(i => i?.text).filter(Boolean).join(', ')
    : '';
  const ingredients_text =
    p.ingredients_text_es ||
    p.ingredients_text ||
    p.ingredients_text_en ||
    p.ingredients_text_fr ||
    p.composition_en ||
    ingredientsFromArray ||
    null;
  return {
    barcode,
    source,
    category,
    name: p.product_name_es || p.product_name || 'Producto sin nombre',
    brand: p.brands || '',
    image: p.image_front_url || p.image_url || null,
    nutriscore_grade: p.nutriscore_grade || null,
    ingredients_text,
    ingredients_tags: p.ingredients_tags || [],
    labels_tags: p.labels_tags || [],
    ingredients_analysis_tags: p.ingredients_analysis_tags || [],
    allergens_tags: p.allergens_tags || [],
    traces_tags: p.traces_tags || [],
    raw: (p as unknown as Record<string, unknown>) ?? {},
  };
};

async function fetchFromMaseya(barcode: string): Promise<ProductData | null> {
  const { data, error } = await supabase
    .from('maseya_products')
    .select('barcode, product_name, brand, category, category_tag, ingredients_text, image_url, source')
    .eq('barcode', barcode)
    .maybeSingle();
  if (error) {
    console.error('[productLookup] maseya_products error', error);
    return null;
  }
  if (!data) return null;
  const cat = (data.category === 'food' || data.category === 'cosmetic') ? data.category : 'unknown';
  let image: string | null = data.image_url || null;
  let categoryTag: string | null = (data as { category_tag?: string | null }).category_tag || null;
  let remoteCategoriesTags: string[] | null = null;

  // Auto-fetch from OFF/OBF when we lack the image OR the specific
  // category_tag (needed to power the Alternatives feature).
  if (!image || !categoryTag) {
    try {
      const primary = cat === 'cosmetic' ? 'world.openbeautyfacts.org' : 'world.openfoodfacts.org';
      const alt = cat === 'cosmetic' ? 'world.openfoodfacts.org' : 'world.openbeautyfacts.org';
      let p = (await fetchFrom(primary, data.barcode))?.product;
      if (!p && cat !== 'unknown') p = (await fetchFrom(alt, data.barcode))?.product;
      if (p) {
        if (!image && (p.image_front_url || p.image_url)) {
          image = p.image_front_url || p.image_url || null;
        }
        if (Array.isArray(p.categories_tags) && p.categories_tags.length > 0) {
          remoteCategoriesTags = p.categories_tags;
          if (!categoryTag) {
            const last = p.categories_tags[p.categories_tags.length - 1];
            if (last && /^[a-z]{2}:[a-z0-9-]+$/.test(last)) {
              categoryTag = last;
              // Best-effort persist so we skip the remote fetch next time.
              // Ignore permission/RLS errors silently.
              void supabase
                .from('maseya_products')
                .update({ category_tag: categoryTag })
                .eq('barcode', data.barcode)
                .then(({ error }) => {
                  if (error) console.warn('[productLookup] category_tag persist skipped', error.message);
                });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[productLookup] remote enrichment failed', e);
    }
  }

  const rawObj: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };
  const categoriesTags = remoteCategoriesTags ?? (categoryTag ? [categoryTag] : null);
  if (categoriesTags) rawObj.categories_tags = categoriesTags;
  if (categoryTag) rawObj.category_tag = categoryTag;

  return {
    barcode: data.barcode,
    source: 'maseya',
    name: data.product_name || 'Producto sin nombre',
    brand: data.brand || '',
    image,
    category: cat,
    nutriscore_grade: null,
    ingredients_text: data.ingredients_text || null,
    ingredients_tags: [],
    labels_tags: [],
    ingredients_analysis_tags: [],
    allergens_tags: [],
    traces_tags: [],
    raw: rawObj,
  };
}


export async function saveToMaseya(input: {
  barcode: string;
  product_name: string;
  brand?: string | null;
  category: 'food' | 'cosmetic' | 'unknown';
  ingredients_text: string;
  image_url?: string | null;
  source?: string;
  verified?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    console.warn('[saveToMaseya] skipped: not authenticated');
    return { ok: false, error: 'not_authenticated' };
  }
  console.log('[saveToMaseya] upserting', { barcode: input.barcode, name: input.product_name, source: input.source });
  const { error } = await supabase
    .from('maseya_products')
    .upsert({
      barcode: input.barcode,
      product_name: input.product_name,
      brand: input.brand ?? null,
      category: input.category,
      ingredients_text: input.ingredients_text,
      image_url: input.image_url ?? null,
      source: input.source ?? 'photo',
      verified: false,
      submitted_by: uid,
    }, { onConflict: 'barcode' });
  if (error) {
    console.error('[saveToMaseya] error', error);
    return { ok: false, error: error.message };
  }
  console.log('[saveToMaseya] success for', input.barcode);
  return { ok: true };
}

export async function lookupProduct(barcode: string): Promise<ProductData | null> {
  // Public sources first (OFF/OBF) — they carry Nutriscore and richer ingredient
  // data. maseya_products is used as a fallback for community/photo contributions
  // not present in the public datasets. Previously maseya was tried first, which
  // caused imported products (no nutriscore) to hide the richer OFF data and
  // scored e.g. Coca-Cola as 100/100.
  const off = await fetchFrom('world.openfoodfacts.org', barcode);
  if (off?.status === 1 && off.product) return normalize(off, barcode, 'off', 'food');

  const obf = await fetchFrom('world.openbeautyfacts.org', barcode);
  if (obf?.status === 1 && obf.product) return normalize(obf, barcode, 'obf', 'cosmetic');

  const maseya = await fetchFromMaseya(barcode);
  if (maseya) return maseya;

  return null;
}
