/**
 * Scoring + personalization rules for the scan result page.
 */
import type { ProductData } from './productLookup';
import { computeNutriScore, nutriScoreToNote } from './nutriscore';
import { ADDITIVES_RISK, type AdditiveRiskEntry, type AdditiveRiskLevel } from './additivesRisk';

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
  // Formaldehyde releasers
  'dmdm hydantoin', 'imidazolidinyl urea', 'diazolidinyl urea', 'quaternium-15',
  // Problematic UV filters
  'oxybenzone', 'benzophenone-3',
];
const RED_FOOD = [
  'nitrite', 'aspartame', 'tartrazine', 'e102',
  // Nitrites / nitrates (processed meats)
  'e249', 'e250', 'e251', 'e252',
  // BHA / BHT E-codes
  'e320', 'e321',
];

const ORANGE_BOTH: string[] = [];
const ORANGE_COSMETIC = [
  'alcohol denat', 'fragrance', 'parfum', 'silicone', 'dimethicone',
  'cyclopentasiloxane',
  // Preservatives / chelators / others
  'talc', 'phenoxyethanol', 'chlorphenesin',
  'edta', 'disodium edta', 'tetrasodium edta',
  // UV filters with concerns
  'homosalate', 'octocrylene',
];
const ORANGE_FOOD = [
  'carrageenan', 'monosodium glutamate', 'msg', 'e621',
  // Sulfites: real food additive concern (asthma/allergy trigger, wine, dried fruit).
  'sulfite', 'sulphite', 'sulfito', 'metabisulfite',
  'e220', 'e221', 'e222', 'e223', 'e224', 'e226', 'e227', 'e228',
  // Azo colourants
  'e110', 'e122', 'e124', 'e129',
  // Sodium benzoate
  'e211',
  // Glutamates
  'e620', 'e622', 'e623', 'e624', 'e625',
  // Caramel IV
  'e150d',
  // Aspartame E-code
  'e951',
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

// Regex-based cosmetic classification. Handles patterns that would need
// dozens of keyword entries otherwise: PEGs/PPGs (peg-8, ppg-15…) and CI
// colour-index codes. CI 75xxx (natural) and CI 77xxx (mineral pigments)
// stay 'safe'; other CI codes are synthetic dyes → caution.
// Both "CI 42090" and the common OCR variant "Cl 42090" are recognized.
const CI_CODE_RE = /\bc[il]\s?(\d{5})\b/;
function cosmeticRegexLevel(nameNorm: string): IngredientLevel | null {
  if (/\bpeg-?\d*\b/.test(nameNorm)) return 'caution';
  if (/\bppg-?\d+\b/.test(nameNorm)) return 'caution';
  const ci = nameNorm.match(CI_CODE_RE);
  if (ci) {
    const code = ci[1];
    if (!(code.startsWith('75') || code.startsWith('77'))) return 'caution';
  }
  return null;
}

export function classifyIngredient(name: string, category: ClassifyCategory = 'unknown'): IngredientLevel {
  // EFSA-covered additives win: match E-code inside the chip name.
  if (category !== 'cosmetic') {
    const nrm = norm(name);
    const codes = nrm.match(/\be-?\s?(\d{3}[a-z]?)\b/g) || [];
    for (const c of codes) {
      const tag = 'en:e' + c.replace(/[^0-9a-z]/gi, '').toLowerCase();
      const entry = ADDITIVES_RISK[tag];
      if (entry?.risk === 'high') return 'avoid';
      if (entry?.risk === 'moderate') return 'caution';
    }
  }
  if (findAny(name, redKeywordsFor(category))) return 'avoid';
  if (category !== 'food') {
    const regexHit = cosmeticRegexLevel(norm(name));
    if (regexHit) return regexHit;
  }
  if (findAny(name, orangeKeywordsFor(category))) return 'caution';
  return 'safe';
}

// --- EFSA additive risk detection (Fase 3 del motor V2) ---------------------
// Data source: Open Food Facts additives taxonomy (ODbL). We only load a
// compact map of additives with EFSA overexposure risk = high | moderate.
// Products missing that flag get ZERO penalization (anti-alarmism principle).

export interface AdditiveRisk {
  tag: string;              // 'en:e250'
  code: string;             // 'e250'
  name: string;             // 'E250 - Nitrito sódico'
  risk: AdditiveRiskLevel;  // 'high' | 'moderate'
  efsa_url?: string;
}

const E_CODE_REGEX = /\bE\s?-?\s?(\d{3}[a-z]?)\b/gi;

export function getAdditiveRisks(p: ProductData): AdditiveRisk[] {
  if (p.category !== 'food') return [];
  const raw = (p.raw || {}) as Record<string, unknown>;
  const tags = Array.isArray(raw.additives_tags) ? (raw.additives_tags as string[]) : [];
  const seen = new Set<string>();
  const push = (tag: string, entry: AdditiveRiskEntry) => {
    if (seen.has(tag)) return;
    seen.add(tag);
    out.push({
      tag,
      code: tag.replace(/^en:/, ''),
      name: entry.name || tag.replace(/^en:/, '').toUpperCase(),
      risk: entry.risk,
      efsa_url: entry.efsa_url,
    });
  };
  const out: AdditiveRisk[] = [];
  for (const t of tags) {
    const norm = String(t).toLowerCase();
    const entry = ADDITIVES_RISK[norm];
    if (entry) push(norm, entry);
  }
  // Fallback for products without additives_tags (photo-scanned): parse
  // inline E-codes from ingredients_text (any language).
  if (out.length === 0 || tags.length === 0) {
    const textFields = [
      p.ingredients_text, raw.ingredients_text_es, raw.ingredients_text_en,
      raw.ingredients_text_fr, raw.ingredients_text_pt,
    ];
    for (const f of textFields) {
      if (typeof f !== 'string' || !f) continue;
      const matches = f.match(E_CODE_REGEX) || [];
      for (const m of matches) {
        const digits = m.replace(/[^0-9a-z]/gi, '').toLowerCase();
        const tag = 'en:e' + digits;
        const entry = ADDITIVES_RISK[tag];
        if (entry) push(tag, entry);
      }
    }
  }
  return out;
}

/** Ingredient chips already covered by an EFSA risk hit (avoids double
 *  penalisation with RED_FOOD / ORANGE_FOOD keyword counters). */
function efsaCoveredNameSet(risks: AdditiveRisk[]): Set<string> {
  const s = new Set<string>();
  const codes = new Set(risks.map(r => r.code));
  for (const c of codes) s.add(c);
  const any = (list: string[]) => list.some(c => codes.has(c));
  if (any(['e220','e221','e222','e223','e224','e226','e227','e228'])) {
    ['sulfite','sulphite','sulfito','metabisulfite'].forEach(k => s.add(k));
  }
  if (any(['e250','e251','e252'])) s.add('nitrite');
  if (codes.has('e621')) { s.add('msg'); s.add('monosodium glutamate'); }
  if (codes.has('e407')) s.add('carrageenan');
  return s;
}

function isEfsaCoveredChip(name: string, coveredSet: Set<string>): boolean {
  if (coveredSet.size === 0) return false;
  const nrm = norm(name);
  for (const k of coveredSet) {
    if (nrm.includes(k)) return true;
  }
  return false;
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
    // Sentence periods (". Contains…") separate INCI list from legal small
    // print. Convert to commas so they split; trailing "denat." style dots
    // (no space after or end-of-string) are preserved for the classifier.
    .replace(/\.\s+/g, ', ')
    // Strip percentages: "100%", "0.5 %", "1,2 %".
    .replace(/\d+([.,]\d+)?\s*%/g, '')
    // Strip quantities with unit: "500 mg", "1.2 ppm", "0.32 p/p", "1 g".
    // Numbers WITHOUT a unit are preserved so INCI names keep their digits
    // (peg-8, ci 42090, polysorbate 20).
    .replace(/\d+([.,]\d+)?\s*(ppm|mg|ml|p\/p)\b/gi, '')
    .replace(/\d+([.,]\d+)?\s*g\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Regulatory / marketing chip filter. Small-print legal text often gets
// OCR'd into the ingredient list ("Contiene X 0,3% p/p", "1450 ppm Fluor",
// "y Calcium…"). These are not INCI ingredients and must be dropped before
// classification.
function isRegulatoryChip(raw: string): boolean {
  const s = raw.toLowerCase();
  if (s.includes('p/p') || s.includes('ppm')) return true;
  if (/(contiene|contains|contient)\s+.*(%|ppm|fluor)/i.test(raw)) return true;
  // Loose conjunctions at the start followed by an uppercase word ("y Calcium…").
  if (/^(y|and|et|e)\s+[A-ZÁÉÍÓÚÑ]/.test(raw)) return true;
  return false;
}

// Instruction / marketing sentences that OCR often blends into the ingredient
// list ("Realizar un ligero masaje", "Manténgase fuera del alcance de los
// niños", "@Limpieza suave y duradera"). These are NOT INCI names. Long
// legitimate INCI (Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Calcium
// Sodium Phosphosilicate) stay under the 5-word cap.
const INSTRUCTION_RE = /\b(aplicar|aplique|aplica|realizar|realice|realiza|enjuagar|enjuague|enxaguar|aclarar|aclare|rinse|evitar|evite|avoid|mantener|mantenga|mantengase|mantenha|keep out|uso externo|external use|contacto con los ojos|alcance de los ni[nñ]os|reach of children|limpieza|limpeza|duradera|duradoura|precauciones|precauco[eé]s|ingerir|f[oó]rmula|formula)\b/i;
function isInstructionChip(raw: string): boolean {
  const s = raw.trim();
  if (!s) return true;
  if (s.startsWith('@') || s.startsWith('#')) return true;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 5) return true;
  const nrm = stripDiacritics(s.toLowerCase());
  if (INSTRUCTION_RE.test(nrm)) return true;
  return false;
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
    .filter(s => s.length > 1 && s.length < 80 && !s.includes(':') && !isRegulatoryChip(s) && !isInstructionChip(s));


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

// --- Data confidence (Fase 1 del motor V2, inspirado en EWG Skin Deep) ------
// Un producto sin datos completos NUNCA puede sacar 100 — la ausencia de
// datos no debe premiarse. Esta función devuelve un cap opcional que se
// aplica a la nota general (y por herencia a la personal).
export type DataConfidenceLevel = 'high' | 'medium' | 'low' | 'none';
export interface DataConfidence {
  level: DataConfidenceLevel;
  cap: number | null;
  missing: string[];
}

const readNutrimentNumber = (nutriments: Record<string, unknown>, key: string): boolean => {
  const v = nutriments[key];
  if (typeof v === 'number' && Number.isFinite(v)) return true;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return false;
    const n = parseFloat(t);
    return Number.isFinite(n);
  }
  return false;
};

export function evaluateDataConfidence(p: ProductData): DataConfidence {
  const rawText = (p.ingredients_text || '').trim();
  const hasIngredients = rawText.length > 0 && !isNutritionalData(rawText);

  if (p.category === 'cosmetic') {
    const segments = rawText
      .split(/[,;()\n\r]/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 80 && !s.includes(':'));
    const count = segments.length;
    if (count >= 5) return { level: 'high', cap: null, missing: [] };
    if (count >= 3) return { level: 'medium', cap: 85, missing: ['lista de ingredientes completa'] };
    return { level: 'none', cap: null, missing: ['lista de ingredientes'] };
  }

  if (p.category === 'food') {
    const raw = (p.raw || {}) as Record<string, unknown>;
    const nutri = (raw.nutriments && typeof raw.nutriments === 'object')
      ? raw.nutriments as Record<string, unknown>
      : {};
    const hasEnergy = readNutrimentNumber(nutri, 'energy-kcal_100g') || readNutrimentNumber(nutri, 'energy-kj_100g');
    const hasSatFat = readNutrimentNumber(nutri, 'saturated-fat_100g');
    const hasSugars = readNutrimentNumber(nutri, 'sugars_100g');
    const hasSalt = readNutrimentNumber(nutri, 'salt_100g') || readNutrimentNumber(nutri, 'sodium_100g');
    const nutriGrade = (p.nutriscore_grade || '').toLowerCase();
    const hasNutriGrade = ['a', 'b', 'c', 'd', 'e'].includes(nutriGrade);
    const missingNutri: string[] = [];
    if (!hasEnergy) missingNutri.push('energía');
    if (!hasSatFat) missingNutri.push('grasas saturadas');
    if (!hasSugars) missingNutri.push('azúcares');
    if (!hasSalt) missingNutri.push('sal');
    const nutritionComplete = missingNutri.length === 0;

    if (!hasIngredients && !nutritionComplete && !hasNutriGrade) {
      return { level: 'none', cap: null, missing: ['tabla nutricional', 'lista de ingredientes'] };
    }

    // Nutriscore or full nutrition table AND ingredients present → high confidence.
    if (hasIngredients && (nutritionComplete || hasNutriGrade)) {
      return { level: 'high', cap: null, missing: [] };
    }

    // Ingredients present but nutrition partial/missing and no Nutriscore.
    if (hasIngredients && !hasNutriGrade) {
      if (missingNutri.length >= 2) {
        return { level: 'low', cap: 60, missing: missingNutri };
      }
      if (missingNutri.length === 1) {
        return { level: 'medium', cap: 75, missing: missingNutri };
      }
    }

    // Nutrition/Nutriscore present but ingredients missing.
    if (!hasIngredients) {
      const miss = ['lista de ingredientes', ...missingNutri];
      return { level: 'low', cap: 60, missing: miss };
    }

    return { level: 'high', cap: null, missing: [] };
  }

  return { level: 'none', cap: null, missing: [] };
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

export function isAlcoholicFood(p: ProductData): boolean {
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
  const isOrganic = p.labels_tags.some(t => t.includes('organic') || t.includes('bio'));
  const rawText = (p.ingredients_text || '').trim();
  const factors: ScoreFactor[] = [];

  // EFSA additive risk: compute once, de-duplicate against RED/ORANGE keyword
  // counters so the same E-number can't penalise twice.
  const additiveRisks = p.category === 'food' ? getAdditiveRisks(p) : [];
  const efsaCovered = efsaCoveredNameSet(additiveRisks);
  const redsEff = flagged.filter(f => f.level === 'avoid' && !isEfsaCoveredChip(f.name, efsaCovered)).length;
  const orangesEff = flagged.filter(f => f.level === 'caution' && !isEfsaCoveredChip(f.name, efsaCovered)).length;
  const reds = redsEff;
  const oranges = orangesEff;

  const applyEfsaAdditives = (score: number): number => {
    if (additiveRisks.length === 0) return score;
    const highs = additiveRisks.filter(r => r.risk === 'high');
    const mods = additiveRisks.filter(r => r.risk === 'moderate');
    let delta = 0;
    let worst: AdditiveRisk | null = null;
    if (highs.length > 0) {
      worst = highs[0];
      delta -= 25;
    } else if (mods.length > 0) {
      worst = mods[0];
      delta -= 12;
    }
    const extras = additiveRisks.length - 1;
    if (extras > 0) delta -= extras * 5;
    if (delta < -35) delta = -35;
    if (worst) {
      const label = worst.risk === 'high'
        ? `Aditivo con riesgo alto de sobreexposición según EFSA: ${worst.name}`
        : `Aditivo con riesgo moderado de sobreexposición según EFSA: ${worst.name}`;
      factors.push({ label, delta: worst.risk === 'high' ? -25 : -12, tone: 'negative' });
      if (extras > 0) {
        const extraDelta = Math.max(-35 - (worst.risk === 'high' ? -25 : -12), -extras * 5);
        factors.push({
          label: `${extras} aditivo${extras > 1 ? 's' : ''} adicional${extras > 1 ? 'es' : ''} con riesgo EFSA`,
          delta: extraDelta,
          tone: 'negative',
        });
      }
    }
    return score + delta;
  };

  // Informative (neutral, no points) factor when a product carries many
  // additives that EFSA has NOT flagged as risky — transparency without
  // alarmism (anti-Yuka principle).
  const maybeAddNoRiskAdditivesNote = () => {
    if (p.category !== 'food') return;
    const raw = (p.raw || {}) as Record<string, unknown>;
    const tags = Array.isArray(raw.additives_tags) ? (raw.additives_tags as string[]) : [];
    const noRisk = tags.filter(t => !ADDITIVES_RISK[String(t).toLowerCase()]);
    if (noRisk.length >= 3) {
      factors.push({
        label: `Contiene ${noRisk.length} aditivos sin riesgo señalado por la EFSA`,
        delta: null,
        tone: 'neutral',
      });
    }
  };


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

  // Data-confidence cap: ausencia de datos no premia. Se aplica DESPUÉS de la
  // nota calculada para que un producto sin tabla nutricional no pueda sacar
  // 100 por defecto (caso real: taco shells fotografiados sin nutrición).
  const confidence = evaluateDataConfidence(p);
  const applyConfidenceCap = (score: number): number => {
    if (confidence.cap == null || score <= confidence.cap) return score;
    const missTxt = confidence.missing.length ? ` (falta: ${confidence.missing.join(', ')})` : '';
    factors.push({
      label: `Nota limitada a ${confidence.cap} por datos incompletos${missTxt}`,
      delta: confidence.cap - score,
      tone: 'neutral',
    });
    return confidence.cap;
  };

  // Natural-fat explanation helper: some pure fats (coco, oliva, coconut oil)
  // score D/E on Nutriscore because saturated fats are penalized regardless
  // of origin. Add a clarifying factor so users understand the nuance.
  const maybeAddNaturalFatNote = (grade: string) => {
    const raw = (p.raw || {}) as Record<string, unknown>;
    const cats = Array.isArray(raw.categories_tags) ? (raw.categories_tags as string[]) : [];
    const isFatCategory = cats.some(t => ['en:fats', 'en:vegetable-fats', 'en:vegetable-oils', 'en:fats-and-oils', 'en:coconut-oils', 'en:olive-oils'].includes(String(t).toLowerCase()));
    if (!isFatCategory) return;
    if (grade !== 'd' && grade !== 'e') return;
    const top = topIngredients(p.ingredients_text || '', 3);
    if (top.length > 1) return; // multi-ingredient fat products don't get the exemption note
    factors.push({
      label: 'El Nutri-Score penaliza las grasas saturadas aunque sean naturales',
      delta: null,
      tone: 'neutral',
    });
  };

  if (p.category === 'food' && hasNutri) {
    const cleanMap: Record<string, number> = { a: 95, b: 82, c: 62, d: 40, e: 18 };
    let score = cleanMap[nutriGrade] ?? 50;
    const nutriTone: FactorTone =
      nutriGrade === 'a' || nutriGrade === 'b' ? 'positive'
      : nutriGrade === 'c' ? 'neutral'
      : 'negative';
    factors.push({ label: `Nutriscore ${nutriGrade.toUpperCase()}`, delta: null, tone: nutriTone });
    maybeAddNaturalFatNote(nutriGrade);

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
    score = applyEfsaAdditives(score);
    maybeAddNoRiskAdditivesNote();
    score = applyAlcoholCap(score);
    score = applyConfidenceCap(score);
    return { score: clamp100(score), factors };
  }

  // Food-without-official-nutriscore: try computing our own Nutri-Score 2023
  // from the raw nutriments. If it succeeds, we use it just like an official
  // grade (same downstream flow). If not, fall back to the ingredient-only
  // fallback below.
  if (p.category === 'food' && !hasNutri) {
    const raw = (p.raw || {}) as Record<string, unknown>;
    const nutri = (raw.nutriments && typeof raw.nutriments === 'object')
      ? raw.nutriments as Record<string, unknown>
      : {};
    const cats = Array.isArray(raw.categories_tags) ? (raw.categories_tags as string[]) : [];
    const computed = computeNutriScore(nutri, cats, raw);
    if (computed) {
      let score = nutriScoreToNote(computed.score, computed.grade, computed.category);
      const tone: FactorTone =
        computed.grade === 'a' || computed.grade === 'b' ? 'positive'
        : computed.grade === 'c' ? 'neutral' : 'negative';
      factors.push({
        label: `Nutriscore calculado por Maseya: ${computed.grade.toUpperCase()}`,
        delta: null,
        tone,
      });
      maybeAddNaturalFatNote(computed.grade);
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
      score = applyEfsaAdditives(score);
      maybeAddNoRiskAdditivesNote();
      score = applyAlcoholCap(score);
      score = applyConfidenceCap(score);
      return { score: clamp100(score), factors };
    }
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
  score = applyConfidenceCap(score);
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
const SUGAR_KEYWORDS = [
  'azúcar', 'azucar', 'sugar', 'sucre', 'zucker',
  'sacarosa', 'sucrose', 'saccharose',
  'jarabe de glucosa', 'jarabe de maíz', 'jarabe de maiz', 'jarabe de fructosa',
  'glucose syrup', 'corn syrup', 'high fructose', 'fructose syrup',
  'glucosa', 'fructosa', 'dextrosa', 'dextrose', 'maltosa', 'maltose', 'lactosa cristalizada',
  'maltodextrina', 'maltodextrin',
  'sirope', 'syrup', 'jarabe de agave', 'agave syrup',
  'miel', 'honey',
  'melaza', 'molasses',
  'panela', 'piloncillo', 'azúcar moreno', 'azucar moreno', 'brown sugar', 'azúcar invertido', 'invert sugar',
];
// "Added sugar" keywords — ONLY entries that are unambiguously added sugars
// (excludes bare "glucosa"/"fructosa"/"maltosa" which can be natural in fruit/milk).
const ADDED_SUGAR_KEYWORDS = [
  'azúcar', 'azucar', 'sugar', 'sucre', 'zucker',
  'sacarosa', 'sucrose', 'saccharose',
  'jarabe de glucosa', 'jarabe de maíz', 'jarabe de maiz', 'jarabe de fructosa',
  'glucose syrup', 'corn syrup', 'high fructose', 'high-fructose', 'fructose syrup',
  'glucose-fructose', 'jarabe glucosa-fructosa',
  'dextrosa', 'dextrose',
  'maltodextrina', 'maltodextrin',
  'sirope', 'jarabe de agave', 'agave syrup',
  'miel', 'honey',
  'melaza', 'molasses',
  'panela', 'piloncillo', 'azúcar moreno', 'azucar moreno', 'brown sugar',
  'azúcar invertido', 'invert sugar',
];
const PREGNANCY_RISKY = ['retinol', 'retinyl', 'retinal', 'salicylic acid', 'salicylate', 'hydroquinone', 'formaldehyde', 'phthalate', 'caffeine', 'cafeina'];

/**
 * Detect dietary supplements — they must NOT be scored with food criteria
 * (Nutriscore doesn't apply, sugars/salt/fat rules make no sense on capsules).
 */
const SUPPLEMENT_CATEGORY_TAGS = new Set<string>([
  'en:dietary-supplements', 'en:food-supplements', 'en:supplements',
  'en:vitamins', 'en:mineral-supplements', 'en:plant-based-supplements',
  'en:herbal-supplements',
]);
const SUPPLEMENT_NAME_KEYWORDS = [
  'suplemento', 'supplement', 'complemento aliment', 'complemento nutricional',
  'cápsulas', 'capsulas', 'capsules', 'cápsula', 'capsula',
  'ashwagandha', 'ksm-66', 'ginseng', 'maca ',
  'colágeno hidrolizado', 'multivitamin', 'multivitamínico', 'multivitaminico',
];
export function isSupplement(p: ProductData): boolean {
  const raw = (p.raw || {}) as Record<string, unknown>;
  const cats = Array.isArray(raw.categories_tags) ? (raw.categories_tags as string[]) : [];
  if (cats.some(t => SUPPLEMENT_CATEGORY_TAGS.has(String(t).toLowerCase()))) return true;
  const name = `${p.name || ''} ${p.brand || ''}`.toLowerCase();
  for (const kw of SUPPLEMENT_NAME_KEYWORDS) {
    if (name.includes(kw)) return true;
  }
  // "vitamina X" + cápsula format
  if (/vitamina\s+[a-z0-9]/i.test(name) && /(cáps|caps|comprim|tablet|pastill)/i.test(name)) {
    return true;
  }
  return false;
}

function topIngredients(text: string, n: number): string[] {
  if (!text) return [];
  return text
    .split(/[,;()\n\r]/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0 && !/^\d/.test(s))
    .slice(0, n);
}
function readNumber(nutri: Record<string, unknown>, key: string): number | null {
  const v = nutri[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

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
  const tracesTags = Array.isArray(p.traces_tags) ? p.traces_tags : [];

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

    // Declared allergen (manufacturer-tagged allergens_tags) = hard fail.
    // Traces_tags = hard fail too when the user has a strict allergy.
    // Text-only detection keeps the strong penalty but not a hard fail
    // (may be a plant variant or ambiguous mention).
    // IMPORTANT: use the same tagMatches helper personalAlerts uses so
    // the "declared by manufacturer" alert and the score can't disagree.
    const allergyLabelFor = (a: string) =>
      a === 'gluten' ? 'gluten' : a === 'lactose' ? 'lácteos' : a === 'nuts' ? 'frutos secos' : a === 'fish' ? 'pescado/marisco' : a;

    const checkAllergy = (key: string, _kws: string[], textHit: string | null) => {
      if (!allergies.includes(key)) return;
      const tagIds = ALLERGY_TAG_IDS[key];
      const declared = tagIds ? tagMatches(allergensTags, tagIds) : false;
      const inTraces = tagIds ? tagMatches(tracesTags, tagIds) : false;
      const label = allergyLabelFor(key);
      if (declared) {
        addHardFail(`No apto para ti: contiene ${label} declarado por el fabricante`);
      } else if (inTraces) {
        addHardFail(`No apto para ti: puede contener trazas de ${label} (declarado por el fabricante)`);
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

    // Sugar-restrictive diets.
    // no-sugar → strict rules based on nutriments + added-sugar keywords.
    // keto (legacy) → penalize any sugar mention (unchanged behavior).
    if (diets.includes('no-sugar')) {
      const nutri = (rawObj.nutriments && typeof rawObj.nutriments === 'object')
        ? rawObj.nutriments as Record<string, unknown>
        : {};
      const sugars = readNumber(nutri, 'sugars_100g');
      const top3 = topIngredients(rawText, 3);
      let addedInTop3: string | null = null;
      for (const ing of top3) {
        for (const kw of ADDED_SUGAR_KEYWORDS) {
          if (findKeyword(ing, kw)) { addedInTop3 = kw; break; }
        }
        if (addedInTop3) break;
      }
      const addedAnywhere = firstTerm(combined, ADDED_SUGAR_KEYWORDS);
      const highSugars = sugars != null && sugars > 22.5;
      const midSugars = sugars != null && sugars >= 5 && sugars <= 22.5;
      if (highSugars || addedInTop3) {
        const reason = addedInTop3
          ? `azúcar añadido entre los 3 primeros ingredientes ("${addedInTop3}")`
          : `alto en azúcar (${sugars?.toFixed(1)}g/100g)`;
        addHardFail(`Alto en azúcar / azúcar añadido — no compatible con tu dieta sin azúcar (detectado: ${reason})`);
      } else if (midSugars && addedAnywhere) {
        addNeg(`Contiene azúcar añadido (${sugars?.toFixed(1)}g/100g, detectado: "${addedAnywhere}") — no ideal para tu dieta sin azúcar`, -30);
      } else if (sugars != null && sugars > 5 && !addedAnywhere) {
        addNeg(`Azúcares naturales presentes (${sugars.toFixed(1)}g/100g)`, -10);
      }
    } else if (diets.includes('keto')) {
      const sugarTerm = firstTerm(combined, SUGAR_KEYWORDS);
      const sugarTagHit = catsTags.some(t => t.includes('sugared') || t.includes('sweetened') || t.includes('sugary')) ||
        p.labels_tags.some(t => t.includes('sugared') || t.includes('sweetened'));
      if (sugarTerm || sugarTagHit) {
        addNeg(`No apto para tu dieta keto: contiene azúcar añadido${sugarTerm ? ` ("${sugarTerm}")` : ''}`, -40);
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

    // No-sugar diet alerts (strict: sugars_100g + added-sugar ingredients)
    if (diets.includes('no-sugar')) {
      const combined = `${rawText} ${rawTagsText}`;
      const nutri = ((p.raw as Record<string, unknown> | undefined)?.nutriments && typeof (p.raw as Record<string, unknown>).nutriments === 'object')
        ? ((p.raw as { nutriments: Record<string, unknown> }).nutriments)
        : {};
      const sugars = readNumber(nutri, 'sugars_100g');
      const top3 = topIngredients(rawText, 3);
      let addedInTop3: string | null = null;
      for (const ing of top3) {
        for (const kw of ADDED_SUGAR_KEYWORDS) {
          if (findKeyword(ing, kw)) { addedInTop3 = kw; break; }
        }
        if (addedInTop3) break;
      }
      const addedAnywhere = firstTerm(combined, ADDED_SUGAR_KEYWORDS);
      const highSugars = sugars != null && sugars > 22.5;
      const midSugars = sugars != null && sugars >= 5 && sugars <= 22.5;
      if (highSugars || addedInTop3) {
        const reason = addedInTop3
          ? `«${addedInTop3}» entre los 3 primeros ingredientes`
          : `${sugars?.toFixed(1)}g de azúcar por 100g`;
        alerts.push({
          level: 'danger',
          text: `Alto en azúcar / azúcar añadido — no compatible con tu dieta sin azúcar (detectado: ${reason}).`,
        });
      } else if (midSugars && addedAnywhere) {
        alerts.push({
          level: 'warn',
          text: `Contiene azúcar añadido (${sugars?.toFixed(1)}g/100g, detectado: «${addedAnywhere}»).`,
        });
      } else if (sugars != null && sugars > 5 && !addedAnywhere) {
        alerts.push({
          level: 'warn',
          text: `Azúcares naturales presentes (${sugars.toFixed(1)}g/100g) — sin azúcar añadido detectado.`,
        });
      } else {
        alerts.push({
          level: 'good',
          text: 'Sin azúcares añadidos detectados: compatible con tu dieta sin azúcar.',
        });
      }
    } else if (diets.includes('keto')) {
      const combined = `${rawText} ${rawTagsText}`;
      const sugarTerm = firstTerm(combined, SUGAR_KEYWORDS);
      if (sugarTerm) {
        alerts.push({
          level: 'danger',
          text: `Contiene azúcar añadido — no compatible con tu dieta keto (detectado: "${sugarTerm}").`,
        });
      } else {
        alerts.push({
          level: 'good',
          text: 'Sin azúcares añadidos detectados: compatible con tu dieta keto.',
        });
      }
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
