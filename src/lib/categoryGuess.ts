/**
 * Best-effort mapping from product name → OFF/OBF category_tag.
 * Used as a fallback for Alternatives when the raw category is missing or
 * mislabeled (e.g. an OBF cosmetic tagged "en:milks" as if it were dairy).
 *
 * Matching is diacritic-insensitive, lowercased, word-boundary aware. Multi-word
 * phrases are matched as substrings (with surrounding non-letter boundaries).
 */

type Category = 'food' | 'cosmetic';

// Order matters: more specific phrases first so "aceite de coco" beats "aceite".
const COSMETIC_MAP: Array<[string[], string]> = [
  [['leche limpiadora', 'limpiador facial', 'facial cleanser', 'face cleanser', 'cleanser', 'limpiador'], 'en:face-cleansers'],
  [['champu', 'shampoo'], 'en:shampoos'],
  [['acondicionador', 'conditioner'], 'en:hair-conditioners'],
  [['gel de ducha', 'shower gel', 'gel de bano'], 'en:shower-gels'],
  [['pasta de dientes', 'pasta dental', 'dentifrico', 'toothpaste'], 'en:toothpastes'],
  [['desodorante', 'deodorant', 'antitranspirante', 'antiperspirant'], 'en:deodorants'],
  [['contorno de ojos', 'eye cream', 'eye contour'], 'en:eye-contour-creams'],
  [['crema facial', 'crema de cara', 'face cream', 'facial cream'], 'en:face-creams'],
  [['crema corporal', 'body lotion', 'locion corporal', 'locion'], 'en:body-lotions'],
  [['protector solar', 'proteccion solar', 'sunscreen', 'sun cream'], 'en:sunscreens'],
  [['after sun', 'aftersun', 'despues del sol'], 'en:after-sun-products'],
  [['tonico', 'toner'], 'en:facial-toners'],
  [['serum', 'sérum'], 'en:face-serums'],
  [['mascarilla', 'face mask', 'mask'], 'en:face-masks'],
  [['aceite corporal', 'body oil'], 'en:body-oils'],
  [['jabon', 'soap'], 'en:soaps'],
];

const FOOD_MAP: Array<[string[], string]> = [
  [['agua mineral', 'mineral water'], 'en:mineral-waters'],
  [['agua', 'water'], 'en:mineral-waters'],
  [['galletas', 'biscuits', 'cookies'], 'en:biscuits'],
  [['yogur', 'yoghurt', 'yogurt'], 'en:yogurts'],
  [['chocolate'], 'en:chocolates'],
  [['cereales', 'cereals', 'breakfast cereal'], 'en:breakfast-cereals'],
  [['zumo', 'juice'], 'en:juices'],
  [['pan', 'bread'], 'en:breads'],
  [['aceite de oliva', 'olive oil'], 'en:olive-oils'],
  [['aceite de coco', 'coconut oil'], 'en:coconut-oils'],
  [['leche', 'milk'], 'en:milks'],
];

/** Category tags that clearly belong to food, used to detect OBF mislabels. */
export const FOOD_CATEGORY_TAGS = new Set<string>([
  'en:milks', 'en:beverages', 'en:foods', 'en:dairies',
  'en:plant-based-foods', 'en:plant-based-beverages',
  'en:mineral-waters', 'en:waters', 'en:juices', 'en:yogurts',
  'en:breads', 'en:chocolates', 'en:biscuits', 'en:breakfast-cereals',
  'en:olive-oils', 'en:coconut-oils', 'en:vegetable-oils',
]);

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const LETTER_RE = /\p{L}/u;
function isLetter(ch: string): boolean {
  return !!ch && LETTER_RE.test(ch);
}

function containsPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return false;
    const before = idx > 0 ? haystack[idx - 1] : '';
    const after = idx + needle.length < haystack.length ? haystack[idx + needle.length] : '';
    if (!isLetter(before) && !isLetter(after)) return true;
    from = idx + 1;
  }
  return false;
}

export function guessCategoryFromName(name: string, category: Category): string | null {
  if (!name) return null;
  const normalized = stripDiacritics(name.toLowerCase());
  const map = category === 'cosmetic' ? COSMETIC_MAP : FOOD_MAP;
  for (const [phrases, tag] of map) {
    for (const p of phrases) {
      if (containsPhrase(normalized, stripDiacritics(p.toLowerCase()))) return tag;
    }
  }
  return null;
}

/**
 * True when `tag` clearly identifies a food category — used to detect and
 * discard mislabels on OBF cosmetics (real case: a facial cleanser tagged
 * "en:milks" as if it were drinking milk).
 */
export function isFoodCategoryTag(tag: string | null | undefined): boolean {
  return !!tag && FOOD_CATEGORY_TAGS.has(tag);
}
