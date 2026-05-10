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

export function flagIngredients(p: ProductData): FlaggedIngredient[] {
  const fromTags = p.ingredients_tags
    .map(t => t.replace(/^[a-z]{2}:/, '').replace(/-/g, ' '))
    .filter(Boolean);
  const fromText = (p.ingredients_text || '')
    .split(/[,;()]/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 60);
  const all = Array.from(new Set([...fromTags, ...fromText]));
  return all.slice(0, 40).map(name => ({ name, level: classifyIngredient(name) }));
}

export function calculateScore(p: ProductData, flagged: FlaggedIngredient[]): number {
  const reds = flagged.filter(f => f.level === 'avoid').length;
  const oranges = flagged.filter(f => f.level === 'caution').length;
  const isOrganic = p.labels_tags.some(t => t.includes('organic') || t.includes('bio'));

  if (p.category === 'food' && p.nutriscore_grade) {
    const map: Record<string, number> = { a: 90, b: 75, c: 55, d: 35, e: 15 };
    let score = map[p.nutriscore_grade.toLowerCase()] ?? 50;

    // Count distinct ingredients (from tags + parsed text)
    const ingredientCount = flagged.length;

    // Bonuses
    if (ingredientCount > 0 && ingredientCount < 5) score += 10;
    if (reds === 0 && oranges === 0 && ingredientCount > 0) score += 8;
    if (isOrganic) score += 5;
    if (ingredientCount > 0 && reds === 0 && oranges === 0) score += 5; // all natural

    // Penalties
    score -= reds * 10;
    score -= oranges * 5;

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
