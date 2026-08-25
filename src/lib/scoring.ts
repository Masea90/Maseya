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
  for (const part of cleaned.split(/[,;()\n\r]/)) {
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
    .split(/[,;()\n\r]/)
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
  const weightedCount = (level: IngredientLevel) =>
    levelWeights(level).reduce((sum, w) => sum + w, 0);

  // Diminishing returns: a shampoo with several "caution" ingredients (or
  // several mild "avoid" ones such as sulfates) is a normal supermarket
  // product, not the worst product on earth. Each extra hit penalizes less so
  // the accumulation never collapses the score to 0. Severe "avoid" ingredients
  // (formaldehyde & releasers, parabens, phthalates, triclosan, problematic UV
  // filters) keep their FULL linear penalty — those may sink a product.
  const DIMINISH = [1, 0.6, 0.4, 0.25, 0.15];
  const diminishedSum = (weights: number[]): number =>
    weights
      .slice()
      .sort((a, b) => b - a)
      .reduce((sum, w, i) => sum + w * (DIMINISH[i] ?? 0.1), 0);

  const SEVERE_AVOID = [
    'paraben', 'phthalate', 'formaldehyde', 'triclosan',
    'dmdm hydantoin', 'imidazolidinyl urea', 'diazolidinyl urea', 'quaternium-15',
    'oxybenzone', 'benzophenone-3',
  ];
  const isSevereAvoid = (name: string) => findAny(name, SEVERE_AVOID) !== null;

  let redPenalty: number;
  let orangePenalty: number;
  if (p.category === 'cosmetic') {
    const avoidItems = flagged.filter(
      f => f.level === 'avoid' && !isEfsaCoveredChip(f.name, efsaCovered)
    );
    const severeW = avoidItems.filter(f => isSevereAvoid(f.name)).map(f => positionWeight(f.name));
    const mildW = avoidItems.filter(f => !isSevereAvoid(f.name)).map(f => positionWeight(f.name));
    const severeSum = severeW.reduce((s, w) => s + w, 0);
    redPenalty = Math.round((severeSum + diminishedSum(mildW)) * 15);
    // Cap the cumulative "caution" penalty: common preservatives, silicones
    // and fragrance should not add up to a catastrophic score by themselves.
    orangePenalty = Math.min(30, Math.round(diminishedSum(levelWeights('caution')) * 6));
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
];

/** True when the profile asks for the contact-allergen layer. */
function wantsContactAllergenLayer(skin: string[], sensitivities: string[]): boolean {
  return (
    skin.includes('atopic') ||
    skin.includes('sensitive') ||
    sensitivities.includes('fragrance')
  );
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
  // The personal layer may only warn, never improve: cap at the general score.
  const capped = clamp100(score);
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
