/**
 * Nutri-Score 2023 computation from raw OFF nutriments.
 * Implements the 2023 scientific committee revision published by
 * Santé publique France (workbook 2024). Used only when a product
 * does NOT carry an official nutriscore_grade.
 *
 * Reference tables (per 100 g / 100 ml unless noted):
 *   - General/red-meat/cheese: energy kJ, sugars g, sat-fat g, salt g
 *   - Beverages: separate energy + sugars tables, +4 pts if sweetener
 *   - Fats/oils/nuts: sat-fat as ratio saturated/total-fat (%),
 *     energy from saturated (satFat × 37 kJ/g)
 *
 * Positives: fibre, protein, FVL% (fruits-veg-legumes estimate).
 */

export type NutriGrade = 'a' | 'b' | 'c' | 'd' | 'e';

export type NutriCategory = 'general' | 'beverage' | 'water' | 'fat' | 'cheese' | 'red-meat';

export interface NutriScoreResult {
  grade: NutriGrade;
  score: number;
  category: NutriCategory;
  negative: number;
  positive: number;
  components: {
    energy: number;
    sugars: number;
    satFat: number;
    salt: number;
    fibre: number;
    protein: number;
    fvl: number;
    sweetener?: number;
  };
}

// -------- number helpers -------------------------------------------------
const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return null;
    const n = parseFloat(t.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const readAny = (nutri: Record<string, unknown>, keys: string[]): number | null => {
  for (const k of keys) {
    const v = num(nutri[k]);
    if (v != null) return v;
  }
  return null;
};

// -------- category detection --------------------------------------------
const RED_MEAT_TAGS = new Set([
  'en:beef', 'en:pork', 'en:lamb-meat', 'en:lamb', 'en:veal', 'en:mutton',
  'en:horse-meat', 'en:game-meat', 'en:red-meats', 'en:red-meat',
  'en:bacon', 'en:sausages', 'en:hams', 'en:cured-meats',
  'en:charcuteries',
]);
const CHEESE_TAGS = new Set([
  'en:cheeses', 'en:cheese', 'en:hard-cheeses', 'en:soft-cheeses',
  'en:blue-cheeses', 'en:fresh-cheeses', 'en:goat-cheeses',
  'en:processed-cheeses', 'en:grated-cheeses',
]);
const FAT_TAGS = new Set([
  'en:fats', 'en:vegetable-fats', 'en:animal-fats',
  'en:oils', 'en:vegetable-oils', 'en:olive-oils', 'en:sunflower-oils',
  'en:rapeseed-oils', 'en:groundnut-oils', 'en:coconut-oils',
  'en:butters', 'en:margarines', 'en:added-fats',
  'en:nuts', 'en:seeds', 'en:nuts-and-seeds', 'en:oilseeds',
]);
const WATER_TAGS = new Set([
  'en:mineral-waters', 'en:spring-waters', 'en:natural-mineral-waters',
  'en:natural-mineral-waters',
]);
// Any tag equal to 'en:beverages' or a well-known descendant.
const BEVERAGE_TAGS = new Set([
  'en:beverages', 'en:non-alcoholic-beverages', 'en:carbonated-drinks',
  'en:sodas', 'en:colas', 'en:lemonades', 'en:tonics',
  'en:juices', 'en:fruit-juices', 'en:vegetable-juices', 'en:nectars', 'en:smoothies',
  'en:iced-teas', 'en:teas', 'en:coffees', 'en:coffee-drinks', 'en:hot-chocolates',
  'en:energy-drinks', 'en:sports-drinks', 'en:sweetened-beverages',
  'en:milks', 'en:plant-milks', 'en:plant-based-milk-alternatives',
  'en:almond-drinks', 'en:oat-drinks', 'en:soy-milks', 'en:rice-drinks',
  'en:dairy-drinks', 'en:milk-drinks', 'en:flavored-milks',
  'en:flavored-waters', 'en:still-waters', 'en:sparkling-waters',
]);

export function detectNutriCategory(categoriesTags: string[] | undefined | null): NutriCategory {
  const cats = (categoriesTags || []).map(t => String(t).toLowerCase());
  if (cats.some(t => WATER_TAGS.has(t))) return 'water';
  // Beverages (including milks & plant milks) BEFORE fat/nut detection so
  // "almond drink" doesn't get routed to the fats table.
  if (cats.some(t => BEVERAGE_TAGS.has(t))) return 'beverage';
  if (cats.some(t => RED_MEAT_TAGS.has(t))) return 'red-meat';
  if (cats.some(t => CHEESE_TAGS.has(t))) return 'cheese';
  if (cats.some(t => FAT_TAGS.has(t))) return 'fat';
  return 'general';
}

// -------- point tables (2023) -------------------------------------------
// Return the highest tier index i such that value >= thresholds[i]. Length
// of thresholds = max points. thresholds are lower bounds sorted ascending
// with the FIRST threshold being the boundary for "1 point".
function pointsFromThresholds(value: number, thresholds: number[]): number {
  let pts = 0;
  for (const t of thresholds) {
    if (value >= t) pts++;
    else break;
  }
  return pts;
}

// General energy (kJ): 0-10 points. Thresholds 335, 670, ..., 3350.
const GEN_ENERGY = Array.from({ length: 10 }, (_, i) => (i + 1) * 335);
// General sugars (g): 0-15 points (2023). Table:
// >3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51
const GEN_SUGARS = [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51];
// Saturated fat (g): 0-10 points, 1 g steps starting at 1.
const GEN_SATFAT = Array.from({ length: 10 }, (_, i) => i + 1);
// Salt (g): 0-20 points, 0.2 g steps starting at 0.2.
const GEN_SALT = Array.from({ length: 20 }, (_, i) => (i + 1) * 0.2);

// Beverages (2023): energy kJ (0-10), sugars g (0-10). Water is A.
// Energy thresholds: >0, 30, 90, 150, 210, 240, 270, 300, 330, 360
const BEV_ENERGY = [0.001, 30, 90, 150, 210, 240, 270, 300, 330, 360];
// Sugars thresholds: >0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5
const BEV_SUGARS = [0.001, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5];

// Fats/oils (2023): saturated as ratio (%), energy from saturated (kJ).
// Sat ratio (%): 10, 16, 22, 28, 34, 40, 46, 52, 58, 64
const FAT_SAT_RATIO = [10, 16, 22, 28, 34, 40, 46, 52, 58, 64];
// Energy from saturated (kJ per 100g): 120, 240, ..., 1200 (steps of 120)
const FAT_ENERGY_FROM_SAT = Array.from({ length: 10 }, (_, i) => (i + 1) * 120);

// Positives
// Fibre (AOAC, g): 3.0, 4.1, 5.2, 6.3, 7.4
const FIBRE = [3.0, 4.1, 5.2, 6.3, 7.4];
// Protein (g): 2.4, 4.8, 7.2, 9.6, 12, 14, 17
const PROTEIN = [2.4, 4.8, 7.2, 9.6, 12, 14, 17];
// FVL (%): 40, 60, 80 → 1, 2, 5 points (5 pts requires >80)
function fvlPoints(pct: number): number {
  if (pct > 80) return 5;
  if (pct > 60) return 2;
  if (pct > 40) return 1;
  return 0;
}
// Beverages FVL: 40 → 2, 60 → 4, 80 → 6, >80 → 10
function fvlPointsBeverage(pct: number): number {
  if (pct > 80) return 10;
  if (pct > 60) return 6;
  if (pct > 40) return 4;
  if (pct > 40) return 2;
  return 0;
}

// -------- sweetener detection -------------------------------------------
const SWEETENER_ES = new Set([
  'e950', 'e951', 'e952', 'e954', 'e955', 'e957', 'e959', 'e960',
  'e961', 'e962', 'e968', 'e969',
]);
function hasSweetener(nutri: Record<string, unknown>, raw: Record<string, unknown>): boolean {
  const tags = (raw.additives_tags as string[] | undefined) || [];
  for (const t of tags) {
    const m = String(t).toLowerCase().match(/e\d{3,4}[a-z]?/);
    if (m && SWEETENER_ES.has(m[0].replace(/[a-z]$/, ''))) return true;
  }
  // Fallback: some products expose sweetener via ingredients_analysis_tags.
  const iat = (raw.ingredients_analysis_tags as string[] | undefined) || [];
  if (iat.some(t => String(t).toLowerCase().includes('sweetener'))) return true;
  // Nutriment field used by OFF's own scorer.
  if (num(nutri['non-nutritive-sweeteners_100g']) != null) return true;
  return false;
}

// -------- main -----------------------------------------------------------
export function computeNutriScore(
  nutriments: Record<string, unknown> | null | undefined,
  categoriesTags: string[] | null | undefined,
  extraRaw?: Record<string, unknown>,
): NutriScoreResult | null {
  const n = nutriments || {};
  const raw = extraRaw || {};
  const category = detectNutriCategory(categoriesTags);

  // Water is always A (no math required).
  if (category === 'water') {
    return {
      grade: 'a', score: 0, category,
      negative: 0, positive: 0,
      components: { energy: 0, sugars: 0, satFat: 0, salt: 0, fibre: 0, protein: 0, fvl: 0 },
    };
  }

  // Core inputs
  let energyKJ = readAny(n, ['energy-kj_100g', 'energy_100g']);
  const energyKcal = readAny(n, ['energy-kcal_100g']);
  if (energyKJ == null && energyKcal != null) energyKJ = energyKcal * 4.184;

  const sugars = readAny(n, ['sugars_100g']);
  const satFat = readAny(n, ['saturated-fat_100g']);
  const totalFat = readAny(n, ['fat_100g']);
  let salt = readAny(n, ['salt_100g']);
  if (salt == null) {
    const sodium = readAny(n, ['sodium_100g']);
    if (sodium != null) salt = sodium * 2.5;
  }
  const fibre = readAny(n, ['fiber_100g', 'fibre_100g']) ?? 0;
  const protein = readAny(n, ['proteins_100g']) ?? 0;
  const fvl = readAny(n, [
    'fruits-vegetables-legumes-estimate-from-ingredients_100g',
    'fruits-vegetables-nuts-estimate-from-ingredients_100g',
    'fruits-vegetables-nuts_100g',
    'fruits-vegetables-nuts-estimate_100g',
  ]) ?? 0;

  // Minimum viable inputs
  if (energyKJ == null || satFat == null || sugars == null || salt == null) return null;

  // -------- Compute per category ---------------------------------------
  let energyPts = 0, sugarsPts = 0, satPts = 0, saltPts = 0;
  let fibrePts = 0, proteinPts = 0, fvlPts = 0;
  let sweetenerPts = 0;

  if (category === 'beverage') {
    energyPts = pointsFromThresholds(energyKJ, BEV_ENERGY);
    sugarsPts = pointsFromThresholds(sugars, BEV_SUGARS);
    satPts = pointsFromThresholds(satFat, GEN_SATFAT);
    saltPts = pointsFromThresholds(salt, GEN_SALT);
    if (hasSweetener(n, raw)) sweetenerPts = 4;
    fibrePts = pointsFromThresholds(fibre, FIBRE);
    proteinPts = pointsFromThresholds(protein, PROTEIN);
    fvlPts = fvlPointsBeverage(fvl);
  } else if (category === 'fat') {
    // Sat as ratio; energy from saturated
    const ratio = totalFat && totalFat > 0 ? (satFat / totalFat) * 100 : 0;
    const energyFromSat = satFat * 37;
    energyPts = pointsFromThresholds(energyFromSat, FAT_ENERGY_FROM_SAT);
    satPts = pointsFromThresholds(ratio, FAT_SAT_RATIO);
    sugarsPts = pointsFromThresholds(sugars, GEN_SUGARS);
    saltPts = pointsFromThresholds(salt, GEN_SALT);
    fibrePts = pointsFromThresholds(fibre, FIBRE);
    proteinPts = pointsFromThresholds(protein, PROTEIN);
    fvlPts = fvlPoints(fvl);
  } else {
    // general / cheese / red-meat
    energyPts = pointsFromThresholds(energyKJ, GEN_ENERGY);
    sugarsPts = pointsFromThresholds(sugars, GEN_SUGARS);
    satPts = pointsFromThresholds(satFat, GEN_SATFAT);
    saltPts = pointsFromThresholds(salt, GEN_SALT);
    fibrePts = pointsFromThresholds(fibre, FIBRE);
    proteinPts = pointsFromThresholds(protein, PROTEIN);
    fvlPts = fvlPoints(fvl);
  }

  const N = energyPts + sugarsPts + satPts + saltPts + sweetenerPts;
  const P = fibrePts + proteinPts + fvlPts;

  let score = 0;
  if (category === 'cheese') {
    score = N - P;
  } else if (category === 'fat') {
    // fats threshold N<7 to include protein
    if (N < 7 || fvlPts >= 5) score = N - P;
    else score = N - (fibrePts + fvlPts);
  } else if (category === 'red-meat') {
    // cap protein at 2
    const proteinCapped = Math.min(proteinPts, 2);
    const P2 = fibrePts + proteinCapped + fvlPts;
    if (N < 11 || fvlPts >= 5) score = N - P2;
    else score = N - (fibrePts + fvlPts);
  } else if (category === 'beverage') {
    score = N - P;
  } else {
    if (N < 11 || fvlPts >= 5) score = N - P;
    else score = N - (fibrePts + fvlPts);
  }

  // -------- Grade cutoffs -----------------------------------------------
  let grade: NutriGrade;
  if (category === 'beverage') {
    // (water handled above)
    if (score <= 2) grade = 'b';
    else if (score <= 6) grade = 'c';
    else if (score <= 9) grade = 'd';
    else grade = 'e';
  } else if (category === 'fat') {
    // 2023 fats cutoffs
    if (score < 2) grade = 'a';
    else if (score < 11) grade = 'b';
    else if (score < 20) grade = 'c';
    else if (score < 28) grade = 'd';
    else grade = 'e';
  } else {
    if (score < 1) grade = 'a';
    else if (score < 3) grade = 'b';
    else if (score < 11) grade = 'c';
    else if (score < 19) grade = 'd';
    else grade = 'e';
  }

  return {
    grade, score, category, negative: N, positive: P,
    components: {
      energy: energyPts, sugars: sugarsPts, satFat: satPts, salt: saltPts,
      fibre: fibrePts, protein: proteinPts, fvl: fvlPts,
      ...(sweetenerPts ? { sweetener: sweetenerPts } : {}),
    },
  };
}

/** Map a Nutri-Score numeric score + grade to a Maseya 0-100 note via
 *  continuous linear interpolation within each grade band. */
export function nutriScoreToNote(score: number, grade: NutriGrade, category: NutriCategory): number {
  // Determine band bounds (score) for this category+grade
  let lo = 0, hi = 0;
  if (category === 'beverage') {
    if (grade === 'a') return 100; // water
    if (grade === 'b') { lo = -Infinity; hi = 2; }
    else if (grade === 'c') { lo = 3; hi = 6; }
    else if (grade === 'd') { lo = 7; hi = 9; }
    else { lo = 10; hi = 40; }
  } else if (category === 'fat') {
    if (grade === 'a') { lo = -20; hi = 1; }
    else if (grade === 'b') { lo = 2; hi = 10; }
    else if (grade === 'c') { lo = 11; hi = 19; }
    else if (grade === 'd') { lo = 20; hi = 27; }
    else { lo = 28; hi = 40; }
  } else {
    if (grade === 'a') { lo = -20; hi = 0; }
    else if (grade === 'b') { lo = 1; hi = 2; }
    else if (grade === 'c') { lo = 3; hi = 10; }
    else if (grade === 'd') { lo = 11; hi = 18; }
    else { lo = 19; hi = 40; }
  }
  // Note bands
  const bands: Record<NutriGrade, [number, number]> = {
    a: [85, 100], b: [65, 85], c: [45, 65], d: [25, 45], e: [0, 25],
  };
  const [nLo, nHi] = bands[grade];
  const s = Math.max(lo, Math.min(hi, score));
  if (hi === lo) return Math.round((nLo + nHi) / 2);
  // In grade A, lower score = better → note near nHi. In others too, lower
  // score within band is better. Interpolate: score=lo→nHi, score=hi→nLo.
  const frac = (s - lo) / (hi - lo);
  return Math.round(nHi - frac * (nHi - nLo));
}
