import type { ProductData } from './productLookup';
import { isAlcoholicFood } from './scoring';

export type Language = 'es' | 'en' | 'fr';

export interface VoiceProfile {
  diet?: string | string[];
  pregnancy_or_lactation?: boolean;
}

const ALCOHOL_LINES: Record<Language, string[]> = {
  es: [
    'La nota no va a mejorar por mucho que la mires 🍷',
    'Nadie escanea esto esperando un 90. Tú tampoco 😄',
    'El Nutriscore no entiende de viernes 🍺',
  ],
  en: [
    "The score won't improve no matter how long you stare 🍷",
    'Nobody scans this expecting a 90. You neither 😄',
    "Nutriscore doesn't understand Fridays 🍺",
  ],
  fr: [
    "La note ne s'améliorera pas, même en la fixant 🍷",
    'Personne ne scanne ça en espérant un 90 😄',
    "Le Nutriscore ne comprend pas les vendredis 🍺",
  ],
};

const PERFECT_LINES: Record<Language, string> = {
  es: 'Has encontrado un unicornio 🦄',
  en: 'You found a unicorn 🦄',
  fr: 'Tu as trouvé une licorne 🦄',
};

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function hasHalalDiet(profile?: VoiceProfile | null): boolean {
  if (!profile) return false;
  const diets = Array.isArray(profile.diet) ? profile.diet : profile.diet ? [profile.diet] : [];
  return diets.includes('halal');
}

export function getVoiceLine(
  product: ProductData,
  generalScore: number,
  personalScore: number | null,
  profile: VoiceProfile | null | undefined,
  language: Language,
): string | null {
  // CASO B: producto perfecto — solo si el general es 100 Y (no hay nota
  // personal O la nota personal también es >= 90). Si la nota personal cae
  // (alergias, embarazo, dieta…), no es un "unicornio" para esta persona
  // aunque el general sea 100.
  if (generalScore === 100 && (personalScore == null || personalScore >= 90)) {
    return PERFECT_LINES[language];
  }

  // CASO A: bebida alcohólica (food)
  if (product.category === 'food' && isAlcoholicFood(product)) {
    // Exclusiones estrictas
    if (hasHalalDiet(profile)) return null;
    if (profile?.pregnancy_or_lactation) return null;
    if (personalScore <= 10) return null;

    const key = product.barcode && product.barcode !== 'photo' ? product.barcode : product.name || 'unknown';
    const index = simpleHash(key) % ALCOHOL_LINES[language].length;
    return ALCOHOL_LINES[language][index];
  }

  return null;
}
