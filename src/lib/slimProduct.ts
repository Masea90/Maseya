/**
 * Slim product payload for scan_history.
 *
 * We used to persist the FULL Open Food Facts payload (~80 KB per scan).
 * We now keep only the fields the scoring engine reads, so a history row is
 * ~2-3 KB and the score can be recomputed offline with the current engine.
 */
import type { ProductData } from '@/lib/productLookup';

/** Nutriment keys the scoring engine / Nutri-Score actually reads. */
const NUTRIMENT_KEYS = [
  'energy-kcal_100g',
  'energy-kj_100g',
  'fat_100g',
  'saturated-fat_100g',
  'carbohydrates_100g',
  'sugars_100g',
  'fiber_100g',
  'proteins_100g',
  'salt_100g',
  'sodium_100g',
  'fruits-vegetables-legumes-estimate-from-ingredients_100g',
  'fruits-vegetables-nuts-estimate-from-ingredients_100g',
] as const;

const TAG_KEYS = [
  'ingredients_tags',
  'additives_tags',
  'allergens_tags',
  'traces_tags',
  'labels_tags',
  'categories_tags',
  'ingredients_analysis_tags',
] as const;

export interface SlimProductData {
  ingredients_text?: string | null;
  nutriscore_grade?: string | null;
  nutriments?: Record<string, number>;
  nova_group?: number | null;
  alcohol_by_volume?: number | null;
  [key: string]: unknown;
}

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const asNumber = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/** Reduce a full product payload to the fields required to score it. */
export function toSlimProductData(p: ProductData): SlimProductData {
  const raw = (p.raw ?? {}) as Record<string, unknown>;
  const slim: SlimProductData = {};

  const text = p.ingredients_text ?? (raw.ingredients_text as string | undefined) ?? null;
  if (text) slim.ingredients_text = text;

  const grade = p.nutriscore_grade ?? (raw.nutriscore_grade as string | undefined) ?? null;
  if (grade) slim.nutriscore_grade = grade;

  const rawNutri = (raw.nutriments && typeof raw.nutriments === 'object')
    ? (raw.nutriments as Record<string, unknown>)
    : null;
  if (rawNutri) {
    const nutriments: Record<string, number> = {};
    for (const k of NUTRIMENT_KEYS) {
      const n = asNumber(rawNutri[k]);
      if (n !== null) nutriments[k] = n;
    }
    if (Object.keys(nutriments).length > 0) slim.nutriments = nutriments;
  }

  for (const k of TAG_KEYS) {
    const fromProduct = (p as unknown as Record<string, unknown>)[k];
    const tags = asStringArray(fromProduct).length
      ? asStringArray(fromProduct)
      : asStringArray(raw[k]);
    if (tags.length) slim[k] = tags;
  }

  const nova = asNumber(raw.nova_group);
  if (nova !== null) slim.nova_group = nova;

  const abv = asNumber(raw.alcohol_by_volume ?? raw.alcohol);
  if (abv !== null) slim.alcohol_by_volume = abv;

  return slim;
}

export interface HistoryRowLike {
  barcode: string | null;
  product_name: string | null;
  product_image: string | null;
  category: string | null;
  source?: string | null;
  product_data: unknown;
}

/**
 * Rebuild a scorable ProductData from a stored (slim OR legacy full) payload.
 * Returns null when the row carries no data the engine can use.
 */
export function productFromHistoryRow(row: HistoryRowLike): ProductData | null {
  const slim = (row.product_data && typeof row.product_data === 'object')
    ? (row.product_data as Record<string, unknown>)
    : null;
  if (!slim) return null;

  const ingredients_text =
    (slim.ingredients_text as string | undefined) ||
    (slim.ingredients_text_es as string | undefined) ||
    (slim.ingredients_text_en as string | undefined) ||
    null;

  const hasNutriments = !!slim.nutriments && typeof slim.nutriments === 'object'
    && Object.keys(slim.nutriments as object).length > 0;
  const hasTags = TAG_KEYS.some(k => asStringArray(slim[k]).length > 0);
  if (!ingredients_text && !hasNutriments && !hasTags && !slim.nutriscore_grade) return null;

  const category: ProductData['category'] =
    row.category === 'food' ? 'food' : row.category === 'cosmetic' ? 'cosmetic' : 'unknown';

  return {
    barcode: row.barcode ?? '',
    source: (row.source as ProductData['source']) ?? 'off',
    name: row.product_name ?? '',
    brand: '',
    image: row.product_image,
    category,
    nutriscore_grade: (slim.nutriscore_grade as string | undefined) ?? null,
    ingredients_text,
    ingredients_tags: asStringArray(slim.ingredients_tags),
    labels_tags: asStringArray(slim.labels_tags),
    ingredients_analysis_tags: asStringArray(slim.ingredients_analysis_tags),
    allergens_tags: asStringArray(slim.allergens_tags),
    traces_tags: asStringArray(slim.traces_tags),
    raw: slim,
  };
}
