/**
 * Scoring + personalization rules for the scan result page.
 */
import type { ProductData } from './productLookup';
import { computeNutriScore, nutriScoreToNote } from './nutriscore';
import { ADDITIVES_RISK, ADDITIVE_NAME_SYNONYMS, type AdditiveRiskEntry, type AdditiveRiskLevel } from './additivesRisk';

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
  // Banned in EU cosmetics since 2022-03-01 (CMR 1B)
  'butylphenyl methylpropional', 'lilial', 'bmhca',
  // Isothiazolinone preservatives — strongly restricted contact sensitizers
  'methylchloroisothiazolinone', 'methylisothiazolinone', 'mci/mi', 'cmit/mit',
];

const RED_FOOD = [
  'nitrite', 'aspartame', 'tartrazine', 'e102',
  // Nitrites / nitrates (processed meats)
  'e249', 'e250', 'e251', 'e252',
  // BHA / BHT E-codes
  'e320', 'e321',
];

// Banned (CMR 1B, EU 2022) or severely restricted cosmetic ingredients.
const EU_BANNED_COSMETIC = [
  'butylphenyl methylpropional', 'lilial', 'bmhca',
  'methylchloroisothiazolinone', 'methylisothiazolinone', 'mci/mi', 'cmit/mit',
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
  // Text pass: inline E-codes (photo-scanned products) AND plain additive
  // names ("sorbato potásico"), very common on Spanish labels. Runs always;
  // `push` dedupes so a tag detected twice counts once.
  {
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
      for (const [syn, tag] of Object.entries(ADDITIVE_NAME_SYNONYMS)) {
        const entry = ADDITIVES_RISK[tag];
        if (!entry || seen.has(tag)) continue;
        if (findKeyword(f, syn)) push(tag, entry);
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
  // Also cover the additive's plain name ("ácido sórbico", "sorbato potásico")
  // so a chip upgraded to red by the EFSA pass never double-penalises.
  for (const r of risks) {
    const plain = norm(r.name).split(' - ').pop()?.trim();
    if (plain && plain.length > 3) s.add(plain);
  }
  return s;
}

function isEfsaCoveredChip(name: string, coveredSet: Set<string>): boolean {
  if (coveredSet.size === 0) return false;
  // Compare both the plain and the compacted form so "E-200" / "E 200"
  // still match the "e200" code and never penalise twice.
  const nrm = norm(name);
  const compact = nrm.replace(/[^a-z0-9]/g, '');
  for (const k of coveredSet) {
    const kc = k.replace(/[^a-z0-9]/g, '');
    if (nrm.includes(k) || (kc.length > 2 && compact.includes(kc))) return true;
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

// Nutrition-table detection. STRICT on purpose: an ingredient list often
// contains numbers, percentages and even isolated words like "proteínas"
// (e.g. "proteínas de leche"), and treating those as a nutrition table made
// the photo flow reject perfectly valid ingredient photos (bug real, 6 users).
// A text is only a nutrition table when it shows SEVERAL distinct nutrient
// markers AND the numeric structure of a table (energy units or "por 100 g").
const NUTRITION_MARKER_GROUPS: RegExp[] = [
  /\b(valor(es)? energ[eé]tico|energ[ií]a|energy)\b/,
  /\b\d[\d.,]*\s*(kcal|kj)\b|\bkcal\b.*\bkj\b|\bkj\b.*\bkcal\b/,
  /\b(grasas|grasa|fat|mati[eè]res grasses)\b.*\b(saturad|saturat)/,
  /\b(hidratos de carbono|carbohydrate|glucides)\b/,
  /\b(prote[ií]nas?|protein|prot[ée]ines)\b/,
  /\b(sal|salt|sel|sodio|sodium)\b\s*[:\d]/,
  /\b(fibra alimentaria|dietary fibre|fibres)\b/,
];
const NUTRITION_STRUCTURE_RE = /(por|per|pour|\/)\s*100\s*(g|ml)|\b\d[\d.,]*\s*(kcal|kj)\b|ingesta de referencia|reference intake/;

export function isNutritionalData(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  const hits = NUTRITION_MARKER_GROUPS.filter(re => re.test(t)).length;
  return hits >= 3 && NUTRITION_STRUCTURE_RE.test(t);
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

/**
 * Ordered canonical keys of the INCI list parsed from `ingredients_text`.
 * Order matters: Reg. (CE) 1223/2009 requires decreasing concentration.
 * Returns [] when there is no usable text (never guess order from tags).
 */
export function orderedInciKeys(text: string): string[] {
  if (!text || isNutritionalData(text)) return [];
  const cleaned = cleanIngredientsText(text);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of cleaned.split(/[,;()\n\r]|\s[-–—•·]\s/)) {
    const s = part.trim();
    if (s.length < 2 || s.length > 80) continue;
    if (isRegulatoryChip(s) || isInstructionChip(s)) continue;
    const key = canonicalKey(s);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function flagIngredients(p: ProductData): FlaggedIngredient[] {
  if (isNutritionalData(p.ingredients_text)) return [];
  const fromTags = p.ingredients_tags
    .map(t => t.replace(/^[a-z]{2}:/, '').replace(/-/g, ' '))
    .filter(Boolean);
  const cleanedText = cleanIngredientsText(p.ingredients_text || '');
  const fromText = cleanedText
    .split(/[,;()\n\r]|\s[-–—•·]\s/)
    .map(s => s.trim())
    // "conservador: E-200" / "colorante: E133" → keep the additive itself
    // instead of dropping the whole segment because it contains a colon.
    .map(s => {
      if (!s.includes(':')) return s;
      const tail = s.slice(s.lastIndexOf(':') + 1).trim();
      return tail.length > 1 && tail.length < 40 ? tail : '';
    })
    .filter(s => s.length > 1 && s.length < 80 && !isRegulatoryChip(s) && !isInstructionChip(s));


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
  // Transparency: additives with an EFSA overexposure risk must ALWAYS be
  // visible as a red (high) / orange (moderate) chip, even when their numeric
  // penalty is attenuated because the Nutri-Score already prices the product
  // as bad. The score is unaffected (these chips are de-duplicated out of the
  // red/orange counters via `isEfsaCoveredChip`).
  const risks = getAdditiveRisks(p);
  if (risks.length > 0) {
    const covered = efsaCoveredNameSet(risks);
    const compact = (v: string) => norm(v).replace(/[^a-z0-9]/g, '');
    const worstRisk = (name: string): AdditiveRiskLevel | null => {
      const nrm = norm(name) + ' ' + compact(name);
      let found: AdditiveRiskLevel | null = null;
      for (const r of risks) {
        const keys = [r.code, compact(r.code), ...norm(r.name).split(' - ')];
        const match = keys.some(k => k && k.length > 2 && nrm.includes(k.trim()));
        if (!match) continue;
        if (r.risk === 'high') return 'high';
        found = 'moderate';
      }
      if (found) return found;
      return isEfsaCoveredChip(name, covered) ? 'moderate' : null;
    };
    for (const f of flagged) {
      const r = worstRisk(f.name);
      if (r === 'high') f.level = 'avoid';
      else if (r === 'moderate' && f.level === 'safe') f.level = 'caution';
    }
  }
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
    // Some labels separate INCI items with " - " or bullets instead of commas
    // (real case: SYOSS). Without this the whole list counted as ONE segment
    // and the app kept asking for a photo of ingredients we already had.
    const segments = rawText
      .split(/[,;()\n\r]|\s[-–—•·]\s/)
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
      // No ingredients AND no usable nutrition: the absence of data must never
      // produce a good score (bug real: pavo/ajo sin datos salían con 100).
      return { level: 'none', cap: 40, missing: ['tabla nutricional', 'lista de ingredientes'] };
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

  const applyEfsaAdditives = (score: number, nutriGrade?: string): number => {
    if (additiveRisks.length === 0) return score;
    // Attenuate EFSA penalty when the Nutri-Score already prices the product
    // as bad (D/E). Otherwise we double-count "this product is unhealthy"
    // (Nutri-Score already reflects sugars/salt/sat-fat exposure).
    const g = (nutriGrade || '').toLowerCase();
    const attenuation = g === 'e' ? 0 : g === 'd' ? 0.5 : 1;
    if (attenuation === 0) {
      // Grade E already prices the product at the floor. Surface a neutral
      // factor per risky additive so the desglose doesn't silently omit what
      // the red/orange chips show. The numeric score does NOT change.
      for (const r of additiveRisks.slice(0, 4)) {
        factors.push({
          label: r.risk === 'high'
            ? `Aditivo de riesgo alto según EFSA: ${r.name} (ya reflejado en la nota)`
            : `Aditivo de riesgo moderado según EFSA: ${r.name} (ya reflejado en la nota)`,
          delta: null,
          tone: 'neutral',
        });
      }
      return score;
    }

    const highs = additiveRisks.filter(r => r.risk === 'high');
    const mods = additiveRisks.filter(r => r.risk === 'moderate');
    let worst: AdditiveRisk | null = null;
    let base = 0;
    if (highs.length > 0) { worst = highs[0]; base = -25; }
    else if (mods.length > 0) { worst = mods[0]; base = -12; }
    const extras = additiveRisks.length - 1;
    const extrasDelta = extras > 0 ? -extras * 5 : 0;
    let delta = base + extrasDelta;
    if (delta < -35) delta = -35;
    delta = Math.round(delta * attenuation);
    if (!worst) return score;
    const label = worst.risk === 'high'
      ? `Aditivo con riesgo alto de sobreexposición según EFSA: ${worst.name}`
      : `Aditivo con riesgo moderado de sobreexposición según EFSA: ${worst.name}`;
    const worstDelta = Math.round(base * attenuation);
    factors.push({ label, delta: worstDelta, tone: 'negative' });
    if (extras > 0) {
      const remaining = delta - worstDelta;
      if (remaining < 0) {
        factors.push({
          label: `${extras} aditivo${extras > 1 ? 's' : ''} adicional${extras > 1 ? 'es' : ''} con riesgo EFSA`,
          delta: remaining,
          tone: 'negative',
        });
      } else {
        // Penalty attenuated to 0 for the extras: keep them visible.
        for (const r of additiveRisks.filter(r => r !== worst).slice(0, 3)) {
          factors.push({
            label: r.risk === 'high'
              ? `Aditivo de riesgo alto según EFSA: ${r.name} (ya reflejado en la nota)`
              : `Aditivo de riesgo moderado según EFSA: ${r.name} (ya reflejado en la nota)`,
            delta: null,
            tone: 'neutral',
          });
        }
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

  // Neutral transparency factor: intense/polyol sweeteners have no documented
  // EFSA over-exposure risk in our table, so they never cost points — but the
  // user deserves to know they're there (real case: "confitura 0%" at 95).
  const SWEETENERS: Array<[string, RegExp]> = [
    ['sucralosa', /\bsucralosa\b|\bsucralose\b|\be955\b/],
    ['sorbitol', /\bsorbitol\b|\be420\b/],
    ['maltitol', /\bmaltitol\b|\be965\b/],
    ['glucósidos de esteviol', /glucosidos? de esteviol|glycosides? de steviol|steviol glycosides?|\bstevia\b|\be960\b/],
    ['aspartamo', /\baspartamo\b|\baspartame\b|\be951\b/],
    ['acesulfamo K', /acesulfam\w*|\be950\b/],
    ['xilitol', /\bxilitol\b|\bxylitol\b|\be967\b/],
    ['sacarina', /\bsacarina\b|\bsaccharin\w*\b|\be954\b/],
  ];
  const maybeAddSweetenersNote = () => {
    if (p.category !== 'food') return;
    const raw = (p.raw || {}) as Record<string, unknown>;
    const hay = norm(
      `${p.ingredients_text || ''} ${(Array.isArray(raw.additives_tags) ? (raw.additives_tags as string[]) : []).join(' ')}`,
    );
    if (!hay.trim()) return;
    const found = SWEETENERS.filter(([, re]) => re.test(hay)).map(([name]) => name);
    if (found.length === 0) return;
    factors.push({
      label: `Contiene edulcorantes: ${found.join(', ')}`,
      delta: null,
      tone: 'neutral',
    });
  };



  const nutriGrade = (p.nutriscore_grade || '').toLowerCase();
  const hasNutri = ['a', 'b', 'c', 'd', 'e'].includes(nutriGrade);
  const nonScorableAlcohol = p.category === 'food' && isAlcoholicFood(p);
  // Alcoholic beverages are out of Nutri-Score scope. The ResultPage renders
  // them via the "non-scorable" branch (no score circles), so this function
  // shouldn't produce a numeric score for them. Keeping a no-op cap here for
  // any legacy callers that still run the full score path on alcohol.
  const applyAlcoholCap = (score: number): number => {
    if (!nonScorableAlcohol) return score;
    factors.push({ label: 'Bebida alcohólica — fuera del ámbito del Nutri-Score', delta: null, tone: 'neutral' });
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
    score = applyEfsaAdditives(score, nutriGrade);
    maybeAddNoRiskAdditivesNote();
    maybeAddSweetenersNote();
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
      score = applyEfsaAdditives(score, computed.grade);
      maybeAddNoRiskAdditivesNote();
    maybeAddSweetenersNote();
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

  // --- Cosmetic position weighting (Reg. CE 1223/2009) ----------------------
  // INCI lists are ordered by decreasing concentration, so a problematic
  // ingredient in the first positions is present in a much higher amount.
  // Only applied when we know the REAL order (parsed ingredients_text).
  const inciOrder = p.category === 'cosmetic' ? orderedInciKeys(rawText) : null;
  const boosted: string[] = [];
  const positionWeight = (name: string): number => {
    if (!inciOrder || inciOrder.length < 3) return 1;
    const i = inciOrder.indexOf(canonicalKey(name));
    if (i < 0) return 1;
    const w = i < 3 ? 1.6 : i < 5 ? 1.3 : 1;
    if (w > 1) boosted.push(name);
    return w;
  };
  const levelWeights = (level: IngredientLevel): number[] =>
    flagged
      .filter(f => f.level === level && !isEfsaCoveredChip(f.name, efsaCovered))
      .map(f => positionWeight(f.name));
  // Diminishing returns: a shampoo with several "caution" ingredients (or
  // several mild "avoid" ones such as sulfates) is a normal supermarket
  // product, not the worst product on earth. Each extra hit penalizes less so
  // the accumulation never collapses the score to 0. Severe "avoid" ingredients
  // (formaldehyde & releasers, parabens, phthalates, triclosan, problematic UV
  // filters) keep their FULL linear penalty — those may sink a product.
  const DIMINISH_AVOID = [1, 0.6, 0.4, 0.25, 0.15];
  const DIMINISH_CAUTION = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.6];
  const diminishedSum = (weights: number[], schedule: number[], tail: number): number =>
    weights
      .slice()
      .sort((a, b) => b - a)
      .reduce((sum, w, i) => sum + w * (schedule[i] ?? tail), 0);

  const SEVERE_AVOID = [
    'paraben', 'phthalate', 'formaldehyde', 'triclosan',
    'dmdm hydantoin', 'imidazolidinyl urea', 'diazolidinyl urea', 'quaternium-15',
    'oxybenzone', 'benzophenone-3',
    'butylphenyl methylpropional', 'lilial', 'bmhca',
    'methylchloroisothiazolinone', 'methylisothiazolinone', 'mci/mi', 'cmit/mit',
  ];

  const isSevereAvoid = (name: string) => findAny(name, SEVERE_AVOID) !== null;
  let hasSevereAvoid = false;

  let redPenalty: number;
  let orangePenalty: number;
  if (p.category === 'cosmetic') {
    const avoidItems = flagged.filter(
      f => f.level === 'avoid' && !isEfsaCoveredChip(f.name, efsaCovered)
    );
    const severeW = avoidItems.filter(f => isSevereAvoid(f.name)).map(f => positionWeight(f.name));
    const mildW = avoidItems.filter(f => !isSevereAvoid(f.name)).map(f => positionWeight(f.name));
    hasSevereAvoid = severeW.length > 0;
    const severeSum = severeW.reduce((s, w) => s + w, 0);
    // Severe avoids hit harder (20/unit) so they can still sink a product.
    redPenalty = Math.round(severeSum * 20 + diminishedSum(mildW, DIMINISH_AVOID, 0.1) * 15);
    // Cap the cumulative "caution" penalty: common preservatives, silicones
    // and fragrance should not add up to a catastrophic score by themselves.
    orangePenalty = Math.min(
      42,
      Math.round(diminishedSum(levelWeights('caution'), DIMINISH_CAUTION, 0.5) * 6)
    );
  } else {
    redPenalty = Math.round(reds * 15);
    orangePenalty = Math.round(oranges * 6);
  }

  let score = 100 - redPenalty - orangePenalty;


  if (reds > 0) {
    factors.push({
      label: `${reds} ingrediente${reds > 1 ? 's' : ''} a evitar`,
      delta: -redPenalty, tone: 'negative',
    });
  }
  if (oranges > 0) {
    factors.push({
      label: `${oranges} ingrediente${oranges > 1 ? 's' : ''} con precaución`,
      delta: -orangePenalty, tone: 'negative',
    });
  }
  if (boosted.length > 0) {
    const uniq = Array.from(new Set(boosted)).slice(0, 3);
    factors.push({
      label: `${uniq.join(', ')} aparece${uniq.length > 1 ? 'n' : ''} entre los primeros de la lista (mayor concentración)`,
      delta: null, tone: 'negative',
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

  // Cosmetic scale: "sin ingredientes problemáticos" is the norm, not an
  // achievement. Base ceiling 88; only real positive signals lift it to 100.
  if (p.category === 'cosmetic') {
    const labels = (p.labels_tags || []).map(t => String(t).toLowerCase());
    const certified = labels.some(t =>
      ['en:organic', 'en:ecocert', 'en:cosmos-organic', 'en:cosmos', 'en:natrue'].some(c => t.includes(c.replace('en:', '')))
    );
    const inciCount = flagged.length;
    const beneficialTerms = ['aloe', 'panthenol', 'niacinamide', 'hyaluron', 'glycerin', 'glicerina', 'avena', 'oat', 'centella', 'squalane', 'escualano', 'ceramide', 'ceramida'];
    const combinedTxt = norm(`${rawText} ${flagged.map(f => f.name).join(' ')}`);
    const hasActive = beneficialTerms.some(t => combinedTxt.includes(t));

    let bonus = 0;
    if (certified) bonus += 6;
    if (inciCount > 0 && inciCount <= 12) bonus += 4;
    if (hasActive) bonus += 3;
    const ceiling = Math.min(100, 88 + bonus);
    if (score > ceiling) {
      factors.push({
        label: bonus > 0
          ? `Escala cosmética: máximo ${ceiling} con las señales positivas detectadas`
          : 'Escala cosmética: sin señales positivas verificadas, máximo 88',
        delta: ceiling - score,
        tone: 'neutral',
      });
      score = ceiling;
    }

    // Ingredients banned / severely restricted in EU cosmetics: a product that
    // still contains them is a serious signal, so the note is capped very low.
    const bannedTerm = findAny(rawText, EU_BANNED_COSMETIC);
    if (bannedTerm && score > 20) {
      factors.push({
        label: `Contiene un ingrediente prohibido o muy restringido en la UE (${bannedTerm})`,
        delta: 20 - score,
        tone: 'negative',
      });
      score = 20;
    }



    // Floor: without any "avoid" ingredient, an ordinary formula can never be
    // the worst possible product. Accumulated "caution" hits alone stop at 40.
    if (!hasSevereAvoid && score < 40) {
      factors.push({
        label: 'Sin ingredientes de alto riesgo: la nota no baja de 40',
        delta: 40 - score,
        tone: 'positive',
      });
      score = 40;
    }
  }


  score = applyEfsaAdditives(score);
  maybeAddNoRiskAdditivesNote();
    maybeAddSweetenersNote();
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
  /** Hair layer (cosmetics only). */
  hair_type?: string;
  hair_condition?: string;
  hair_concerns?: string[];
  /** UI language for personal factors/alerts. Defaults to Spanish. */
  language?: string;
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

// ---------------------------------------------------------------------------
// Pregnancy / lactation — FOOD layer (source: AESAN recommendations).
// Level A = hard fail, Level B = strong warning (-40), Level C = informational.
// Cosmetic pregnancy rules above are untouched.
// ---------------------------------------------------------------------------
export type PregnancyLevel = 'A' | 'B' | 'C';
type PregLang = 'es' | 'en' | 'fr';

interface PregRule {
  id: string;
  level: PregnancyLevel;
  keywords: string[];
  tags?: string[];
  excludes?: string[];

  text: Record<PregLang, string>;
}

const PREG_AESAN_NOTE: Record<PregLang, string> = {
  es: 'Recomendación de AESAN. Consulta con tu matrona o médico.',
  en: 'AESAN recommendation. Check with your midwife or doctor.',
  fr: 'Recommandation de l’AESAN. Parles-en à ta sage-femme ou à ton médecin.',
};

const PREG_NOT_SUITABLE: Record<PregLang, string> = {
  es: 'No apto en el embarazo',
  en: 'Not suitable during pregnancy',
  fr: 'Non adapté pendant la grossesse',
};

const PREG_DETECTED: Record<PregLang, (t: string) => string> = {
  es: t => ` (detectado: "${t}")`,
  en: t => ` (detected: "${t}")`,
  fr: t => ` (détecté : « ${t} »)`,
};

const PREGNANCY_FOOD_RULES: PregRule[] = [
  {
    id: 'raw-milk',
    level: 'A',
    keywords: [
      'leche cruda', 'leche sin pasteurizar', 'lait cru', 'au lait cru',
      'raw milk', 'unpasteurized', 'unpasteurised', 'sin pasteurizar',
      'no pasteurizado', 'no pasteurizada', 'leite cru',
    ],
    tags: ['en:raw-milk-cheeses'],
    text: {
      es: 'Leche cruda o sin pasteurizar: se desaconseja durante el embarazo por el riesgo de listeriosis',
      en: 'Raw or unpasteurized milk: not advised during pregnancy due to listeriosis risk',
      fr: 'Lait cru ou non pasteurisé : déconseillé pendant la grossesse (risque de listériose)',
    },
  },
  {
    id: 'high-mercury-fish',
    level: 'A',
    keywords: [
      'pez espada', 'emperador', 'atún rojo', 'atun rojo', 'tiburón', 'tiburon',
      'cazón', 'cazon', 'marrajo', 'lucio', 'swordfish', 'bluefin tuna', 'shark', 'pike',
    ],
    text: {
      es: 'Pescado con alto contenido en mercurio: AESAN recomienda evitarlo en el embarazo y la lactancia',
      en: 'High-mercury fish: AESAN advises avoiding it during pregnancy and breastfeeding',
      fr: 'Poisson à forte teneur en mercure : à éviter pendant la grossesse et l’allaitement',
    },
  },
  {
    id: 'raw-smoked-fish',
    level: 'A',
    keywords: [
      'salmón ahumado', 'salmon ahumado', 'salmó fumat', 'salmo fumat', 'smoked salmon',
      'sashimi', 'sushi', 'ceviche', 'carpaccio de pescado', 'boquerones en vinagre',
      'anchoas marinadas', 'pescado crudo', 'trucha ahumada', 'bacalao ahumado',
    ],
    tags: ['en:smoked-salmons', 'en:smoked-fish', 'en:raw-fish'],
    text: {
      es: 'Pescado crudo o ahumado en frío: la Listeria sobrevive a la congelación y solo se elimina con calor',
      en: 'Raw or cold-smoked fish: Listeria survives freezing and is only killed by heat',
      fr: 'Poisson cru ou fumé à froid : la Listeria survit à la congélation, seule la cuisson l’élimine',
    },
  },
  {
    id: 'soft-cheese',
    level: 'B',
    keywords: [
      'camembert', 'brie', 'roquefort', 'gorgonzola', 'queso azul', 'cabrales',
      'queso fresco', 'burrata', 'mozzarella fresca', 'feta', 'queso de cabra fresco',
      'brique fondante',
    ],
    tags: ['en:blue-cheeses', 'en:soft-cheeses', 'en:mould-ripened-cheeses'],
    text: {
      es: 'Queso blando o de corteza enmohecida: aunque esté pasteurizado, la Listeria puede crecer durante la maduración; se recomienda tomarlo solo cocinado a más de 70 °C',
      en: 'Soft or mould-ripened cheese: even when pasteurized, Listeria can grow during ripening; it is advised to eat it only cooked above 70 °C',
      fr: 'Fromage à pâte molle ou à croûte fleurie : même pasteurisé, la Listeria peut se développer à l’affinage ; à consommer uniquement bien cuit (plus de 70 °C)',
    },
  },
  {
    id: 'cured-meat',
    level: 'B',
    keywords: [
      'chorizo', 'salchichón', 'salchichon', 'salami', 'jamón curado', 'jamon curado',
      'jamón serrano', 'jamon serrano', 'jamón ibérico', 'jamon iberico', 'fuet',
      'lomo embuchado', 'sobrasada', 'cecina', 'mortadela', 'pepperoni',
    ],
    tags: ['en:dry-sausages'],
    text: {
      es: 'Embutido curado crudo: riesgo de toxoplasmosis; es seguro si se cocina a más de 70 °C',
      en: 'Raw cured meat: toxoplasmosis risk; it is safe if cooked above 70 °C',
      fr: 'Charcuterie crue : risque de toxoplasmose ; sans danger si elle est cuite à plus de 70 °C',
    },
  },
  {
    id: 'pate',
    level: 'B',
    keywords: ['paté', 'pate', 'foie gras', 'mousse de hígado', 'mousse de higado'],
    // "pâte(s)" in French means dough/pasta — never a pâté.
    excludes: ['pate a tartiner', 'pate de fruit', 'pate feuilletee', 'pate brisee', 'pate sablee', 'pate sucree', 'pates alimentaires', 'pate de cacao', 'pate d amande'],

    text: {
      es: 'Patés y foie refrigerados: se desaconsejan en el embarazo por el riesgo de listeriosis',
      en: 'Chilled pâté and foie gras: not advised during pregnancy due to listeriosis risk',
      fr: 'Pâtés et foie gras réfrigérés : déconseillés pendant la grossesse (risque de listériose)',
    },
  },
  {
    id: 'raw-egg',
    level: 'B',
    keywords: [
      'huevo crudo', 'mayonesa casera', 'mousse', 'tiramisú', 'tiramisu',
      'merengue', 'salsa césar', 'salsa cesar',
    ],
    text: {
      es: 'Puede contener huevo crudo: riesgo de salmonelosis; mejor con huevo pasteurizado o cocinado',
      en: 'May contain raw egg: salmonellosis risk; better with pasteurized or cooked egg',
      fr: 'Peut contenir de l’œuf cru : risque de salmonellose ; préfère l’œuf pasteurisé ou cuit',
    },
  },
  {
    id: 'ready-to-eat',
    level: 'B',
    keywords: ['sándwich envasado', 'sandwich envasado', 'ensalada preparada'],
    tags: ['en:sandwiches', 'en:prepared-salads'],
    text: {
      es: 'Producto envasado listo para consumir con carne, pescado, huevo o vegetales: AESAN recomienda precaución por el riesgo de listeriosis',
      en: 'Ready-to-eat packaged product with meat, fish, egg or vegetables: AESAN advises caution due to listeriosis risk',
      fr: 'Produit emballé prêt à consommer (viande, poisson, œuf ou légumes) : prudence recommandée (risque de listériose)',
    },
  },
  {
    id: 'raw-shellfish',
    level: 'B',
    keywords: ['ostra', 'ostras', 'ostra cruda', 'marisco crudo', 'almejas crudas'],
    text: {
      es: 'Marisco crudo: se desaconseja durante el embarazo; es seguro bien cocinado',
      en: 'Raw shellfish: not advised during pregnancy; safe when thoroughly cooked',
      fr: 'Fruits de mer crus : déconseillés pendant la grossesse ; sans danger bien cuits',
    },
  },
  {
    id: 'caffeine',
    level: 'C',
    keywords: ['bebida energética', 'bebida energetica', 'energy drink', 'boisson énergisante', 'boisson energisante', 'taurina', 'taurine', 'café', 'cafe', 'coffee', 'té negro', 'te negro', 'té verde', 'te verde', 'tea', 'cafeína', 'cafeina', 'caffeine'],
    tags: ['en:energy-drinks'],
    text: {
      es: 'Bebida energética o con cafeína: se recomienda limitar la cafeína durante el embarazo',
      en: 'Energy or caffeinated drink: limiting caffeine is recommended during pregnancy',
      fr: 'Boisson énergisante ou caféinée : il est conseillé de limiter la caféine pendant la grossesse',
    },
  },
];

const pregLang = (l?: string): PregLang =>
  l === 'en' || l === 'fr' ? l : 'es';

export interface PregnancyFinding {
  id: string;
  level: PregnancyLevel;
  text: string;
}

/**
 * Evaluate the AESAN pregnancy food rules against a product.
 * Matching runs on product name + brand + ingredients + tags, word-complete.
 */
export function pregnancyFoodFindings(p: ProductData, language?: string): PregnancyFinding[] {
  if (p.category !== 'food') return [];
  const lang = pregLang(language);
  const raw = (p.raw || {}) as Record<string, unknown>;
  const catsTags = (Array.isArray(raw.categories_tags) ? raw.categories_tags as string[] : [])
    .map(t => String(t).toLowerCase());
  const catsText = catsTags.map(t => t.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ')).join(' ');
  const haystack = `${p.name || ''} ${p.brand || ''} ${p.ingredients_text || ''} ${tagsAsText(p)} ${catsText}`;

  const out: PregnancyFinding[] = [];
  for (const rule of PREGNANCY_FOOD_RULES) {
    if (rule.excludes && firstTerm(haystack, rule.excludes)) continue;
    const term = firstTerm(haystack, rule.keywords);

    const tagHit = rule.tags ? rule.tags.some(t => catsTags.includes(t)) : false;
    if (!term && !tagHit) continue;
    const detail = term ? PREG_DETECTED[lang](term) : '';
    out.push({
      id: rule.id,
      level: rule.level,
      text: `${rule.text[lang]}${detail}. ${PREG_AESAN_NOTE[lang]}`,
    });
  }
  return out;
}

// ===========================================================================
// Vegetarian diet layer (own rules, more permissive than vegan: dairy, eggs
// and honey are fine). Shared by the score breakdown and personalAlerts so
// they can never disagree.
// ===========================================================================

export type DietFindingLevel = 'danger' | 'warn' | 'info' | 'good';

export interface DietFinding {
  id: string;
  level: DietFindingLevel;
  /** Penalty (negative) / bonus (positive) / 0 for informational factors. */
  delta: number;
  text: string;
}

const VEG_MEAT_FISH_KEYWORDS = [
  'carne', 'pollo', 'cerdo', 'ternera', 'buey', 'cordero', 'jamón', 'jamon',
  'bacon', 'panceta', 'chorizo', 'salchichón', 'salchichon', 'salami',
  'gelatina', 'manteca de cerdo', 'sebo', 'pescado', 'atún', 'atun', 'salmón',
  'salmon', 'anchoa', 'anchoas', 'bacalao', 'merluza', 'gambas', 'marisco',
  'calamar', 'pulpo', 'surimi', 'meat', 'chicken', 'pork', 'beef', 'fish',
  'tuna', 'gelatin', 'lard', 'poulet', 'viande', 'poisson', 'gélatine',
  'gelatine',
];

// Plant-origin or "free from" mentions that must not trigger the hard fail.
const VEG_MEAT_EXCLUDES = [
  'gelatina vegetal', 'gelificante vegetal', 'sin carne', 'sin gelatina',
  'vegetable gelatin', 'gelatina de origen vegetal',
];

const VEG_DOUBTFUL_KEYWORDS = [
  'cuajo animal', 'cuajo', 'rennet', 'présure', 'presure', 'e120', 'e-120',
  'cochinilla', 'carmín', 'carmin', 'carmine', 'e441', 'e-441', 'e542',
  'e-542', 'e904', 'e-904', 'goma laca', 'shellac', 'pepsina', 'pepsin',
  'aceite de pescado', 'fish oil', 'omega-3 de pescado',
];

const VEG_DOUBTFUL_EXCLUDES = [
  'cuajo vegetal', 'microbial rennet', 'cuajo microbiano', 'présure microbienne',
  'presure microbienne', 'vegetable rennet',
];

const VEG_CERT_LABELS = ['en:vegetarian', 'en:vegan', 'en:v-label'];

const VEG_TEXT = {
  hardTag: {
    es: 'No apto para dieta vegetariana: la ficha del producto lo clasifica como no vegetariano',
    en: 'Not suitable for a vegetarian diet: the product data classifies it as non-vegetarian',
    fr: 'Non adapté à un régime végétarien : la fiche produit le classe comme non végétarien',
  },
  hardIng: {
    es: (t: string) => `No apto para dieta vegetariana: contiene carne o pescado (detectado: "${t}")`,
    en: (t: string) => `Not suitable for a vegetarian diet: contains meat or fish (detected: "${t}")`,
    fr: (t: string) => `Non adapté à un régime végétarien : contient de la viande ou du poisson (détecté : « ${t} »)`,
  },
  doubtful: {
    es: (t: string) => `Ingrediente de origen animal dudoso para tu dieta vegetariana (detectado: "${t}")`,
    en: (t: string) => `Ingredient of doubtful animal origin for your vegetarian diet (detected: "${t}")`,
    fr: (t: string) => `Ingrédient d’origine animale douteuse pour ton régime végétarien (détecté : « ${t} »)`,
  },
  bonus: {
    es: 'Apto para dieta vegetariana según la información disponible',
    en: 'Suitable for a vegetarian diet according to the available information',
    fr: 'Adapté à un régime végétarien selon les informations disponibles',
  },
  unknown: {
    es: 'No podemos confirmar que sea apto para dieta vegetariana con la información disponible',
    en: 'We cannot confirm this is suitable for a vegetarian diet with the available information',
    fr: 'Nous ne pouvons pas confirmer que ce produit convient à un régime végétarien avec les informations disponibles',
  },
} as const;

/** Evaluate the vegetarian diet rules against a food product. */
export function vegetarianFindings(p: ProductData, language?: string): DietFinding[] {
  if (p.category !== 'food') return [];
  const lang = pregLang(language);
  const analysis = (p.ingredients_analysis_tags || []).map(t => String(t).toLowerCase());
  const labels = (p.labels_tags || []).map(t => String(t).toLowerCase());
  const haystack = `${p.name || ''} ${p.brand || ''} ${p.ingredients_text || ''} ${tagsAsText(p)}`;
  const certified = VEG_CERT_LABELS.some(l => labels.includes(l));
  const out: DietFinding[] = [];

  if (analysis.includes('en:non-vegetarian')) {
    out.push({ id: 'veg-non-vegetarian-tag', level: 'danger', delta: 0, text: VEG_TEXT.hardTag[lang] });
    return out;
  }

  const meat = firstTerm(haystack, VEG_MEAT_EXCLUDES) ? null : firstTerm(haystack, VEG_MEAT_FISH_KEYWORDS);
  if (meat) {
    out.push({ id: 'veg-meat', level: 'danger', delta: 0, text: VEG_TEXT.hardIng[lang](meat) });
    return out;
  }

  // Certification wins over the doubtful-ingredient warning.
  if (!certified) {
    const doubt = firstTerm(haystack, VEG_DOUBTFUL_EXCLUDES) ? null : firstTerm(haystack, VEG_DOUBTFUL_KEYWORDS);
    if (doubt) {
      out.push({ id: 'veg-doubtful', level: 'warn', delta: -25, text: VEG_TEXT.doubtful[lang](doubt) });
      return out;
    }
  }

  if (certified || analysis.includes('en:vegetarian') || analysis.includes('en:vegan')) {
    out.push({ id: 'veg-ok', level: 'good', delta: 5, text: VEG_TEXT.bonus[lang] });
    return out;
  }

  if (analysis.includes('en:maybe-vegetarian') || analysis.includes('en:vegetarian-status-unknown')) {
    out.push({ id: 'veg-unknown', level: 'info', delta: 0, text: VEG_TEXT.unknown[lang] });
  }
  return out;
}

// ===========================================================================
// Keto diet layer — the real criterion is total carbohydrates per 100 g.
// ===========================================================================

const KETO_TEXT = {
  high: {
    es: (x: string) => `Alto en carbohidratos (${x} g/100 g): no encaja en una dieta cetogénica`,
    en: (x: string) => `High in carbohydrates (${x} g/100 g): does not fit a ketogenic diet`,
    fr: (x: string) => `Riche en glucides (${x} g/100 g) : ne convient pas à un régime cétogène`,
  },
  mid: {
    es: (x: string) => `Carbohidratos moderados-altos (${x} g/100 g): difícil de encajar en una dieta cetogénica`,
    en: (x: string) => `Moderately high carbohydrates (${x} g/100 g): hard to fit into a ketogenic diet`,
    fr: (x: string) => `Glucides assez élevés (${x} g/100 g) : difficile à intégrer dans un régime cétogène`,
  },
  low: {
    es: (x: string) => `Carbohidratos algo por encima de lo ideal (${x} g/100 g) para una dieta cetogénica`,
    en: (x: string) => `Carbohydrates slightly above ideal (${x} g/100 g) for a ketogenic diet`,
    fr: (x: string) => `Glucides un peu au-dessus de l’idéal (${x} g/100 g) pour un régime cétogène`,
  },
  ok: {
    es: (x: string) => `Bajo en carbohidratos (${x} g/100 g): encaja en dieta cetogénica`,
    en: (x: string) => `Low in carbohydrates (${x} g/100 g): fits a ketogenic diet`,
    fr: (x: string) => `Pauvre en glucides (${x} g/100 g) : convient à un régime cétogène`,
  },
  unknown: {
    es: 'Sin datos de carbohidratos: no podemos evaluar si encaja en tu dieta cetogénica',
    en: 'No carbohydrate data: we cannot assess whether it fits your ketogenic diet',
    fr: 'Pas de données sur les glucides : impossible d’évaluer la compatibilité avec ton régime cétogène',
  },
  sugar: {
    es: (t: string) => `Contiene azúcar añadido, poco compatible con tu dieta cetogénica (detectado: "${t}")`,
    en: (t: string) => `Contains added sugar, hardly compatible with your ketogenic diet (detected: "${t}")`,
    fr: (t: string) => `Contient du sucre ajouté, peu compatible avec ton régime cétogène (détecté : « ${t} »)`,
  },
} as const;

/** Penalty keto applies for the added-sugar reinforcement rule. */
export const KETO_SUGAR_PENALTY = 20;

/**
 * Evaluate the keto diet rules. Carbohydrates per 100 g are the main
 * criterion; added sugars stay as a reinforcement signal.
 */
export function ketoFindings(p: ProductData, language?: string): DietFinding[] {
  if (p.category !== 'food') return [];
  const lang = pregLang(language);
  const rawObj = (p.raw || {}) as Record<string, unknown>;
  const nutri = (rawObj.nutriments && typeof rawObj.nutriments === 'object')
    ? rawObj.nutriments as Record<string, unknown>
    : {};
  const carbs = readNumber(nutri, 'carbohydrates_100g');
  const out: DietFinding[] = [];

  if (carbs == null) {
    out.push({ id: 'keto-no-data', level: 'info', delta: 0, text: KETO_TEXT.unknown[lang] });
  } else {
    const x = carbs.toFixed(1);
    if (carbs > 20) out.push({ id: 'keto-high', level: 'warn', delta: -45, text: KETO_TEXT.high[lang](x) });
    else if (carbs >= 10) out.push({ id: 'keto-mid', level: 'warn', delta: -25, text: KETO_TEXT.mid[lang](x) });
    else if (carbs > 5) out.push({ id: 'keto-low', level: 'info', delta: -10, text: KETO_TEXT.low[lang](x) });
    else out.push({ id: 'keto-ok', level: 'good', delta: 5, text: KETO_TEXT.ok[lang](x) });
  }

  const combined = `${p.ingredients_text || ''} ${tagsAsText(p)}`;
  const sugarTerm = firstTerm(combined, SUGAR_KEYWORDS);
  if (sugarTerm) {
    out.push({
      id: 'keto-sugar',
      level: 'warn',
      delta: -KETO_SUGAR_PENALTY,
      text: KETO_TEXT.sugar[lang](sugarTerm),
    });
  }
  return out;
}

/**
 * Nutrition goals we can evaluate with objective product data.
 * Legacy values stored in the DB ('more-energy', 'healthy-skin') are ignored
 * on purpose: there is no defensible criterion to score them.
 */
export const SUPPORTED_NUTRITION_GOALS = ['gain-muscle', 'lose-weight'] as const;

const GOAL_TEXT = {
  proteinHigh: {
    es: (x: string) => `Alto en proteína (${x} g/100 g): buen aporte para tu objetivo de ganar músculo`,
    en: (x: string) => `High in protein (${x} g/100 g): a good contribution to your muscle-gain goal`,
    fr: (x: string) => `Riche en protéines (${x} g/100 g) : bon apport pour ton objectif de prise de muscle`,
  },
  proteinGood: {
    es: (x: string) => `Buena fuente de proteína (${x} g/100 g)`,
    en: (x: string) => `Good source of protein (${x} g/100 g)`,
    fr: (x: string) => `Bonne source de protéines (${x} g/100 g)`,
  },
  proteinMid: {
    es: (x: string) => `Aporte moderado de proteína (${x} g/100 g)`,
    en: (x: string) => `Moderate protein content (${x} g/100 g)`,
    fr: (x: string) => `Apport modéré en protéines (${x} g/100 g)`,
  },
  proteinLow: {
    es: (x: string) => `Aporte bajo de proteína (${x} g/100 g) para tu objetivo`,
    en: (x: string) => `Low protein content (${x} g/100 g) for your goal`,
    fr: (x: string) => `Faible apport en protéines (${x} g/100 g) pour ton objectif`,
  },
  proteinUnknown: {
    es: 'Sin datos de proteína: no podemos evaluar este objetivo',
    en: 'No protein data: we cannot assess this goal',
    fr: 'Pas de données sur les protéines : impossible d’évaluer cet objectif',
  },
  satiety: {
    es: (x: string) => `Rico en fibra/proteína (${x} g/100 g): ayuda a la saciedad`,
    en: (x: string) => `Rich in fibre/protein (${x} g/100 g): helps with satiety`,
    fr: (x: string) => `Riche en fibres/protéines (${x} g/100 g) : favorise la satiété`,
  },
  ultraProcessed: {
    es: 'Producto ultraprocesado: suelen saciar menos que los alimentos poco procesados',
    en: 'Ultra-processed product: these tend to be less satiating than minimally processed foods',
    fr: 'Produit ultra-transformé : ils rassasient généralement moins que les aliments peu transformés',
  },
  energyDense: {
    es: (x: string) => `Densidad energética alta (${x} kcal/100 g)`,
    en: (x: string) => `High energy density (${x} kcal/100 g)`,
    fr: (x: string) => `Densité énergétique élevée (${x} kcal/100 g)`,
  },
} as const;

/**
 * Nutrition-goal findings. These NEVER penalise: they only add a small bonus
 * or inform. Quality and satiety only — no calorie restriction, no judgement.
 */
export function nutritionGoalFindings(
  p: ProductData,
  goals: string[],
  language?: string,
): DietFinding[] {
  if (p.category !== 'food') return [];
  const g = (goals || []).map(x => String(x).toLowerCase());
  const lang = pregLang(language);
  const rawObj = (p.raw || {}) as Record<string, unknown>;
  const nutri = (rawObj.nutriments && typeof rawObj.nutriments === 'object')
    ? rawObj.nutriments as Record<string, unknown>
    : {};
  const proteins = readNumber(nutri, 'proteins_100g');
  const out: DietFinding[] = [];

  if (g.includes('gain-muscle')) {
    if (proteins == null) {
      out.push({ id: 'goal-protein-unknown', level: 'info', delta: 0, text: GOAL_TEXT.proteinUnknown[lang] });
    } else {
      const x = proteins.toFixed(1);
      if (proteins >= 20) out.push({ id: 'goal-protein-high', level: 'good', delta: 8, text: GOAL_TEXT.proteinHigh[lang](x) });
      else if (proteins >= 10) out.push({ id: 'goal-protein-good', level: 'good', delta: 4, text: GOAL_TEXT.proteinGood[lang](x) });
      else if (proteins >= 5) out.push({ id: 'goal-protein-mid', level: 'info', delta: 0, text: GOAL_TEXT.proteinMid[lang](x) });
      else out.push({ id: 'goal-protein-low', level: 'info', delta: 0, text: GOAL_TEXT.proteinLow[lang](x) });
    }
  }

  if (g.includes('lose-weight')) {
    const fiber = readNumber(nutri, 'fiber_100g') ?? readNumber(nutri, 'fibre_100g');
    if ((fiber != null && fiber >= 6) || (proteins != null && proteins >= 15)) {
      const value = (fiber != null && fiber >= 6) ? fiber : (proteins as number);
      out.push({ id: 'goal-satiety', level: 'good', delta: 5, text: GOAL_TEXT.satiety[lang](value.toFixed(1)) });
    }
    const nova = readNumber(nutri, 'nova_group') ?? readNumber(rawObj, 'nova_group');
    if (nova === 4) {
      out.push({ id: 'goal-ultraprocessed', level: 'info', delta: 0, text: GOAL_TEXT.ultraProcessed[lang] });
    }
    const kcal = readNumber(nutri, 'energy-kcal_100g');
    if (kcal != null && kcal > 400) {
      out.push({ id: 'goal-energy-dense', level: 'info', delta: 0, text: GOAL_TEXT.energyDense[lang](kcal.toFixed(0)) });
    }
  }

  return out;
}




/**
 * Detect dietary supplements — they must NOT be scored with food criteria
 * (Nutriscore doesn't apply, sugars/salt/fat rules make no sense on capsules).
 */
const SUPPLEMENT_CATEGORY_TAGS = new Set<string>([
  'en:dietary-supplements', 'en:food-supplements', 'en:supplements',
  'en:vitamins', 'en:mineral-supplements', 'en:plant-based-supplements',
  'en:herbal-supplements',
]);
const SUPPLEMENT_CATEGORY_SUBSTRINGS = [
  'dietary-supplement', 'food-supplement', 'supplement', 'vitamin',
];
const SUPPLEMENT_NAME_KEYWORDS = [
  'suplemento', 'supplement', 'complemento aliment', 'complemento nutricional',
  'cápsulas', 'capsulas', 'capsules', 'cápsula', 'capsula',
  'comprimidos', 'comprimido', 'tabletas', 'gummies', 'gomitas',
  'ashwagandha', 'ksm-66', 'ginseng', 'maca ',
  'colágeno hidrolizado', 'multivitamin', 'multivitamínico', 'multivitaminico',
  'melatonina', 'melatonin', 'magnesio', 'omega 3', 'omega-3', 'omega3',
];
const SUPPLEMENT_NAME_TOKENS = ['forte', 'memory', 'omega', 'magnesio', 'melatonina'];
/**
 * Text signals of a food supplement (es/pt/en/fr). Requires one STRONG signal
 * ("complemento alimenticio", "VRN"…) or at least two weak ones, so that a
 * normal food mentioning "dosis" or "comprimido" is not flagged.
 */
const SUPPLEMENT_STRONG_SIGNALS = [
  'complemento alimenticio', 'complementos alimenticios', 'suplemento alimentar',
  'food supplement', 'complement alimentaire', 'complément alimentaire',
  'valor de referencia de nutriente', 'vrn', 'nrv',
  'no deben utilizarse como sustitutos de una dieta variada',
];
const SUPPLEMENT_WEAK_SIGNALS = [
  'dosis diaria', 'toma diaria', 'daily dose', 'dose journalière', 'dose journaliere',
  'comprimido efervescente', 'comprimidos efervescentes', 'comprimidos recubiertos',
  'cápsulas', 'capsulas', 'capsules', 'no sobrepasar la cantidad diaria recomendada',
];
function hasWordSignal(hay: string, needle: string): boolean {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9áéíóúñç])${esc}([^a-z0-9áéíóúñç]|$)`, 'i').test(hay);
}
export function hasSupplementTextSignals(text: string | null | undefined): boolean {
  const t = (text || '').toLowerCase();
  if (!t) return false;
  if (SUPPLEMENT_STRONG_SIGNALS.some(k => hasWordSignal(t, k))) return true;
  return SUPPLEMENT_WEAK_SIGNALS.filter(k => hasWordSignal(t, k)).length >= 2;
}

export function isSupplement(p: ProductData): boolean {
  const raw = (p.raw || {}) as Record<string, unknown>;
  const cats = Array.isArray(raw.categories_tags) ? (raw.categories_tags as string[]) : [];
  const catsLc = cats.map(t => String(t).toLowerCase());
  if (catsLc.some(t => SUPPLEMENT_CATEGORY_TAGS.has(t))) return true;
  if (catsLc.some(t => SUPPLEMENT_CATEGORY_SUBSTRINGS.some(s => t.includes(s)))) return true;
  const name = `${p.name || ''} ${p.brand || ''}`.toLowerCase();
  for (const kw of SUPPLEMENT_NAME_KEYWORDS) {
    if (name.includes(kw)) return true;
  }
  // Word-boundary match for short supplement-signal tokens (forte, memory…)
  // when the product name has no clear food context.
  const tokens = name.split(/[^a-záéíóúñ0-9]+/i).filter(Boolean);
  if (tokens.some(t => SUPPLEMENT_NAME_TOKENS.includes(t))) return true;
  if (hasSupplementTextSignals(p.ingredients_text)) return true;
  // "vitamina X" + cápsula format
  if (/vitamina\s+[a-z0-9]/i.test(name) && /(cáps|caps|comprim|tablet|pastill)/i.test(name)) {
    return true;
  }
  return false;
}

function topIngredients(text: string, n: number): string[] {
  if (!text) return [];
  return text
    .split(/[,;()\n\r]|\s[-–—•·]\s/)
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

/**
 * Contact allergens reviewed manually (EU mandatory declaration list).
 * PERSONAL LAYER ONLY — they never touch the general score, because brands
 * that declare them correctly should not be punished for complying.
 * Applied only to sensitive/atopic skin or fragrance sensitivity.
 */
const CONTACT_ALLERGENS: Array<{ label: string; keywords: string[] }> = [
  { label: 'limoneno', keywords: ['limonene', 'd-limonene', 'limoneno'] },
  { label: 'cocamidopropil betaína', keywords: ['cocamidopropyl betaine', 'cocamidopropil betaina'] },
  {
    label: 'aceite de pomelo',
    keywords: [
      'citrus paradisi peel oil', 'citrus paradisi fruit oil', 'citrus paradisi seed oil',
      'citrus paradisi oil', 'aceite de pomelo',
    ],
  },
  {
    label: 'naranja amarga',
    keywords: [
      'citrus aurantium amara peel extract', 'citrus aurantium amara peel oil',
      'citrus aurantium amara flower extract', 'citrus aurantium amara flower oil',
      'citrus aurantium amara leaf oil', 'citrus aurantium amara extract',
      'citrus aurantium amara oil',
    ],
  },
  { label: 'anetol', keywords: ['anethole', 'anetol'] },
  // EU mandatory-declaration fragrance allergens (personal layer only).
  { label: 'linalol', keywords: ['linalool', 'linalol'] },
  { label: 'cumarina', keywords: ['coumarin', 'cumarina'] },
  { label: 'hexyl cinnamal', keywords: ['hexyl cinnamal'] },
  { label: 'salicilato de bencilo', keywords: ['benzyl salicylate'] },
  { label: 'geraniol', keywords: ['geraniol'] },
  { label: 'alpha-isometil ionona', keywords: ['alpha-isomethyl ionone', 'alpha isomethyl ionone'] },
  { label: 'alcohol cinámico', keywords: ['cinnamyl alcohol'] },
  { label: 'citral', keywords: ['citral'] },
  { label: 'benzoato de bencilo', keywords: ['benzyl benzoate'] },
  { label: 'alcohol bencílico', keywords: ['benzyl alcohol'] },
  { label: 'citronelol', keywords: ['citronellol', 'citronelol'] },
  // Photosensitising citrus oils (furocoumarins) — personal layer only.
  {
    label: 'aceite de limón (fotosensibilizante)',
    keywords: [
      'citrus limon peel oil', 'citrus limon (lemon) peel oil', 'citrus limon fruit oil',
      'citrus limon oil', 'citrus limon peel extract', 'lemon peel oil', 'aceite de limon',
      'citrus limon',
    ],
  },
  {
    label: 'aceite de naranja (fotosensibilizante)',
    keywords: [
      'citrus aurantium dulcis peel oil', 'citrus aurantium dulcis (orange) peel oil',
      'citrus aurantium dulcis fruit oil', 'citrus aurantium dulcis oil',
      'citrus aurantium dulcis peel extract', 'citrus sinensis peel oil',
      'orange peel oil', 'aceite de naranja',
      'citrus aurantium dulcis',
    ],
  },
  {
    label: 'bergamota (fotosensibilizante)',
    keywords: [
      'citrus aurantium bergamia peel oil', 'citrus aurantium bergamia fruit oil',
      'citrus aurantium bergamia leaf extract', 'citrus aurantium bergamia leaf oil',
      'citrus aurantium bergamia peel extract', 'citrus aurantium bergamia oil',
      'citrus bergamia', 'citrus aurantium bergamia', 'bergamot oil',
      'aceite de bergamota', 'bergamota',
    ],
  },
];


/** True when the profile asks for the contact-allergen layer. */
function wantsContactAllergenLayer(skin: string[], sensitivities: string[]): boolean {
  return (
    skin.includes('atopic') ||
    skin.includes('sensitive') ||
    sensitivities.includes('fragrance')
  );
}

// ---------------------------------------------------------------------------
// HAIR layer — cosmetics only. Personal score / alerts only, never the general
// score. Penalties are floored at 30 (unsuitable, not dangerous).
// ---------------------------------------------------------------------------
export interface HairFinding {
  /** delta < 0 penalty, > 0 bonus, 0 informational */
  delta: number;
  text: string;
}

const HAIR_CAT_TAGS = ['en:shampoos', 'en:conditioners', 'en:hair-care', 'en:hair-products', 'en:hair', 'en:hair-conditioners'];
const HAIR_NAME_KEYWORDS = [
  'champu', 'champú', 'shampoo', 'shampooing',
  'acondicionador', 'conditioner', 'apres-shampooing', 'après-shampooing',
  'mascarilla capilar', 'hair mask', 'masque capillaire',
  'capilar', 'capillaire', 'hair', 'cabello', 'cheveux',
];

/** True when the cosmetic is a hair product (category tags or name). */
export function isHairProduct(p: ProductData): boolean {
  if (p.category !== 'cosmetic') return false;
  const rawObj = (p.raw || {}) as Record<string, unknown>;
  const tags = [
    ...(Array.isArray(rawObj.categories_tags) ? (rawObj.categories_tags as string[]) : []),
    ...(typeof rawObj.categories === 'string' ? [rawObj.categories as string] : []),
  ].map(t => String(t).toLowerCase());
  if (tags.some(t => HAIR_CAT_TAGS.some(h => t.includes(h) || t.includes(h.replace('en:', ''))))) return true;
  const rawCatTag = typeof rawObj.category_tag === 'string' ? (rawObj.category_tag as string) : '';
  const name = `${p.name || ''} ${p.brand || ''} ${rawCatTag}`;
  return !!firstTerm(name, HAIR_NAME_KEYWORDS);
}

const HAIR_SULFATES = ['sodium lauryl sulfate', 'sodium laureth sulfate', 'ammonium lauryl sulfate', 'ammonium laureth sulfate', 'sodium lauryl sulphate', 'sodium laureth sulphate'];
const HAIR_DRYING_ALCOHOLS = ['alcohol denat', 'sd alcohol', 'isopropyl alcohol', 'denatured alcohol'];
const HAIR_SILICONES = ['dimethicone', 'dimethiconol', 'cyclopentasiloxane', 'amodimethicone'];

const HAIR_ACTIVES: Record<string, string[]> = {
  frizz: ['argan oil', 'argania spinosa', 'aceite de argan', 'shea butter', 'butyrospermum parkii', 'manteca de karite', 'glycerin', 'panthenol', 'keratin', 'queratina'],
  dryness: ['hyaluronic acid', 'sodium hyaluronate', 'panthenol', 'glycerin', 'ceramide', 'aloe', 'coconut oil', 'cocos nucifera', 'shea butter', 'butyrospermum parkii'],
  dandruff: ['zinc pyrithione', 'pyrithione zinc', 'piroctone olamine', 'ketoconazole', 'salicylic acid', 'selenium sulfide', 'climbazole'],
  hairloss: ['caffeine', 'cafeina', 'biotin', 'biotina', 'niacinamide', 'saw palmetto', 'ketoconazole'],
  oily: ['salicylic acid', 'tea tree', 'melaleuca', 'niacinamide', 'zinc'],
  damaged: ['keratin', 'queratina', 'amino acids', 'aminoacidos', 'maleic acid', 'hydrolyzed', 'hidrolizado'],
};

type HairLang = 'es' | 'en' | 'fr';
const HAIR_TEXT: Record<HairLang, Record<string, (t: string) => string>> = {
  es: {
    sulfDry: t => `Los sulfatos fuertes resecan más un cabello ya seco o dañado (${t})`,
    sulfCurly: t => `Los sulfatos fuertes eliminan el aceite natural que el pelo rizado necesita (${t})`,
    sulfOily: t => `Los sulfatos limpian en profundidad, algo que puede convenir a un cuero cabelludo graso (${t})`,
    alcohol: t => `Alcohol secante: puede resecar y encrespar tu cabello (${t})`,
    silBad: t => `Las siliconas pueden apelmazar un cabello fino o graso (${t})`,
    silGood: t => `Las siliconas ayudan a sellar la hidratación y controlar el encrespamiento (${t})`,
    active: t => `Activo útil para tu cabello (${t})`,
  },
  en: {
    sulfDry: t => `Harsh sulfates dry out already dry or damaged hair (${t})`,
    sulfCurly: t => `Harsh sulfates strip the natural oil curly hair needs (${t})`,
    sulfOily: t => `Sulfates cleanse deeply, which can suit an oily scalp (${t})`,
    alcohol: t => `Drying alcohol: can dry out and frizz your hair (${t})`,
    silBad: t => `Silicones can weigh down fine or oily hair (${t})`,
    silGood: t => `Silicones help seal in moisture and control frizz (${t})`,
    active: t => `Helpful active for your hair (${t})`,
  },
  fr: {
    sulfDry: t => `Les sulfates forts dessèchent encore plus un cheveu sec ou abîmé (${t})`,
    sulfCurly: t => `Les sulfates forts éliminent l’huile naturelle dont le cheveu bouclé a besoin (${t})`,
    sulfOily: t => `Les sulfates nettoient en profondeur, ce qui peut convenir à un cuir chevelu gras (${t})`,
    alcohol: t => `Alcool desséchant : peut dessécher et faire friser tes cheveux (${t})`,
    silBad: t => `Les silicones peuvent alourdir un cheveu fin ou gras (${t})`,
    silGood: t => `Les silicones aident à sceller l’hydratation et à contrôler les frisottis (${t})`,
    active: t => `Actif utile pour tes cheveux (${t})`,
  },
};

const hairLang = (l?: string): HairLang => (l === 'en' || l === 'fr' ? l : 'es');

/**
 * Hair findings for a cosmetic hair product. Returns [] when the product is
 * not a hair product or the profile has no hair data.
 */
export function hairFindings(
  p: ProductData,
  profile: PersonalProfileLike,
): HairFinding[] {
  if (!isHairProduct(p)) return [];
  const type = String(profile.hair_type || '').toLowerCase();
  const condition = String(profile.hair_condition || '').toLowerCase();
  const concerns = (profile.hair_concerns || []).map(c => String(c).toLowerCase()).filter(c => c !== 'none');
  if ((!type || type === 'none') && !condition && concerns.length === 0) return [];
  if (type === 'none') return [];

  const T = HAIR_TEXT[hairLang(profile.language)];
  const text = `${p.ingredients_text || ''} ${tagsAsText(p)}`;
  const out: HairFinding[] = [];

  const isDryish = condition === 'dry' || condition === 'damaged';
  const isCurly = type === 'curly' || type === 'wavy' || type === 'coily';
  const isOily = condition === 'oily';
  const isFine = type === 'fine' || type === 'straight';

  // 1) Harsh sulfates
  const sulf = firstTerm(text, HAIR_SULFATES);
  if (sulf) {
    if (isDryish) out.push({ delta: -20, text: T.sulfDry(sulf) });
    else if (isCurly) out.push({ delta: -20, text: T.sulfCurly(sulf) });
    else if (isOily) out.push({ delta: 0, text: T.sulfOily(sulf) });
  }

  // 2) Drying alcohols (fatty alcohols excluded by exact keyword list)
  const alc = firstTerm(text, HAIR_DRYING_ALCOHOLS);
  if (alc && (isDryish || isCurly || concerns.includes('frizz'))) {
    out.push({ delta: -15, text: T.alcohol(alc) });
  }

  // 3) Non-soluble silicones: good or bad depending on the hair
  const sil = firstTerm(text, HAIR_SILICONES);
  if (sil) {
    if (isDryish || isCurly) out.push({ delta: 5, text: T.silGood(sil) });
    else if (isOily || isFine) out.push({ delta: -10, text: T.silBad(sil) });
  }

  // 4) Beneficial actives for declared concerns (max +10)
  const activeKeys = new Set<string>(concerns.map(c => (c === 'hair-loss' ? 'hairloss' : c)));
  if (isDryish) activeKeys.add('dryness');
  if (condition === 'damaged') activeKeys.add('damaged');
  if (isOily) activeKeys.add('oily');
  let bonus = 0;
  const seen = new Set<string>();
  for (const key of activeKeys) {
    if (bonus >= 10) break;
    const kws = HAIR_ACTIVES[key];
    if (!kws) continue;
    const hit = firstTerm(text, kws);
    if (hit && !seen.has(hit)) {
      seen.add(hit);
      bonus += 5;
      out.push({ delta: 5, text: T.active(hit) });
    }
  }

  return out;
}



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
  const sensitivities = (profile.skin_sensitivities || []).map(s => String(s).toLowerCase());
  const allergies = (profile.allergies || []).map(a => String(a).toLowerCase());
  const diets = (Array.isArray(profile.diet) ? profile.diet : (profile.diet ? [profile.diet] : [])).map(d => String(d).toLowerCase());
  const isVegan = diets.includes('vegan') || allergies.includes('vegan');
  const isHalal = diets.includes('halal');
  const isPregnant = !!profile.pregnancy_or_lactation;

  const factors: ScoreFactor[] = [];
  let score = baseScore;
  const hardFailReasons: string[] = [];
  // Total penalty coming from pregnancy level-B warnings (floored at 25 below).
  let pregLevelBPenalty = 0;
  // Total penalty coming from the hair layer (floored at 30 below).
  let hairPenalty = 0;
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
    // Reviewed contact allergens — personal layer only, sensitive/atopic skin
    // or declared fragrance sensitivity.
    if (wantsContactAllergenLayer(skin, sensitivities)) {
      const skinLabel = skin.includes('atopic') ? 'Tu piel atópica' : 'Tu piel sensible';
      let applied = 0;
      for (const a of CONTACT_ALLERGENS) {
        if (applied >= 3) break;
        if (firstTerm(combined, a.keywords)) {
          addNeg(`${skinLabel}: contiene un alérgeno de contacto (${a.label})`, -8);
          applied++;
        }
      }
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
    } else if (diets.includes('vegetarian')) {
      // Vegetarian layer — only when vegan isn't selected (vegan is stricter).
      for (const f of vegetarianFindings(p, profile.language)) {
        if (f.level === 'danger') addHardFail(f.text);
        else if (f.delta < 0) addNeg(f.text, f.delta);
        else if (f.delta > 0) addPos(f.text, f.delta);
        else factors.push({ label: f.text, delta: null, tone: 'neutral' });
      }
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
    // keto → carbohydrates per 100 g (main criterion) + added sugar as backup.
    // Both are evaluated independently; the sugar penalty is never counted
    // twice — only the larger of the two applies.
    let sugarPenaltyApplied = 0;
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
        sugarPenaltyApplied = 100;
      } else if (midSugars && addedAnywhere) {
        addNeg(`Contiene azúcar añadido (${sugars?.toFixed(1)}g/100g, detectado: "${addedAnywhere}") — no ideal para tu dieta sin azúcar`, -30);
        sugarPenaltyApplied = 30;
      } else if (sugars != null && sugars > 5 && !addedAnywhere) {
        addNeg(`Azúcares naturales presentes (${sugars.toFixed(1)}g/100g)`, -10);
        sugarPenaltyApplied = 10;
      }
    }
    if (diets.includes('keto')) {
      for (const f of ketoFindings(p, profile.language)) {
        if (f.id === 'keto-sugar') {
          // Deduplicate against the no-sugar branch: keep only the larger one.
          const extra = KETO_SUGAR_PENALTY - sugarPenaltyApplied;
          if (extra > 0) {
            addNeg(f.text, -extra);
            sugarPenaltyApplied = KETO_SUGAR_PENALTY;
          } else {
            factors.push({ label: f.text, delta: null, tone: 'neutral' });
          }
        } else if (f.delta < 0) {
          addNeg(f.text, f.delta);
        } else if (f.delta > 0) {
          addPos(f.text, f.delta);
        } else {
          factors.push({ label: f.text, delta: null, tone: 'neutral' });
        }
      }
    }

    // Nutrition goals — bonuses and information only, never penalties.
    for (const f of nutritionGoalFindings(p, profile.nutrition_goals || [], profile.language)) {
      if (f.delta > 0) addPos(f.text, f.delta);
      else factors.push({ label: f.text, delta: null, tone: 'neutral' });
    }

  }


  // Cosmetic-only pregnancy risk list (retinoids, salicylates, etc.).
  if (isPregnant && isCosmetic) {
    const t = firstTerm(combined, PREGNANCY_RISKY);
    if (t) addNeg(`Riesgo en embarazo/lactancia: ${t}`, -40);
  }

  // Pregnancy / lactation — food layer (AESAN).
  if (isPregnant && isFood) {
    for (const f of pregnancyFoodFindings(p, profile.language)) {
      if (f.level === 'A') addHardFail(`${PREG_NOT_SUITABLE[pregLang(profile.language)]} — ${f.text}`);
      else if (f.level === 'B') { addNeg(f.text, -40); pregLevelBPenalty += 40; }
      else factors.push({ label: f.text, delta: null, tone: 'neutral' });
    }
  }


  // Hair layer — cosmetics only, additive to the skin layer above.
  if (isCosmetic) {
    for (const f of hairFindings(p, profile)) {
      if (f.delta < 0) { addNeg(f.text, f.delta); hairPenalty += -f.delta; }
      else if (f.delta > 0) addPos(f.text, f.delta);
      else factors.push({ label: f.text, delta: null, tone: 'neutral' });
    }
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
  // Pregnancy level-B warnings are cautionary, not disqualifying: they may not
  // drag the personal score below 25 on their own.
  let effective = score;
  // Hair-layer penalties are "not a good match", not dangerous: floor at 30.
  if (hairPenalty > 0) {
    const withoutHair = clamp100(score + hairPenalty);
    effective = Math.max(effective, Math.min(30, withoutHair));
  }
  if (pregLevelBPenalty > 0) {
    const withoutB = clamp100(score + pregLevelBPenalty);
    effective = Math.max(score, Math.min(25, withoutB));
  }
  // The personal layer may only warn, never improve: cap at the general score.
  const capped = clamp100(effective);
  if (capped > baseScore) {
    factors.push({
      label: 'Tu perfil no penaliza este producto: coincide con la nota general',
      delta: null,
      tone: 'neutral',
    });
    return { score: baseScore, factors };
  }
  return { score: capped, factors };
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

    const sensitivities = (profile.skin_sensitivities || []).map(s => String(s).toLowerCase());
    const skinLc = skin.map(s => String(s).toLowerCase());
    const contactHits: string[] = [];
    if (wantsContactAllergenLayer(skinLc, sensitivities)) {
      const skinLabel = skinLc.includes('atopic') ? 'Tu piel atópica' : 'Tu piel sensible';
      for (const a of CONTACT_ALLERGENS) {
        pushHit(contactHits, `${skinLabel}: contiene un alérgeno de contacto (${a.label})`, a.keywords);
      }
    }

    if (skin.includes('atopic')) {
      const hits: string[] = [];
      pushHit(hits, 'Los sulfatos alteran la barrera cutánea atópica', ['sulfate', 'sulphate']);
      pushHit(hits, 'Las fragancias pueden irritar piel atópica', ['fragrance', 'parfum']);
      pushHit(hits, 'El alcohol puede resecar piel atópica', ['alcohol denat']);
      pushHit(hits, 'El aceite mineral ocluye poros, puede empeorar atopia', ['mineral oil', 'paraffinum']);
      hits.push(...contactHits);
      if (hits.length === 0) alerts.push({ level: 'good', text: 'Sin ingredientes problemáticos para piel atópica' });
      else hits.forEach(h => alerts.push({ level: 'warn', text: h }));
    } else {
      contactHits.forEach(h => alerts.push({ level: 'warn', text: h }));
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

    // Pregnancy/lactation × alcohol → serious alert
    if (profile?.pregnancy_or_lactation && isAlcoholicFood(p)) {
      alerts.push({
        level: 'danger',
        text: 'El alcohol no es seguro durante el embarazo ni la lactancia.',
      });
    }

    // Pregnancy/lactation × AESAN food rules
    if (profile?.pregnancy_or_lactation) {
      for (const f of pregnancyFoodFindings(p, profile?.language)) {
        alerts.push({
          level: f.level === 'A' ? 'danger' : f.level === 'B' ? 'warn' : 'good',
          text: f.text,
        });
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
    }
    // Keto alerts — evaluated always when selected (independent of no-sugar).
    if (diets.includes('keto')) {
      const noSugarAlso = diets.includes('no-sugar');
      for (const f of ketoFindings(p, profile?.language)) {
        // Avoid repeating the sugar message when no-sugar already covered it.
        if (f.id === 'keto-sugar' && noSugarAlso) continue;
        alerts.push({
          level: f.level === 'danger' ? 'danger' : f.level === 'good' ? 'good' : 'warn',
          text: `${f.text}.`,
        });
      }
    }
    // Vegetarian alerts — vegan (stricter) keeps its own behavior.
    if (diets.includes('vegetarian') && !diets.includes('vegan')) {
      for (const f of vegetarianFindings(p, profile?.language)) {
        alerts.push({
          level: f.level === 'danger' ? 'danger' : f.level === 'good' ? 'good' : 'warn',
          text: `${f.text}.`,
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
