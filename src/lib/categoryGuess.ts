/**
 * Best-effort mapping from product name → OFF/OBF category_tag.
 * Used as a fallback for Alternatives when the raw category is missing or
 * mislabeled (e.g. an OBF cosmetic tagged "en:milks" as if it were dairy).
 *
 * Matching is diacritic-insensitive, lowercased, word-boundary aware. Multi-word
 * phrases are matched as substrings (with surrounding non-letter boundaries).
 */

type Category = 'food' | 'cosmetic';

// Each entry maps phrases → an ORDERED list of OBF/OFF category_tag candidates,
// most-specific first, followed by broader fallbacks. All tags below have been
// verified to return >0 products on OBF/OFF (Nov 2026); using non-existent
// canonical-looking tags like "en:face-cleansers" silently yields 0 results.
// Order matters within the outer array: more specific phrases first so
// "aceite de coco" beats "aceite".
const COSMETIC_MAP: Array<[string[], string[]]> = [
  [['leche limpiadora', 'cleansing milk'], ['en:cleansing-milks', 'en:cleansers']],
  [['limpiador facial', 'facial cleanser', 'face cleanser', 'cleanser', 'limpiador'], ['en:cleansers']],
  [['champu', 'shampoo'], ['en:shampoos', 'en:hair-care']],
  [['acondicionador', 'conditioner'], ['en:hair-conditioners', 'en:hair-care']],
  [['gel de ducha', 'shower gel', 'gel de bano'], ['en:shower-gels']],
  [['pasta de dientes', 'pasta dental', 'dentifrico', 'toothpaste'], ['en:toothpastes']],
  [['desodorante', 'deodorant', 'antitranspirante', 'antiperspirant'], ['en:deodorants']],
  [['contorno de ojos', 'eye cream', 'eye contour'], ['en:face-creams']],
  [['crema facial', 'crema de cara', 'face cream', 'facial cream'], ['en:face-creams', 'en:moisturizers']],
  [['crema corporal', 'body lotion', 'locion corporal', 'locion', 'body moisturizer'], ['en:moisturizers']],
  [['protector solar', 'proteccion solar', 'sunscreen', 'sun cream'], ['en:sunscreens', 'en:sun-care']],
  [['after sun', 'aftersun', 'despues del sol'], ['en:sun-care']],
  [['mascarilla', 'face mask', 'mask'], ['en:face-masks']],
  [['aceite corporal', 'body oil'], ['en:body-oils']],
  [['jabon', 'soap'], ['en:soaps']],
];

const FOOD_MAP: Array<[string[], string[]]> = [
  [['agua mineral', 'mineral water'], ['en:mineral-waters']],
  [['agua', 'water'], ['en:mineral-waters']],
  [['galletas', 'biscuits', 'cookies'], ['en:biscuits']],
  [['yogur', 'yoghurt', 'yogurt'], ['en:yogurts']],
  [['cacao en polvo', 'cocoa powder', 'cacao soluble'], ['en:cocoa-powders', 'en:cocoas']],
  [['cacao', 'cocoa'], ['en:cocoas', 'en:cocoa-powders']],
  [['chocolate'], ['en:chocolates']],
  [['cereales', 'cereals', 'breakfast cereal'], ['en:breakfast-cereals']],
  [['zumo', 'juice'], ['en:juices']],
  [['pan', 'bread'], ['en:breads']],
  [['aceite de oliva', 'olive oil'], ['en:olive-oils']],
  [['aceite de coco', 'coconut oil'], ['en:coconut-oils']],
  [['leche', 'milk'], ['en:milks']],
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

/** Returns the best-guess category_tag for a product name (first specific tag). */
export function guessCategoryFromName(name: string, category: Category): string | null {
  const list = guessCategoryTagsFromName(name, category);
  return list.length > 0 ? list[0] : null;
}

/**
 * Returns an ORDERED list of candidate category_tags for a product name.
 * Most specific first, broader fallbacks last. Alternatives search should try
 * each in order until one yields products.
 */
export function guessCategoryTagsFromName(name: string, category: Category): string[] {
  if (!name) return [];
  const normalized = stripDiacritics(name.toLowerCase());
  const map = category === 'cosmetic' ? COSMETIC_MAP : FOOD_MAP;
  for (const [phrases, tags] of map) {
    for (const p of phrases) {
      if (containsPhrase(normalized, stripDiacritics(p.toLowerCase()))) return tags;
    }
  }
  return [];
}

/**
 * True when `tag` clearly identifies a food category — used to detect and
 * discard mislabels on OBF cosmetics (real case: a facial cleanser tagged
 * "en:milks" as if it were drinking milk).
 */
export function isFoodCategoryTag(tag: string | null | undefined): boolean {
  return !!tag && FOOD_CATEGORY_TAGS.has(tag);
}
