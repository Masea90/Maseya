import { UserProfile } from '@/contexts/UserContext';
import { TranslationKey } from '@/lib/i18n';

// Product images
import ordinaryNiacinamide from '@/assets/products/ordinary-niacinamide.jpg';
import olaplexHairOil from '@/assets/products/olaplex-hair-oil.jpg';
import ceraveCleanser from '@/assets/products/cerave-cleanser.jpg';
import nuxeOil from '@/assets/products/nuxe-oil.jpg';
import moroccanoilTreatment from '@/assets/products/moroccanoil-treatment.jpg';
import weledaSkinFood from '@/assets/products/weleda-skin-food.jpg';
import paiRosehip from '@/assets/products/pai-rosehip-oil.jpg';
import renSerum from '@/assets/products/ren-serum.jpg';
import kloraneMask from '@/assets/products/klorane-hair-mask.jpg';

export interface Product {
  id: number;
  name: string;
  brand: string;
  image: string;
  category: 'skin' | 'hair' | 'both';
  tags: string[];
  targetConcerns: string[];
  targetHairTypes: string[];
  targetGoals: string[];
  avoidFor: string[];
  harshIngredients: string[];
  affiliateUrl?: string;
  description: TranslationKey;

  // MASEYA-safe flags
  isVegan?: boolean;
  isOrganic?: boolean;
  noFragrance?: boolean;
  noEssentialOils?: boolean;
  noDryingAlcohols?: boolean;
  noSulfates?: boolean;
  noSilicones?: boolean;
  sensitiveSafe?: boolean;
}

export interface RecommendedProduct extends Product {
  matchScore: number;
  matchReasons: TranslationKey[];
  recommendedBecause: string[]; // User-facing "because you selected X" reasons
}

// Real product catalog - clean, bio, natural beauty products
export const productCatalog: Product[] = [
  {
    id: 3,
    name: 'Niacinamide 10% + Zinc 1%',
    brand: 'The Ordinary',
    image: ordinaryNiacinamide,
    category: 'skin',
    tags: ['vegan', 'cruelty-free'],
    targetConcerns: ['oiliness', 'acne', 'pores'],
    targetHairTypes: [],
    targetGoals: ['clearskin'],
    avoidFor: [],
    harshIngredients: [],
    description: 'ordinaryNiacinamideDesc',
    isVegan: true,
    noFragrance: true,
    noEssentialOils: true,
    noDryingAlcohols: true,
    noSulfates: true,
    noSilicones: true,
    sensitiveSafe: true,
  },
  {
    id: 4,
    name: 'No.7 Bonding Oil',
    brand: 'Olaplex',
    image: olaplexHairOil,
    category: 'hair',
    tags: ['vegan', 'cruelty-free'],
    targetConcerns: [],
    targetHairTypes: ['straight', 'wavy', 'curly', 'coily'],
    targetGoals: ['healthyhair'],
    avoidFor: [],
    harshIngredients: [],
    description: 'olaplexOilDesc',
    isVegan: true,
    noFragrance: false,
    noDryingAlcohols: true,
    noSulfates: true,
    sensitiveSafe: false,
  },
  {
    id: 5,
    name: 'Hydrating Cleanser',
    brand: 'CeraVe',
    image: ceraveCleanser,
    category: 'skin',
    tags: ['cruelty-free'],
    targetConcerns: ['dryness', 'sensitivity'],
    targetHairTypes: [],
    targetGoals: ['clearskin', 'routine'],
    avoidFor: [],
    harshIngredients: [],
    description: 'ceraveCleanserDesc',
    noFragrance: true,
    noDryingAlcohols: true,
    noSulfates: true,
    sensitiveSafe: true,
  },
  {
    id: 7,
    name: 'Huile Prodigieuse',
    brand: 'NUXE',
    image: nuxeOil,
    category: 'both',
    tags: ['natural'],
    targetConcerns: ['dryness', 'dullness'],
    targetHairTypes: ['straight', 'wavy', 'curly', 'coily'],
    targetGoals: ['clearskin', 'healthyhair', 'natural'],
    avoidFor: [],
    harshIngredients: [],
    description: 'nuxeOilDesc',
    noSulfates: true,
    noSilicones: true,
    noDryingAlcohols: true,
  },
  {
    id: 9,
    name: 'Treatment Original',
    brand: 'Moroccanoil',
    image: moroccanoilTreatment,
    category: 'hair',
    tags: ['natural', 'cruelty-free'],
    targetConcerns: [],
    targetHairTypes: ['straight', 'wavy', 'curly', 'coily'],
    targetGoals: ['healthyhair'],
    avoidFor: [],
    harshIngredients: [],
    description: 'moroccanoilDesc',
    noSulfates: true,
    noDryingAlcohols: true,
  },
  {
    id: 10,
    name: 'Skin Food',
    brand: 'Weleda',
    image: weledaSkinFood,
    category: 'skin',
    tags: ['dry_skin', 'barrier', 'cream'],
    targetConcerns: ['dryness', 'irritation'],
    targetHairTypes: [],
    targetGoals: ['hydrate', 'repair_barrier'],
    avoidFor: ['acne_prone'],
    harshIngredients: [],
    description: 'weledaSkinFoodDesc',
    isVegan: false,
    isOrganic: true,
    noFragrance: false,
    noEssentialOils: false,
    noDryingAlcohols: true,
    sensitiveSafe: false,
  },
  {
    id: 11,
    name: 'Rosehip Oil',
    brand: 'Pai',
    image: paiRosehip,
    category: 'skin',
    tags: ['oil', 'sensitive', 'redness'],
    targetConcerns: ['redness', 'dryness'],
    targetHairTypes: [],
    targetGoals: ['soothe', 'repair'],
    avoidFor: [],
    harshIngredients: [],
    description: 'paiRosehipDesc',
    isVegan: true,
    isOrganic: true,
    noFragrance: true,
    noEssentialOils: true,
    noDryingAlcohols: true,
    sensitiveSafe: true,
  },
  {
    id: 12,
    name: 'Serum',
    brand: 'REN',
    image: renSerum,
    category: 'skin',
    tags: ['serum', 'glow'],
    targetConcerns: ['dullness', 'texture'],
    targetHairTypes: [],
    targetGoals: ['brighten'],
    avoidFor: [],
    harshIngredients: [],
    description: 'renTonicDesc',
    isVegan: true,
    isOrganic: false,
    noFragrance: true,
    noEssentialOils: true,
    noDryingAlcohols: true,
    sensitiveSafe: true,
  },
  {
    id: 13,
    name: 'Hair Mask',
    brand: 'Klorane',
    image: kloraneMask,
    category: 'hair',
    tags: ['mask', 'repair'],
    targetConcerns: [],
    targetHairTypes: ['dry', 'damaged'],
    targetGoals: ['repair', 'shine'],
    avoidFor: [],
    harshIngredients: [],
    description: 'kloraneHairMaskDesc',
    isVegan: true,
    isOrganic: false,
    noSulfates: true,
    noSilicones: false,
    noFragrance: false,
    sensitiveSafe: false,
  },
];

// Match reasons based on profile - returns translation keys
const getMatchReasons = (product: Product, user: UserProfile): TranslationKey[] => {
  const reasons: TranslationKey[] = [];

  // Check skin concerns match
  const matchingSkinConcerns = product.targetConcerns.filter(c => 
    user.skinConcerns.includes(c)
  );
  if (matchingSkinConcerns.length > 0) {
    if (matchingSkinConcerns.includes('sensitivity')) {
      reasons.push('reasonGoodForSensitive');
    } else if (matchingSkinConcerns.includes('dryness')) {
      reasons.push('reasonHydratesDrySkin');
    } else if (matchingSkinConcerns.includes('oiliness')) {
      reasons.push('reasonControlsOil');
    } else if (matchingSkinConcerns.includes('acne')) {
      reasons.push('reasonHelpsWithAcne');
    } else if (matchingSkinConcerns.includes('aging')) {
      reasons.push('reasonAntiAging');
    }
  }

  // Check hair type match
  if (product.targetHairTypes.includes(user.hairType)) {
    if (user.hairType === 'curly' || user.hairType === 'coily') {
      reasons.push('reasonPerfectForCurls');
    } else if (user.hairType === 'wavy') {
      reasons.push('reasonEnhancesWaves');
    } else {
      reasons.push('reasonMatchesHairType');
    }
  }

  // Check hair concerns
  const hasHairConcerns = user.hairConcerns.some(c => 
    ['dryness', 'frizz', 'hairfall'].includes(c)
  );
  if (hasHairConcerns && (product.category === 'hair' || product.category === 'both')) {
    reasons.push('reasonNourishesHair');
  }

  // Check goals match
  if (product.targetGoals.some(g => user.goals.includes(g))) {
    if (user.goals.includes('natural')) {
      reasons.push('reasonAllNatural');
    }
  }

  // Clean ingredients for sensitive skin
  if (user.skinConcerns.includes('sensitivity') && product.harshIngredients.length === 0) {
    if (!reasons.some(r => r === 'reasonGoodForSensitive')) {
      reasons.push('reasonGentleFormula');
    }
  }

  return reasons.slice(0, 3);
};

// Concern display names for user-facing text
const concernDisplayNames: Record<string, string> = {
  dryness: 'dryness',
  acne: 'acne & breakouts',
  aging: 'fine lines & aging',
  sensitivity: 'sensitivity',
  oiliness: 'oily skin',
  hyperpigmentation: 'dark spots',
  dullness: 'dull skin',
  pores: 'large pores',
};

const hairTypeDisplayNames: Record<string, string> = {
  straight: 'straight hair',
  wavy: 'wavy hair',
  curly: 'curly hair',
  coily: 'coily hair',
};

const goalDisplayNames: Record<string, string> = {
  clearskin: 'clear skin',
  healthyhair: 'healthy hair',
  natural: 'all-natural products',
  nutrition: 'better nutrition',
  routine: 'simple routines',
};

// Get user-facing "Recommended because you selected..." text
const getRecommendedBecause = (product: Product, user: UserProfile): string[] => {
  const reasons: string[] = [];

  // Skin concerns
  const matchingSkinConcerns = product.targetConcerns.filter(c => 
    user.skinConcerns.includes(c)
  );
  matchingSkinConcerns.forEach(concern => {
    const displayName = concernDisplayNames[concern] || concern;
    reasons.push(displayName);
  });

  // Hair type
  if (product.targetHairTypes.includes(user.hairType) && user.hairType) {
    const displayName = hairTypeDisplayNames[user.hairType] || user.hairType;
    reasons.push(displayName);
  }

  // Goals
  const matchingGoals = product.targetGoals.filter(g => user.goals.includes(g));
  matchingGoals.forEach(goal => {
    const displayName = goalDisplayNames[goal] || goal;
    reasons.push(displayName);
  });

  // Return unique reasons, max 2
  return [...new Set(reasons)].slice(0, 2);
};

// Calculate match score (0-100)
const calculateMatchScore = (product: Product, user: UserProfile): number => {
  const hasProfile = user.skinConcerns.length > 0 || user.hairType || user.goals.length > 0;
  let score = hasProfile ? 50 : 70;

  // Skin concerns match (+15 per match, max +30)
  const skinMatches = product.targetConcerns.filter(c => user.skinConcerns.includes(c)).length;
  score += Math.min(skinMatches * 15, 30);

  // Hair type match (+20)
  if (product.targetHairTypes.includes(user.hairType)) {
    score += 20;
  }

  // Hair concerns match (+10 per match, max +20)
  const hairMatches = user.hairConcerns.filter(c => 
    product.category === 'hair' || product.category === 'both'
  ).length;
  if (hairMatches > 0 && (product.category === 'hair' || product.category === 'both')) {
    score += Math.min(hairMatches * 10, 20);
  }

  // Goals match (+10 per match, max +20)
  const goalMatches = product.targetGoals.filter(g => user.goals.includes(g)).length;
  score += Math.min(goalMatches * 10, 20);

  // Penalty for products that should be avoided
  if (product.avoidFor.some(c => user.skinConcerns.includes(c))) {
    score -= 40;
  }

  // Penalty for harsh ingredients with sensitive skin
  if (user.skinConcerns.includes('sensitivity') && product.harshIngredients.length > 0) {
    score -= 30;
  }

  // Bonus for natural/organic tags matching natural goal
  if (user.goals.includes('natural') && product.tags.some(t => ['bio', 'organic', 'natural'].includes(t))) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
};

// Get personalized recommendations - only returns products with profile matches
export const getRecommendations = (user: UserProfile, limit: number = 6): RecommendedProduct[] => {
  const hasProfile = user.skinConcerns.length > 0 || user.hairType || user.goals.length > 0;
  
  // If no profile, return empty - we only show personalized recommendations
  if (!hasProfile) {
    return [];
  }

  const recommendations = productCatalog
    .map(product => ({
      ...product,
      matchScore: calculateMatchScore(product, user),
      matchReasons: getMatchReasons(product, user),
      recommendedBecause: getRecommendedBecause(product, user),
    }))
    .filter(p => p.matchScore >= 60 && p.recommendedBecause.length > 0) // Only products with clear match
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return recommendations;
};

// Get top recommendation (highest match)
export const getTopRecommendation = (user: UserProfile): RecommendedProduct | null => {
  const recommendations = getRecommendations(user, 1);
  return recommendations[0] || null;
};

// Get profile-based recommendations (skin/hair specific, rotates daily)
export const getProfileRecommendations = (user: UserProfile, limit: number = 3): RecommendedProduct[] => {
  const hasProfile = user.skinConcerns.length > 0 || user.hairType || user.goals.length > 0;
  
  if (!hasProfile) {
    return [];
  }

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  
  const allRecs = productCatalog
    .map(product => ({
      ...product,
      matchScore: calculateMatchScore(product, user),
      matchReasons: getMatchReasons(product, user),
      recommendedBecause: getRecommendedBecause(product, user),
    }))
    .filter(p => p.matchScore >= 60 && p.recommendedBecause.length > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  // Skip top pick and rotate based on day
  const offset = dayOfYear % Math.max(1, allRecs.length - 1);
  const pool = allRecs.slice(1);
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];
  
  return rotated.slice(0, limit);
};

// Get community popular products (rotates weekly, excludes provided IDs)
export const getCommunityPopular = (limit: number = 2, excludeIds: number[] = []): RecommendedProduct[] => {
  const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 604800000);
  
  // Filter out excluded products
  const popularProducts = productCatalog
    .filter(p => !excludeIds.includes(p.id))
    .map((product, index) => ({
      ...product,
      matchScore: 85 - (index * 5),
      matchReasons: [] as TranslationKey[],
      recommendedBecause: [] as string[],
    }));

  // Rotate based on week
  const offset = weekOfYear % Math.max(1, popularProducts.length);
  const rotated = [...popularProducts.slice(offset), ...popularProducts.slice(0, offset)];
  
  return rotated.slice(0, limit);
};

// Get product by ID with user-specific match info
export const getProductWithMatch = (productId: number, user: UserProfile): RecommendedProduct | null => {
  const product = productCatalog.find(p => p.id === productId);
  if (!product) return null;

  return {
    ...product,
    matchScore: calculateMatchScore(product, user),
    matchReasons: getMatchReasons(product, user),
    recommendedBecause: getRecommendedBecause(product, user),
  };
};


// Tag display names (for translation)
export const tagTranslations: Record<string, TranslationKey> = {
  bio: 'tagBio',
  natural: 'tagNatural',
  vegan: 'tagVegan',
  'cruelty-free': 'tagCrueltyFree',
  organic: 'tagOrganic',
};

// Context-based recommendations for daily cards
export type DiscoverContext = 'skin_today' | 'hair_today' | null;

interface ContextRecommendation extends RecommendedProduct {
  contextLabel: string; // e.g. "Because your skin is dehydrated"
  tier: 'top' | 'alternative' | 'budget';
}

const getSkinContextLabel = (product: Product, user: UserProfile): string => {
  if (user.skinConcerns.includes('dryness') && product.targetConcerns.includes('dryness')) {
    return 'Because your skin needs hydration';
  }
  if (user.skinConcerns.includes('sensitivity') && product.sensitiveSafe) {
    return 'Safe for your sensitive skin';
  }
  if (user.skinConcerns.includes('acne') && product.targetConcerns.includes('acne')) {
    return 'Helps with breakouts';
  }
  if (user.skinConcerns.includes('oiliness') && product.targetConcerns.includes('oiliness')) {
    return 'Controls excess oil';
  }
  if (user.skinConcerns.includes('aging') && product.targetConcerns.includes('aging')) {
    return 'Targets fine lines & aging';
  }
  if (product.noFragrance) return 'Matches your preference: no fragrance';
  if (product.isVegan) return 'Vegan & clean formula';
  if (product.isOrganic) return 'Organic ingredients';
  return 'Recommended for your profile';
};

const getHairContextLabel = (product: Product, user: UserProfile): string => {
  if (user.hairType && product.targetHairTypes.includes(user.hairType)) {
    const names: Record<string, string> = { straight: 'straight', wavy: 'wavy', curly: 'curly', coily: 'coily' };
    return `Perfect for ${names[user.hairType] || user.hairType} hair`;
  }
  if (user.hairConcerns.includes('dryness')) return 'Nourishes dry hair';
  if (user.hairConcerns.includes('frizz')) return 'Tames frizz';
  if (user.hairConcerns.includes('hairfall')) return 'Strengthens hair';
  return 'Recommended for your hair type';
};

export const getContextRecommendations = (
  context: DiscoverContext,
  user: UserProfile
): ContextRecommendation[] => {
  if (!context) return [];

  const isSkin = context === 'skin_today';
  const categoryFilter = isSkin
    ? (p: Product) => p.category === 'skin' || p.category === 'both'
    : (p: Product) => p.category === 'hair' || p.category === 'both';

  const getLabel = isSkin ? getSkinContextLabel : getHairContextLabel;

  const scored = productCatalog
    .filter(categoryFilter)
    .map(product => {
      const matchScore = calculateMatchScore(product, user);
      return {
        ...product,
        matchScore,
        matchReasons: getMatchReasons(product, user),
        recommendedBecause: getRecommendedBecause(product, user),
        contextLabel: getLabel(product, user),
        tier: 'alternative' as const,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  // Assign tiers
  return scored.map((p, i) => ({
    ...p,
    tier: i < 3 ? 'top' as const : i < 7 ? 'alternative' as const : 'budget' as const,
  }));
};
