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
  // Auto-fetch image from Open Food/Beauty Facts if missing
  if (!image) {
    try {
      const host = cat === 'food' ? 'world.openfoodfacts.org' : 'world.openbeautyfacts.org';
      const json = await fetchFrom(host, data.barcode);
      const p = json?.product;
      if (p?.image_front_url || p?.image_url) {
        image = p.image_front_url || p.image_url;
      } else if (cat !== 'unknown') {
        // Try the other host as fallback
        const altHost = cat === 'food' ? 'world.openbeautyfacts.org' : 'world.openfoodfacts.org';
        const altJson = await fetchFrom(altHost, data.barcode);
        const ap = altJson?.product;
        if (ap?.image_front_url || ap?.image_url) image = ap.image_front_url || ap.image_url;
      }
    } catch (e) {
      console.warn('[productLookup] image auto-fetch failed', e);
    }
  }
  const categoryTag = (data as { category_tag?: string | null }).category_tag || null;
  const rawObj: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };
  if (categoryTag) rawObj.categories_tags = [categoryTag];
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
  const maseya = await fetchFromMaseya(barcode);
  if (maseya) return maseya;

  const off = await fetchFrom('world.openfoodfacts.org', barcode);
  if (off?.status === 1 && off.product) return normalize(off, barcode, 'off', 'food');

  const obf = await fetchFrom('world.openbeautyfacts.org', barcode);
  if (obf?.status === 1 && obf.product) return normalize(obf, barcode, 'obf', 'cosmetic');

  return null;
}
