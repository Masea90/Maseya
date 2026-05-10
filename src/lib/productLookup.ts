/**
 * Product lookup — Open Food Facts → Open Beauty Facts fallback.
 */

export type ProductSource = 'off' | 'obf' | 'photo';

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
    ingredients_tags?: string[];
    labels_tags?: string[];
    ingredients_analysis_tags?: string[];
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
  return {
    barcode,
    source,
    category,
    name: p.product_name_es || p.product_name || 'Producto sin nombre',
    brand: p.brands || '',
    image: p.image_front_url || p.image_url || null,
    nutriscore_grade: p.nutriscore_grade || null,
    ingredients_text: p.ingredients_text_es || p.ingredients_text || null,
    ingredients_tags: p.ingredients_tags || [],
    labels_tags: p.labels_tags || [],
    ingredients_analysis_tags: p.ingredients_analysis_tags || [],
    raw: (p as unknown as Record<string, unknown>) ?? {},
  };
};

export async function lookupProduct(barcode: string): Promise<ProductData | null> {
  const off = await fetchFrom('world.openfoodfacts.org', barcode);
  if (off?.status === 1 && off.product) return normalize(off, barcode, 'off', 'food');

  const obf = await fetchFrom('world.openbeautyfacts.org', barcode);
  if (obf?.status === 1 && obf.product) return normalize(obf, barcode, 'obf', 'cosmetic');

  return null;
}
