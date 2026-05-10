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

const RED_KEYWORDS = [
  'paraben', 'sulfate', 'sulphate', 'phthalate', 'formaldehyde', 'triclosan',
  'bha', 'bht', 'mineral oil', 'paraffinum liquidum',
  'nitrite', 'aspartame', 'tartrazine', 'e102',
];

const ORANGE_KEYWORDS = [
  'alcohol denat', 'fragrance', 'parfum', 'silicone', 'dimethicone',
  'cyclopentasiloxane', 'carrageenan', 'monosodium glutamate', 'msg', 'e621',
];

// Lactose keyword sets are category-aware: in cosmetics "butter" is almost
// always a plant butter (shea, cocoa, mango), so we only flag explicit dairy.
const LACTOSE_FOOD = [
  'milk', 'lactose', 'dairy', 'whey', 'casein', 'cream',
  'skimmed milk', 'whole milk', 'milk powder',
  'lait', 'leche', 'lactosérum', 'caséine', 'lacto', 'lactosa', 'suero',
];
const LACTOSE_COSMETIC = [
  'milk protein', 'dairy', 'lactose', 'whey protein',
  'protéine de lait', 'proteína de leche',
];

const ALLERGY_KEYWORDS: Record<string, string[]> = {
  gluten: ['wheat', 'gluten', 'barley', 'rye', 'malt', 'spelt', 'trigo', 'cebada', 'centeno'],
  lactose: LACTOSE_FOOD, // default; cosmetics override in personalAlerts
  nuts: ['almond', 'walnut', 'hazelnut', 'cashew', 'pistachio', 'peanut', 'pecan', 'almendra', 'nuez', 'avellana', 'cacahuete'],
  fish: ['fish', 'shellfish', 'shrimp', 'crab', 'lobster', 'pescado', 'marisco', 'gamba', 'cangrejo'],
};

const lower = (s: string) => s.toLowerCase();

const containsAny = (haystack: string, needles: string[]) =>
  needles.some(n => haystack.includes(n));

export function classifyIngredient(name: string): IngredientLevel {
  const n = lower(name);
  if (containsAny(n, RED_KEYWORDS)) return 'avoid';
  if (containsAny(n, ORANGE_KEYWORDS)) return 'caution';
  return 'safe';
}

const SYNONYM_GROUPS: string[][] = [
  ['aqua', 'water', 'eau', 'agua'],
  ['parfum', 'fragrance', 'perfume', 'perfum'],
  ['alcohol', 'alcohol denat', 'alcohol denat.', 'ethanol', 'sd alcohol', 'denatured alcohol'],
  ['tocopherol', 'vitamin e', 'vitamine e', 'alpha-tocopherol', 'dl-alpha-tocopherol'],
];

function canonicalKey(name: string): string {
  const norm = name.toLowerCase().trim().replace(/\s+/g, ' ');
  for (const group of SYNONYM_GROUPS) {
    if (group.includes(norm)) return group[0];
  }
  return norm;
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
    .replace(/\b(ingredients?|ingredientes|ingrédients|inci|composition|composición|composição)\s*[:\-]?\s*/gi, '')
    .replace(/[·•]/g, ',')
    .replace(/\b\d+([.,]\d+)?\s*%?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function flagIngredients(p: ProductData): FlaggedIngredient[] {
  const fromTags = p.ingredients_tags
    .map(t => t.replace(/^[a-z]{2}:/, '').replace(/-/g, ' '))
    .filter(Boolean);
  const cleanedText = cleanIngredientsText(p.ingredients_text || '');
  const fromText = cleanedText
    .split(/[,;()\n\r]/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 60);
  const seen = new Set<string>();
  const all: string[] = [];
  for (const name of [...fromTags, ...fromText]) {
    const key = canonicalKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    all.push(name);
  }
  return all.slice(0, 40).map(name => ({ name, level: classifyIngredient(name) }));
}

export function calculateScore(p: ProductData, flagged: FlaggedIngredient[]): number {
  const reds = flagged.filter(f => f.level === 'avoid').length;
  const oranges = flagged.filter(f => f.level === 'caution').length;
  const isOrganic = p.labels_tags.some(t => t.includes('organic') || t.includes('bio'));

  if (p.category === 'food' && p.nutriscore_grade) {
    // Yuka-like: clean Nutriscore mapping when no bad ingredients,
    // otherwise penalise per flagged ingredient.
    const cleanMap: Record<string, number> = { a: 95, b: 82, c: 62, d: 40, e: 18 };
    const grade = p.nutriscore_grade.toLowerCase();
    let score = cleanMap[grade] ?? 50;
    if (reds > 0 || oranges > 0) {
      score -= reds * 10;
      score -= oranges * 5;
    }
    if (isOrganic) score += 3;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Cosmetic / fallback: derive from ingredient flags + positive tags
  let score = 100 - (reds * 15) - (oranges * 6);

  const positives = p.ingredients_analysis_tags.filter(t =>
    ['en:palm-oil-free', 'en:vegan', 'en:vegetarian'].includes(t)
  ).length;
  score += positives * 4;

  if (isOrganic) score += 6;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Generic profile shape — accepts either onboarding localStorage or health_profiles row
export interface PersonalProfileLike {
  skin?: string[];
  skin_type?: string[];
  skin_conditions?: string[];
  skin_sensitivities?: string[];
  allergies?: string[];
  diet?: string;
  nutrition_goals?: string[];
  pregnancy_or_lactation?: boolean;
}

const ANIMAL_KEYWORDS = ['milk', 'lactose', 'whey', 'casein', 'cream', 'egg', 'honey', 'gelatin', 'meat', 'beef', 'pork', 'chicken', 'fish', 'lait', 'leche', 'huevo', 'miel', 'gelatina', 'carne'];
const PREGNANCY_RISKY = ['retinol', 'retinyl', 'retinal', 'salicylic acid', 'salicylate', 'hydroquinone', 'formaldehyde', 'phthalate', 'caffeine', 'cafeína'];

export function calculatePersonalScore(
  p: ProductData,
  flagged: FlaggedIngredient[],
  profile: PersonalProfileLike,
  baseScore: number,
): number {
  const text = lower(p.ingredients_text || '') + ' ' + p.ingredients_tags.join(' ');
  const has = (kw: string) => text.includes(kw);
  const hasAny = (kws: string[]) => kws.some(k => text.includes(k));

  const skin = [
    ...(profile.skin || []),
    ...(profile.skin_type || []),
    ...(profile.skin_conditions || []),
  ].map(s => String(s).toLowerCase());
  const allergies = (profile.allergies || []).map(a => String(a).toLowerCase());
  const diet = String(profile.diet || '').toLowerCase();
  const isVegan = diet.includes('vegan') || allergies.includes('vegan');
  const isPregnant = !!profile.pregnancy_or_lactation;

  let score = baseScore;
  const isCosmetic = p.category === 'cosmetic';
  const isFood = p.category === 'food';

  // Skin (cosmetics)
  if (isCosmetic) {
    if (skin.includes('atopic') && (has('sulfate') || has('sulphate') || has('fragrance') || has('parfum') || has('mineral oil') || has('paraffinum'))) {
      score -= 30;
    }
    if (skin.includes('dry') && (has('sulfate') || has('sulphate') || has('alcohol denat'))) {
      score -= 20;
    }
    if (skin.includes('oily') && (has('mineral oil') || has('paraffinum') || has('silicone') || has('dimethicone'))) {
      score -= 15;
    }
  }

  // Food allergies
  if (isFood) {
    if (allergies.includes('gluten') && hasAny(ALLERGY_KEYWORDS.gluten)) score -= 50;
    if (allergies.includes('lactose') && hasAny(LACTOSE_FOOD)) score -= 50;
    if (allergies.includes('nuts') && hasAny(ALLERGY_KEYWORDS.nuts)) score -= 50;
    if (allergies.includes('fish') && hasAny(ALLERGY_KEYWORDS.fish)) score -= 50;
    if (isVegan && hasAny(ANIMAL_KEYWORDS)) score -= 30;
    // Diet alignment bonus
    if (diet && (p.labels_tags.some(t => t.includes(diet)) || (isVegan && p.ingredients_analysis_tags.includes('en:vegan')))) {
      score += 5;
    }
  }

  // Pregnancy (both categories)
  if (isPregnant && hasAny(PREGNANCY_RISKY)) score -= 40;

  // Beneficial ingredient bonus for known-good actives
  const beneficial = ['aloe', 'panthenol', 'niacinamide', 'hyaluronic', 'glycerin', 'oat', 'avena', 'centella'];
  if (isCosmetic && skin.length > 0 && hasAny(beneficial)) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreLabel(score: number): { label: string; color: string; bg: string } {
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

export function personalAlerts(p: ProductData, profile: OnboardingProfile): PersonalAlert[] {
  const alerts: PersonalAlert[] = [];
  const text = lower(p.ingredients_text || '') + ' ' + p.ingredients_tags.join(' ');

  const has = (kw: string) => text.includes(kw);
  const isCosmetic = p.category === 'cosmetic';
  const isFood = p.category === 'food';

  // Skin rules — cosmetics only
  if (isCosmetic) {
    if (profile.skin.includes('atopic')) {
      const hits: string[] = [];
      if (has('sulfate') || has('sulphate')) hits.push('Los sulfatos alteran la barrera cutánea atópica');
      if (has('fragrance') || has('parfum')) hits.push('Las fragancias pueden irritar piel atópica');
      if (has('alcohol denat')) hits.push('El alcohol puede resecar piel atópica');
      if (has('mineral oil') || has('paraffinum')) hits.push('El aceite mineral ocluye poros, puede empeorar atopia');
      if (hits.length === 0) alerts.push({ level: 'good', text: 'Sin ingredientes problemáticos para piel atópica' });
      else hits.forEach(h => alerts.push({ level: 'warn', text: h }));
    }
    if (profile.skin.includes('dry')) {
      const hits: string[] = [];
      if (has('sulfate') || has('sulphate')) hits.push('Los sulfatos resecan piel ya seca');
      if (has('alcohol denat')) hits.push('El alcohol agrava la sequedad');
      if (hits.length === 0) alerts.push({ level: 'good', text: 'Apto para piel seca' });
      else hits.forEach(h => alerts.push({ level: 'warn', text: h }));
    }
    if (profile.skin.includes('oily')) {
      const hits: string[] = [];
      if (has('mineral oil') || has('paraffinum')) hits.push('El aceite mineral puede obstruir poros en piel grasa');
      if (has('silicone') || has('dimethicone')) hits.push('Las siliconas pueden acumular sebo en piel grasa');
      if (hits.length === 0) alerts.push({ level: 'good', text: 'Apto para piel grasa' });
      else hits.forEach(h => alerts.push({ level: 'warn', text: h }));
    }
  }

  // Food allergy rules — food only
  if (isFood) {
    for (const allergy of profile.allergies) {
      if (allergy === 'none') continue;
      const kws = allergy === 'lactose' ? LACTOSE_FOOD : ALLERGY_KEYWORDS[allergy];
      if (!kws) continue;
      const found = containsAny(text, kws);
      const labels: Record<string, string> = {
        gluten: 'gluten — no apto para celiacos',
        lactose: 'lácteos',
        nuts: 'frutos secos',
        fish: 'pescado o marisco',
      };
      if (found) {
        alerts.push({ level: 'danger', text: `Contiene ${labels[allergy]}` });
      } else {
        alerts.push({ level: 'good', text: `Sin ${labels[allergy].split(' —')[0]} detectado` });
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
