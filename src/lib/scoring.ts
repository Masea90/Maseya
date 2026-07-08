/**
 * Scoring + personalization rules for the scan result page.
 */
import type { ProductData } from './productLookup';

export type IngredientLevel = 'safe' | 'caution' | 'avoid';

export interface FlaggedIngredient {
  name: string;
  level: IngredientLevel;
}

export interface PersonalAlert {
  level: 'good' | 'warn' | 'danger';
  text: string;
}

export interface OnboardingProfile {
  skin: string[];
  allergies: string[];
}

// Category-aware keyword classification.
// Rationale: a mineral water contains natural mineral "sulfates" which are
// harmless; the problematic "sulfate" is the cosmetic detergent (SLS/SLES).
// Split the lists so food products don't get red-flagged for keywords that
// only make sense in cosmetics, and vice versa.
const RED_BOTH = ['paraben', 'bha', 'bht'];
const RED_COSMETIC = [
  'sulfate', 'sulphate', 'phthalate', 'formaldehyde', 'triclosan',
  'mineral oil', 'paraffinum liquidum',
];
const RED_FOOD = ['nitrite', 'aspartame', 'tartrazine', 'e102'];

const ORANGE_BOTH: string[] = [];
const ORANGE_COSMETIC = [
  'alcohol denat', 'fragrance', 'parfum', 'silicone', 'dimethicone',
  'cyclopentasiloxane',
];
const ORANGE_FOOD = [
  'carrageenan', 'monosodium glutamate', 'msg', 'e621',
  // Sulfites: real food additive concern (asthma/allergy trigger, wine, dried fruit).
  'sulfite', 'sulphite', 'sulfito', 'metabisulfite',
  'e220', 'e221', 'e222', 'e223', 'e224', 'e226', 'e227', 'e228',
];

type ClassifyCategory = 'food' | 'cosmetic' | 'unknown';

function redKeywordsFor(category: ClassifyCategory): string[] {
  if (category === 'food') return [...RED_BOTH, ...RED_FOOD];
  if (category === 'cosmetic') return [...RED_BOTH, ...RED_COSMETIC];
  // Unknown: be conservative and check everything.
  return [...RED_BOTH, ...RED_COSMETIC, ...RED_FOOD];
}
function orangeKeywordsFor(category: ClassifyCategory): string[] {
  if (category === 'food') return [...ORANGE_BOTH, ...ORANGE_FOOD];
  if (category === 'cosmetic') return [...ORANGE_BOTH, ...ORANGE_COSMETIC];
  return [...ORANGE_BOTH, ...ORANGE_COSMETIC, ...ORANGE_FOOD];
}


// Lactose keyword sets are category-aware: in cosmetics "butter" is almost
// always a plant butter (shea, cocoa, mango), so we only flag explicit dairy.
const LACTOSE_FOOD = [
  'milk', 'lactose', 'dairy', 'whey', 'casein', 'cream',
  'skimmed milk', 'whole milk', 'milk powder',
  'lait', 'leche', 'lactoserum', 'caseine', 'lacto', 'lactosa', 'suero',
];
const LACTOSE_COSMETIC = [
  'milk protein', 'dairy', 'lactose', 'whey protein',
  'proteine de lait', 'proteina de leche',
];

const ALLERGY_KEYWORDS: Record<string, string[]> = {
  gluten: ['wheat', 'gluten', 'barley', 'rye', 'malt', 'spelt', 'trigo', 'cebada', 'centeno'],
  lactose: LACTOSE_FOOD, // default; cosmetics override in personalAlerts
  nuts: ['almond', 'walnut', 'hazelnut', 'cashew', 'pistachio', 'peanut', 'pecan', 'almendra', 'nuez', 'avellana', 'cacahuete'],
  fish: ['fish', 'shellfish', 'shrimp', 'crab', 'lobster', 'pescado', 'marisco', 'gamba', 'cangrejo'],
};

// --- Text normalization + whole-word keyword matching -----------------------
// Rationale: previous naive substring matching produced false positives like
// "sulfate" matching inside "behentrimonium methosulfate", or "milk" matching
// inside "coconut milk". These helpers normalize (lowercase + strip diacritics)
// and enforce word boundaries. Multi-word keywords are treated as phrases;
// single-word keywords allow an optional plural suffix (s/es).

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
const norm = (s: string) => stripDiacritics(String(s || '').toLowerCase());
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Manual word-boundary check (no lookbehind). iOS Safari <16.4 crashes on
// `(?<!\p{L})`, which was silently breaking classification on older iPhones.
const LETTER_RE = /\p{L}/u;
const isLetterChar = (ch: string) => !!ch && LETTER_RE.test(ch);

/** Return the actual matched substring for `keyword` in `text`, or null. */
export function findKeyword(text: string, keyword: string): string | null {
  const t = norm(text);
  const k = norm(keyword);
  if (!k) return null;
  const isMulti = /\s/.test(k);
  let from = 0;
  while (from <= t.length - k.length) {
    const idx = t.indexOf(k, from);
    if (idx === -1) return null;
    let end = idx + k.length;
    // Single-word keywords allow an optional plural suffix (s/es).
    if (!isMulti) {
      if (t.substr(end, 2) === 'es' && !isLetterChar(t[end + 2] || '')) end += 2;
      else if (t[end] === 's' && !isLetterChar(t[end + 1] || '')) end += 1;
    }
    const before = idx > 0 ? t[idx - 1] : '';
    const after = end < t.length ? t[end] : '';
    if (!isLetterChar(before) && !isLetterChar(after)) {
      return t.substring(idx, end);
    }
    from = idx + 1;
  }
  return null;
}

export function matchKeyword(text: string, keyword: string): boolean {
  return findKeyword(text, keyword) !== null;
}

function findAny(text: string, keywords: string[]): string | null {
  for (const k of keywords) {
    const m = findKeyword(text, k);
    if (m) return m;
  }
  return null;
}

const containsAny = (text: string, keywords: string[]) => findAny(text, keywords) !== null;

// Plant-milk phrases that must not trigger lactose/dairy alerts.
const PLANT_MILK_PHRASES = [
  'coconut milk', 'almond milk', 'oat milk', 'soy milk', 'soya milk',
  'rice milk', 'cashew milk', 'hazelnut milk',
  'leche de coco', 'leche de almendras', 'leche de almendra',
  'leche de avena', 'leche de soja', 'leche de soya', 'leche de arroz',
  'lait de coco', 'lait d amande', 'lait d avoine', 'lait de soja', 'lait de riz',
];

/** Remove plant-milk phrases from an already-normalized text. */
function stripPlantMilks(normalizedText: string): string {
  let t = normalizedText;
  for (const p of PLANT_MILK_PHRASES) {
    const re = new RegExp(escRe(norm(p)), 'g');
    t = t.replace(re, ' ');
  }
  return t;
}

export function classifyIngredient(name: string, category: ClassifyCategory = 'unknown'): IngredientLevel {
  if (findAny(name, redKeywordsFor(category))) return 'avoid';
  if (findAny(name, orangeKeywordsFor(category))) return 'caution';
  return 'safe';
}


const SYNONYM_GROUPS: string[][] = [
  ['aqua', 'water', 'eau', 'agua'],
  ['parfum', 'fragrance', 'perfume', 'perfum'],
  ['alcohol', 'alcohol denat', 'alcohol denat.', 'ethanol', 'sd alcohol', 'denatured alcohol'],
  ['tocopherol', 'vitamin e', 'vitamine e', 'alpha-tocopherol', 'dl-alpha-tocopherol'],
];

function canonicalKey(name: string): string {
  const nrm = name.toLowerCase().trim().replace(/\s+/g, ' ');
  for (const group of SYNONYM_GROUPS) {
    if (group.includes(nrm)) return group[0];
  }
  return nrm;
}

const NUTRITIONAL_MARKERS = [
  'kcal', ' kj', 'kj/', '/kj', 'proteinas', 'proteínas',
  'porcion', 'porción', 'dosis', 'adulto medio',
  'ingesta de referencia', 'fibra alimentaria',
  'valor energetico', 'valor energético',
  'hidratos de carbono', 'grasas saturadas',
];

export function isNutritionalData(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return NUTRITIONAL_MARKERS.some(m => t.includes(m));
}

function cleanIngredientsText(raw: string): string {
  return raw
    // Convert newlines into commas BEFORE collapsing whitespace so genuine
    // list breaks aren't lost when INCI names span multiple lines.
    .replace(/[\r\n]+/g, ',')
    .replace(/\b(ingredients?|ingredientes|ingrédients|inci|composition|composición|composição)\s*[:\-]?\s*/gi, '')
    .replace(/[·•]/g, ',')
    .replace(/\b\d+([.,]\d+)?\s*%?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function flagIngredients(p: ProductData): FlaggedIngredient[] {
  if (isNutritionalData(p.ingredients_text)) return [];
  const fromTags = p.ingredients_tags
    .map(t => t.replace(/^[a-z]{2}:/, '').replace(/-/g, ' '))
    .filter(Boolean);
  const cleanedText = cleanIngredientsText(p.ingredients_text || '');
  const fromText = cleanedText
    .split(/[,;()\n\r]/)
    .map(s => s.trim())
    // Drop label/instruction segments ("TIPO DE PELE:", "MODO DE USO:",
    // etc.) — real INCI names never contain a colon. Keep the length cap
    // at 80 to allow long legitimate names like "ACRYLATES/C10-30 ALKYL
    // ACRYLATE CROSSPOLYMER".
    .filter(s => s.length > 1 && s.length < 80 && !s.includes(':'));

  const seen = new Set<string>();
  const all: string[] = [];
  // Text first: user-visible INCI is the source of truth for parfum,
  // sulfates, etc. Tags (which can balloon to 30+ taxonomy entries on OBF)
  // are appended so they never push problematic text ingredients out of
  // the display slice.
  for (const name of [...fromText, ...fromTags]) {
    const key = canonicalKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    all.push(name);
  }
  const flagged = all.map(name => ({ name, level: classifyIngredient(name, p.category) }));
  // Sort avoid → caution → safe so the top slice always shows problematic
  // ingredients first, regardless of how many total ingredients there are.
  const order: Record<IngredientLevel, number> = { avoid: 0, caution: 1, safe: 2 };
  flagged.sort((a, b) => order[a.level] - order[b.level]);
  return flagged.slice(0, 60);
}

// --- Score factor breakdowns -----------------------------------------------
// Each user-visible score is now accompanied by a short list of factors that
// explain how it was built (Nutriscore, ingredient counts, personal rules).
// Keep the rules in ONE place: `calculateScore` and `calculatePersonalScore`
// are thin wrappers around their *Breakdown counterparts.

export type FactorTone = 'positive' | 'negative' | 'neutral';
export interface ScoreFactor {
  label: string;
  delta: number | null;
  tone: FactorTone;
}

export interface ScoreBreakdown {
  score: number;
  factors: ScoreFactor[];
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// Alcoholic-beverage detection for the food score cap.
// A product is considered alcoholic when any of these signals is present:
// - categories_tags include en:alcoholic-beverages or a known descendant
//   (beers, wines, spirits, ciders, liqueurs, sparkling-wines…)
// - raw.alcohol_by_volume or raw.alcohol is a number > 0
// - "alcohol" / "ethanol" appears as an ingredient AND the product is a
//   beverage (categories include en:beverages) — avoids flagging sauces or
//   cosmetics that use trace ethanol.
// Products explicitly tagged non-alcoholic (or 0.0% ABV) are NOT capped.
const ALCOHOLIC_CATEGORY_TAGS = new Set<string>([
  'en:alcoholic-beverages', 'en:beers', 'en:wines', 'en:spirits',
  'en:red-wines', 'en:white-wines', 'en:rose-wines', 'en:sparkling-wines',
  'en:champagnes', 'en:ciders', 'en:liqueurs', 'en:cocktails',
  'en:rums', 'en:whiskies', 'en:whiskys', 'en:vodkas', 'en:gins',
  'en:tequilas', 'en:brandies', 'en:vermouths',
]);

function isAlcoholicFood(p: ProductData): boolean {
  const raw = (p.raw || {}) as Record<string, unknown>;
  const cats = Array.isArray(raw.categories_tags) ? (raw.categories_tags as string[]) : [];

  if (cats.includes('en:non-alcoholic-beverages')) return false;
  const abvRaw = raw.alcohol_by_volume ?? raw.alcohol;
  const abv = typeof abvRaw === 'number' ? abvRaw
    : typeof abvRaw === 'string' ? parseFloat(abvRaw) : NaN;
  if (Number.isFinite(abv) && abv === 0) return false;

  if (cats.some(t => ALCOHOLIC_CATEGORY_TAGS.has(t))) return true;
  if (Number.isFinite(abv) && abv > 0) return true;

  if (cats.includes('en:beverages')) {
    const txt = p.ingredients_text || '';
    if (findKeyword(txt, 'alcohol') || findKeyword(txt, 'ethanol') || findKeyword(txt, 'ethyl alcohol')) {
      return true;
    }
  }
  return false;
}

export function calculateScoreBreakdown(
  p: ProductData,
  flagged: FlaggedIngredient[],
): ScoreBreakdown {
  const reds = flagged.filter(f => f.level === 'avoid').length;
  const oranges = flagged.filter(f => f.level === 'caution').length;
  const isOrganic = p.labels_tags.some(t => t.includes('organic') || t.includes('bio'));
  const rawText = (p.ingredients_text || '').trim();
  const factors: ScoreFactor[] = [];

  const nutriGrade = (p.nutriscore_grade || '').toLowerCase();
  const hasNutri = ['a', 'b', 'c', 'd', 'e'].includes(nutriGrade);
  const alcoholic = p.category === 'food' && isAlcoholicFood(p);
  const applyAlcoholCap = (score: number): number => {
    if (!alcoholic) return score;
    if (score > 30) {
      factors.push({ label: 'Bebida alcohólica (nota limitada a 30)', delta: 30 - score, tone: 'negative' });
      return 30;
    }
    factors.push({ label: 'Bebida alcohólica', delta: null, tone: 'negative' });
    return score;
  };

  if (p.category === 'food' && hasNutri) {
    const cleanMap: Record<string, number> = { a: 95, b: 82, c: 62, d: 40, e: 18 };
    let score = cleanMap[nutriGrade] ?? 50;
    const nutriTone: FactorTone =
      nutriGrade === 'a' || nutriGrade === 'b' ? 'positive'
      : nutriGrade === 'c' ? 'neutral'
      : 'negative';
    factors.push({ label: `Nutriscore ${nutriGrade.toUpperCase()}`, delta: null, tone: nutriTone });

    if (reds > 0) {
      factors.push({
        label: `${reds} ingrediente${reds > 1 ? 's' : ''} a evitar`,
        delta: -reds * 10, tone: 'negative',
      });
      score -= reds * 10;
    }
    if (oranges > 0) {
      factors.push({
        label: `${oranges} ingrediente${oranges > 1 ? 's' : ''} con precaución`,
        delta: -oranges * 5, tone: 'negative',
      });
      score -= oranges * 5;
    }
    if (isOrganic) {
      factors.push({ label: 'Producto ecológico', delta: 3, tone: 'positive' });
      score += 3;
    }
    if (!rawText || isNutritionalData(rawText)) {
      factors.push({
        label: 'Lista de ingredientes no disponible: puntuación basada solo en Nutriscore',
        delta: null, tone: 'neutral',
      });
    }
    score = applyAlcoholCap(score);
    return { score: clamp100(score), factors };
  }

  // Cosmetic or food-without-nutriscore fallback.
  if (p.category === 'food' && !hasNutri) {
    factors.push({
      label: 'Datos incompletos: puntuación orientativa',
      delta: null, tone: 'neutral',
    });
    if (!rawText || isNutritionalData(rawText)) {
      factors.push({
        label: 'Lista de ingredientes no disponible',
        delta: null, tone: 'neutral',
      });
    }
  }

  let score = 100 - (reds * 15) - (oranges * 6);

  if (reds > 0) {
    factors.push({
      label: `${reds} ingrediente${reds > 1 ? 's' : ''} a evitar`,
      delta: -reds * 15, tone: 'negative',
    });
  }
  if (oranges > 0) {
    factors.push({
      label: `${oranges} ingrediente${oranges > 1 ? 's' : ''} con precaución`,
      delta: -oranges * 6, tone: 'negative',
    });
  }
  if (reds === 0 && oranges === 0 && flagged.length > 0) {
    factors.push({ label: 'Sin ingredientes controvertidos', delta: null, tone: 'positive' });
  }

  const positiveTags = p.ingredients_analysis_tags.filter(t =>
    ['en:palm-oil-free', 'en:vegan', 'en:vegetarian'].includes(t)
  );
  if (positiveTags.length > 0) {
    factors.push({
      label: 'Etiquetas positivas (vegano, sin aceite de palma…)',
      delta: positiveTags.length * 4, tone: 'positive',
    });
    score += positiveTags.length * 4;
  }
  if (isOrganic) {
    factors.push({ label: 'Producto ecológico', delta: 6, tone: 'positive' });
    score += 6;
  }

  score = applyAlcoholCap(score);
  return { score: clamp100(score), factors };
}

export function calculateScore(p: ProductData, flagged: FlaggedIngredient[]): number {
  return calculateScoreBreakdown(p, flagged).score;
}

export interface PersonalProfileLike {
  skin?: string[];
  skin_type?: string[];
  skin_conditions?: string[];
  skin_sensitivities?: string[];
  allergies?: string[];
  diet?: string | string[];
  nutrition_goals?: string[];
  pregnancy_or_lactation?: boolean;
}

const ANIMAL_KEYWORDS = ['milk', 'lactose', 'whey', 'casein', 'cream', 'egg', 'honey', 'gelatin', 'meat', 'beef', 'pork', 'chicken', 'fish', 'lait', 'leche', 'huevo', 'miel', 'gelatina', 'carne'];
const PREGNANCY_RISKY = ['retinol', 'retinyl', 'retinal', 'salicylic acid', 'salicylate', 'hydroquinone', 'formaldehyde', 'phthalate', 'caffeine', 'cafeina'];

/** Flatten a ProductData's tags list into a plain space-separated string. */
function tagsAsText(p: ProductData): string {
  const tags = Array.isArray(p.ingredients_tags) ? p.ingredients_tags : [];
  return tags.map(t => t.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ')).join(' ');
}

/** Look up the first keyword in the given list that matches, return the term. */
function firstTerm(text: string, keywords: string[]): string | null {
  for (const k of keywords) {
    const m = findKeyword(text, k);
    if (m) return m;
  }
  return null;
}

// Halal keyword sets.
// Pork/derivatives → hard fail. Alcohol beverages → hard fail (via
// isAlcoholicFood + these keywords). Unspecified gelatin → warn only.
// Non-pork meat → informational warn (halal depends on slaughter, not on
// what a barcode can tell us).
const HALAL_PORK_KEYWORDS = [
  'cerdo', 'porcino', 'porcina', 'jamon', 'jamón', 'panceta',
  'bacon', 'beicon', 'tocino', 'lardo', 'lard', 'manteca de cerdo',
  'chorizo', 'salchichon', 'salchichón', 'fuet', 'longaniza', 'sobrasada',
  'pork', 'ham', 'porc', 'pork gelatin', 'gelatina de cerdo',
];
const HALAL_ALCOHOL_KEYWORDS = [
  'vino', 'wine', 'cerveza', 'beer', 'licor', 'liqueur', 'ron', 'rum',
  'whisky', 'whiskey', 'vodka', 'gin', 'ginebra', 'tequila', 'brandy',
];
const HALAL_GENERIC_GELATIN_KEYWORDS = ['gelatina', 'gelatin', 'gélatine', 'e441'];
const HALAL_NON_PORK_MEAT_KEYWORDS = [
  'pollo', 'chicken', 'pavo', 'turkey', 'ternera', 'beef', 'vacuno',
  'cordero', 'lamb', 'carne',
];
const MEAT_CATEGORY_TAGS = ['en:meats', 'en:poultry', 'en:beef', 'en:chicken', 'en:turkey', 'en:lamb'];

export function calculatePersonalScoreBreakdown(
  p: ProductData,
  _flagged: FlaggedIngredient[],
  profile: PersonalProfileLike,
  baseScore: number,
): ScoreBreakdown {
  const rawText = p.ingredients_text || '';
  const combined = `${rawText} ${tagsAsText(p)}`;

  const skin = [
    ...(profile.skin || []),
    ...(profile.skin_type || []),
    ...(profile.skin_conditions || []),
  ].map(s => String(s).toLowerCase());
  const allergies = (profile.allergies || []).map(a => String(a).toLowerCase());
  const diets = (Array.isArray(profile.diet) ? profile.diet : (profile.diet ? [profile.diet] : [])).map(d => String(d).toLowerCase());
  const isVegan = diets.includes('vegan') || allergies.includes('vegan');
  const isHalal = diets.includes('halal');
  const isPregnant = !!profile.pregnancy_or_lactation;

  const factors: ScoreFactor[] = [];
  let score = baseScore;
  const hardFailReasons: string[] = [];
  const isCosmetic = p.category === 'cosmetic';
  const isFood = p.category === 'food';
  const rawObj = (p.raw || {}) as Record<string, unknown>;
  const catsTags = Array.isArray(rawObj.categories_tags) ? (rawObj.categories_tags as string[]) : [];
  const allergensTags = Array.isArray(p.allergens_tags) ? p.allergens_tags : [];

  const addNeg = (label: string, delta: number) => {
    factors.push({ label, delta, tone: 'negative' });
    score += delta;
  };
  const addPos = (label: string, delta: number) => {
    factors.push({ label, delta, tone: 'positive' });
    score += delta;
  };
  const addHardFail = (label: string) => {
    factors.push({ label, delta: null, tone: 'negative' });
    hardFailReasons.push(label);
  };

  if (isCosmetic) {
    if (skin.includes('atopic')) {
      const term = firstTerm(combined, ['sulfate', 'sulphate', 'fragrance', 'parfum', 'mineral oil', 'paraffinum']);
      if (term) addNeg(`Tu piel atópica: ingrediente irritante (${term})`, -30);
    }
    if (skin.includes('dry')) {
      const term = firstTerm(combined, ['sulfate', 'sulphate', 'alcohol denat']);
      if (term) addNeg(`Tu piel seca: ingrediente que reseca (${term})`, -20);
    }
    if (skin.includes('oily')) {
      const term = firstTerm(combined, ['mineral oil', 'paraffinum', 'silicone', 'dimethicone']);
      if (term) addNeg(`Tu piel grasa: oclusivo/comedogénico (${term})`, -15);
    }
  }

  if (isFood) {
    const lactoseText = stripPlantMilks(norm(combined));
    const lactoseTerm = LACTOSE_FOOD.map(k => findKeyword(lactoseText, k)).find(Boolean) || null;

    // Declared allergen (manufacturer-tagged) = hard fail. Text-only detection
    // keeps the previous strong penalty but not a hard fail (may be a plant
    // variant or trace mention).
    const allergyLabelFor = (a: string) =>
      a === 'gluten' ? 'gluten' : a === 'lactose' ? 'lácteos' : a === 'nuts' ? 'frutos secos' : a === 'fish' ? 'pescado/marisco' : a;

    const checkAllergy = (key: string, kws: string[], textHit: string | null) => {
      if (!allergies.includes(key)) return;
      const tagIds = ALLERGY_TAG_IDS[key];
      const declared = tagIds ? allergensTags.some(t => tagIds.includes(t)) : false;
      const label = allergyLabelFor(key);
      if (declared) {
        addHardFail(`No apto para ti: contiene ${label} declarado por el fabricante`);
      } else if (textHit) {
        addNeg(`Alergia a ${label}: detectado "${textHit}"`, -50);
      }
    };

    checkAllergy('gluten', ALLERGY_KEYWORDS.gluten, firstTerm(combined, ALLERGY_KEYWORDS.gluten));
    checkAllergy('lactose', LACTOSE_FOOD, lactoseTerm);
    checkAllergy('nuts', ALLERGY_KEYWORDS.nuts, firstTerm(combined, ALLERGY_KEYWORDS.nuts));
    checkAllergy('fish', ALLERGY_KEYWORDS.fish, firstTerm(combined, ALLERGY_KEYWORDS.fish));

    if (isVegan) {
      const t = firstTerm(combined, ANIMAL_KEYWORDS);
      if (t) addNeg(`Dieta vegana: ingrediente de origen animal (${t})`, -30);
    }
    if (diets.length && (diets.some(d => p.labels_tags.some(t => t.includes(d))) || (isVegan && p.ingredients_analysis_tags.includes('en:vegan')))) {
      addPos('Alineado con tu dieta', 5);
    }

    if (isHalal) {
      const isLabeledHalal =
        p.labels_tags.some(t => t.includes('halal')) ||
        !!findKeyword(combined, 'halal');
      if (isLabeledHalal) {
        addPos('Etiquetado como halal', 5);
      } else {
        // (a) Pork / derivatives → hard fail
        const pork = firstTerm(combined, HALAL_PORK_KEYWORDS);
        if (pork) addHardFail(`No apto: contiene cerdo o derivados (detectado: "${pork}")`);

        // (b) Alcoholic beverage → hard fail (uses shared detector + keywords)
        const alcoholTerm = firstTerm(combined, HALAL_ALCOHOL_KEYWORDS);
        if (isAlcoholicFood(p) || alcoholTerm) {
          const detail = alcoholTerm ? ` (detectado: "${alcoholTerm}")` : '';
          addHardFail(`No apto: contiene alcohol${detail}`);
        }

        // (c) Unspecified gelatin → warn (penalise but not hard fail)
        if (!pork) {
          const gel = firstTerm(combined, HALAL_GENERIC_GELATIN_KEYWORDS);
          if (gel) addNeg(`Gelatina de origen no especificado — verifica halal (detectado: "${gel}")`, -25);
        }

        // (d) Non-pork meat → informational, no penalty
        const isMeatCategory = catsTags.some(t => MEAT_CATEGORY_TAGS.includes(t));
        const meatTerm = firstTerm(combined, HALAL_NON_PORK_MEAT_KEYWORDS);
        if (!pork && (isMeatCategory || meatTerm)) {
          factors.push({
            label: 'Producto cárnico: no podemos verificar el sacrificio halal — busca la certificación en el envase',
            delta: null,
            tone: 'neutral',
          });
        }
      }
    }
  }

  if (isPregnant) {
    const t = firstTerm(combined, PREGNANCY_RISKY);
    if (t) addNeg(`Riesgo en embarazo/lactancia: ${t}`, -40);
  }

  const beneficial = ['aloe', 'panthenol', 'niacinamide', 'hyaluronic', 'glycerin', 'oat', 'avena', 'centella'];
  if (isCosmetic && skin.length > 0) {
    const t = firstTerm(combined, beneficial);
    if (t) addPos(`Activo beneficioso para tu piel (${t})`, 10);
  }

  if (factors.length === 0) {
    factors.push({ label: 'Sin ajustes: coincide con tu puntuación general', delta: null, tone: 'neutral' });
  }

  // Hard-fail override: any not-apt reason forces the personal score to 5.
  if (hardFailReasons.length > 0) {
    return { score: 5, factors };
  }
  return { score: clamp100(score), factors };
}

export function calculatePersonalScore(
  p: ProductData,
  flagged: FlaggedIngredient[],
  profile: PersonalProfileLike,
  baseScore: number,
): number {
  return calculatePersonalScoreBreakdown(p, flagged, profile, baseScore).score;
}

export function scoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score <= 10) return { label: 'No apto', color: '#FFFFFF', bg: '#E63946' };
  if (score >= 75) return { label: 'Excelente', color: '#FFFFFF', bg: '#2D6A4F' };
  if (score >= 50) return { label: 'Bueno', color: '#1B1B1B', bg: '#95D5B2' };
  if (score >= 25) return { label: 'Regular', color: '#FFFFFF', bg: '#F4A261' };
  return { label: 'Malo', color: '#FFFFFF', bg: '#E63946' };
}

export interface NaturalnessResult {
  pct: number;
  level: 'Natural' | 'Semi-natural' | 'Sintético';
  organic: boolean;
}

export function naturalness(p: ProductData, flagged: FlaggedIngredient[]): NaturalnessResult {
  const total = flagged.length || 1;
  const clean = flagged.filter(f => f.level === 'safe').length;
  const pct = Math.round((clean / total) * 100);
  const organic = p.labels_tags.some(t => t.includes('organic') || t.includes('bio'));
  const level: NaturalnessResult['level'] = pct > 80 ? 'Natural' : pct >= 50 ? 'Semi-natural' : 'Sintético';
  return { pct, level, organic };
}

const ALLERGY_TAG_IDS: Record<string, string[]> = {
  gluten: ['en:gluten', 'en:cereals-containing-gluten', 'en:wheat', 'en:barley', 'en:rye', 'en:spelt', 'en:oats'],
  lactose: ['en:milk', 'en:dairy', 'en:lactose'],
  nuts: ['en:nuts', 'en:tree-nuts', 'en:peanuts', 'en:almonds', 'en:hazelnuts', 'en:walnuts', 'en:cashew-nuts', 'en:pistachios', 'en:pecan-nuts'],
  fish: ['en:fish', 'en:crustaceans', 'en:molluscs', 'en:shellfish'],
};

const ALLERGY_LABELS: Record<string, string> = {
  gluten: 'gluten',
  lactose: 'lácteos',
  nuts: 'frutos secos',
  fish: 'pescado o marisco',
};

const tagMatches = (tags: string[], ids: string[]) =>
  tags.some(t => ids.includes(t));

// --- Verifiable-alert helpers ----------------------------------------------
// Every warn-level alert must tell the user WHAT and WHERE it was detected.
type ProbeHit = { source: 'text' | 'tag'; term: string };

function probeInText(text: string, keyword: string): string | null {
  return findKeyword(text, keyword);
}

/** Look up keyword in ingredients_text first, then in ingredients_tags. */
function probe(p: ProductData, keyword: string): ProbeHit | null {
  const inText = findKeyword(p.ingredients_text || '', keyword);
  if (inText) return { source: 'text', term: inText };
  const inTag = findKeyword(tagsAsText(p), keyword);
  if (inTag) return { source: 'tag', term: inTag };
  return null;
}

function probeAny(p: ProductData, keywords: string[]): ProbeHit | null {
  for (const k of keywords) {
    const hit = probe(p, k);
    if (hit) return hit;
  }
  return null;
}

const SOURCE_NOTE_TAG = ' (según la ficha del producto en Open Food/Beauty Facts; puede corresponder a otra versión del etiquetado)';
function annotate(message: string, hit: ProbeHit): string {
  if (hit.source === 'text') return `${message} (detectado: "${hit.term}")`;
  return `${message}${SOURCE_NOTE_TAG}`;
}

export function personalAlerts(
  p: ProductData,
  profile: OnboardingProfile & Partial<PersonalProfileLike>,
): PersonalAlert[] {
  const alerts: PersonalAlert[] = [];
  const allergensTags = Array.isArray(p.allergens_tags) ? p.allergens_tags : [];
  const tracesTags = Array.isArray(p.traces_tags) ? p.traces_tags : [];
  const skin = Array.isArray(profile?.skin) ? profile.skin : [];
  const allergies = Array.isArray(profile?.allergies) ? profile.allergies : [];
  const diets = (
    Array.isArray(profile?.diet) ? profile.diet : (profile?.diet ? [profile.diet as string] : [])
  ).map(d => String(d).toLowerCase());
  const isHalal = diets.includes('halal');

  const isCosmetic = p.category === 'cosmetic';
  const isFood = p.category === 'food';

  // Skin rules — cosmetics only
  if (isCosmetic) {
    const pushHit = (hits: string[], msg: string, kws: string[]) => {
      const hit = probeAny(p, kws);
      if (hit) hits.push(annotate(msg, hit));
    };

    if (skin.includes('atopic')) {
      const hits: string[] = [];
      pushHit(hits, 'Los sulfatos alteran la barrera cutánea atópica', ['sulfate', 'sulphate']);
      pushHit(hits, 'Las fragancias pueden irritar piel atópica', ['fragrance', 'parfum']);
      pushHit(hits, 'El alcohol puede resecar piel atópica', ['alcohol denat']);
      pushHit(hits, 'El aceite mineral ocluye poros, puede empeorar atopia', ['mineral oil', 'paraffinum']);
      if (hits.length === 0) alerts.push({ level: 'good', text: 'Sin ingredientes problemáticos para piel atópica' });
      else hits.forEach(h => alerts.push({ level: 'warn', text: h }));
    }
    if (skin.includes('dry')) {
      const hits: string[] = [];
      pushHit(hits, 'Los sulfatos resecan piel ya seca', ['sulfate', 'sulphate']);
      pushHit(hits, 'El alcohol agrava la sequedad', ['alcohol denat']);
      if (hits.length === 0) alerts.push({ level: 'good', text: 'Apto para piel seca' });
      else hits.forEach(h => alerts.push({ level: 'warn', text: h }));
    }
    if (skin.includes('oily')) {
      const hits: string[] = [];
      pushHit(hits, 'El aceite mineral puede obstruir poros en piel grasa', ['mineral oil', 'paraffinum']);
      pushHit(hits, 'Las siliconas pueden acumular sebo en piel grasa', ['silicone', 'dimethicone']);
      if (hits.length === 0) alerts.push({ level: 'good', text: 'Apto para piel grasa' });
      else hits.forEach(h => alerts.push({ level: 'warn', text: h }));
    }
  }

  // Food allergy rules — food only.
  if (isFood) {
    const hasStructured = allergensTags.length > 0 || tracesTags.length > 0;
    const isUntrustedSource = p.source === 'photo' || p.source === 'maseya';

    // Pre-strip plant-milk phrases for lactose text lookups.
    const rawText = p.ingredients_text || '';
    const rawTagsText = tagsAsText(p);
    const lactoseTextClean = stripPlantMilks(norm(rawText));
    const lactoseTagsClean = stripPlantMilks(norm(rawTagsText));

    for (const allergy of allergies) {
      if (allergy === 'none') continue;
      const tagIds = ALLERGY_TAG_IDS[allergy];
      const kws = allergy === 'lactose' ? LACTOSE_FOOD : ALLERGY_KEYWORDS[allergy];
      if (!tagIds && !kws) continue;
      const label = ALLERGY_LABELS[allergy] || allergy;

      const inAllergens = tagIds ? tagMatches(allergensTags, tagIds) : false;
      const inTraces = tagIds ? tagMatches(tracesTags, tagIds) : false;

      // Text/tag probe with plant-milk exclusion for lactose.
      let hit: ProbeHit | null = null;
      if (kws) {
        if (allergy === 'lactose') {
          for (const k of kws) {
            const inTxt = probeInText(lactoseTextClean, k);
            if (inTxt) { hit = { source: 'text', term: inTxt }; break; }
            const inTg = probeInText(lactoseTagsClean, k);
            if (inTg) { hit = { source: 'tag', term: inTg }; break; }
          }
        } else {
          hit = probeAny(p, kws);
        }
      }

      if (inAllergens) {
        alerts.push({
          level: 'danger',
          text: `No apto para ti: contiene ${label} declarado por el fabricante.`,
        });
      } else if (inTraces) {
        alerts.push({ level: 'warn', text: `Puede contener trazas de ${label} (declarado por el fabricante).` });
      } else if (hit) {
        const where = hit.source === 'text'
          ? ` (detectado: "${hit.term}")`
          : SOURCE_NOTE_TAG;
        alerts.push({
          level: 'warn',
          text: `Posible presencia de ${label} detectada en los ingredientes. Verifica el etiquetado del envase.${where}`,
        });
      } else {
        alerts.push({
          level: 'good',
          text: `No hemos detectado ${label} en la información disponible. Verifica siempre el etiquetado del envase.`,
        });
      }
    }

    // Halal rules — mirror the scoring logic so alerts + score stay in sync.
    if (isHalal) {
      const combined = `${rawText} ${rawTagsText}`;
      const isLabeledHalal =
        p.labels_tags.some(t => t.includes('halal')) || !!findKeyword(combined, 'halal');
      if (isLabeledHalal) {
        alerts.push({ level: 'good', text: 'Etiquetado como halal.' });
      } else {
        const pork = firstTerm(combined, HALAL_PORK_KEYWORDS);
        if (pork) {
          alerts.push({
            level: 'danger',
            text: `Contiene cerdo o derivados — no compatible con tu dieta halal (detectado: "${pork}").`,
          });
        }
        const alcoholTerm = firstTerm(combined, HALAL_ALCOHOL_KEYWORDS);
        if (isAlcoholicFood(p) || alcoholTerm) {
          const detail = alcoholTerm ? ` (detectado: "${alcoholTerm}")` : '';
          alerts.push({
            level: 'danger',
            text: `Contiene alcohol — no compatible con tu dieta halal${detail}.`,
          });
        }
        if (!pork) {
          const gel = firstTerm(combined, HALAL_GENERIC_GELATIN_KEYWORDS);
          if (gel) {
            alerts.push({
              level: 'warn',
              text: `Contiene gelatina de origen no especificado — verifica que sea halal (detectado: "${gel}").`,
            });
          }
        }
        const rawObj = (p.raw || {}) as Record<string, unknown>;
        const catsTags = Array.isArray(rawObj.categories_tags) ? (rawObj.categories_tags as string[]) : [];
        const isMeatCategory = catsTags.some(t => MEAT_CATEGORY_TAGS.includes(t));
        const meatTerm = firstTerm(combined, HALAL_NON_PORK_MEAT_KEYWORDS);
        if (!pork && (isMeatCategory || meatTerm)) {
          alerts.push({
            level: 'warn',
            text: 'Producto cárnico: la app no puede verificar el sacrificio halal — busca la certificación en el envase.',
          });
        }
      }
    }

    if (allergies.some(a => a !== 'none') && (isUntrustedSource || !hasStructured)) {
      alerts.push({
        level: 'warn',
        text: 'Análisis basado en foto o datos de la comunidad: la información puede estar incompleta. Verifica siempre el envase original.',
      });
    }
  }

  return alerts;
}

export function loadOnboarding(): OnboardingProfile {
  try {
    const raw = localStorage.getItem('maseya_onboarding');
    if (!raw) return { skin: [], allergies: [] };
    const p = JSON.parse(raw);
    return {
      skin: Array.isArray(p?.skin) ? p.skin : [],
      allergies: Array.isArray(p?.allergies) ? p.allergies : [],
    };
  } catch {
    return { skin: [], allergies: [] };
  }
}
