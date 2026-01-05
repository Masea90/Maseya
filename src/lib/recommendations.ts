import { UserProfile } from '@/contexts/UserContext';
import { TranslationKey } from '@/lib/i18n';

// Product images
import weledaSkinFood from '@/assets/products/weleda-skin-food.jpg';
import paiRosehipOil from '@/assets/products/pai-rosehip-oil.jpg';
import ordinaryNiacinamide from '@/assets/products/ordinary-niacinamide.jpg';
import olaplexHairOil from '@/assets/products/olaplex-hair-oil.jpg';
import ceraveCleanser from '@/assets/products/cerave-cleanser.jpg';
import kloraneHairMask from '@/assets/products/klorane-hair-mask.jpg';
import nuxeOil from '@/assets/products/nuxe-oil.jpg';
import renSerum from '@/assets/products/ren-serum.jpg';
import moroccanoilTreatment from '@/assets/products/moroccanoil-treatment.jpg';

export interface Product {
  id: number;
  name: string;
  brand: string;
  image: string;
  category: 'skin' | 'hair' | 'both';
  tags: ('bio' | 'natural' | 'vegan' | 'cruelty-free' | 'organic')[];
  targetConcerns: string[];
  targetHairTypes: string[];
  targetGoals: string[];
  avoidFor: string[];
  harshIngredients: string[];
  price: string;
  affiliateUrl?: string;
  description: TranslationKey;
}

export interface RecommendedProduct extends Product {
  matchScore: number;
  matchReasons: TranslationKey[];
}

// Real product catalog - clean, bio, natural beauty products
export const productCatalog: Product[] = [
  {
    id: 1,
    name: 'Skin Food Original',
    brand: 'Weleda',
    image: weledaSkinFood,
    category: 'skin',
    tags: ['natural', 'organic'],
    targetConcerns: ['dryness', 'sensitivity'],
    targetHairTypes: [],
    targetGoals: ['clearskin', 'natural'],
    avoidFor: ['oiliness'],
    harshIngredients: [],
    price: '€12.95',
    affiliateUrl: 'https://www.weleda.com',
    description: 'weledaSkinFoodDesc',
  },
  {
    id: 2,
    name: 'Rosehip BioRegenerate Oil',
    brand: 'Pai Skincare',
    image: paiRosehipOil,
    category: 'skin',
    tags: ['organic', 'vegan', 'cruelty-free'],
    targetConcerns: ['aging', 'hyperpigmentation', 'dullness', 'dryness'],
    targetHairTypes: [],
    targetGoals: ['clearskin', 'natural'],
    avoidFor: ['oiliness', 'acne'],
    harshIngredients: [],
    price: '€26.00',
    affiliateUrl: 'https://www.paiskincare.com',
    description: 'paiRosehipDesc',
  },
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
    price: '€5.80',
    affiliateUrl: 'https://theordinary.com',
    description: 'ordinaryNiacinamideDesc',
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
    price: '€28.00',
    affiliateUrl: 'https://olaplex.com',
    description: 'olaplexOilDesc',
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
    price: '€9.50',
    affiliateUrl: 'https://www.cerave.com',
    description: 'ceraveCleanserDesc',
  },
  {
    id: 6,
    name: 'Mango Butter Hair Mask',
    brand: 'Klorane',
    image: kloraneHairMask,
    category: 'hair',
    tags: ['natural', 'vegan'],
    targetConcerns: [],
    targetHairTypes: ['curly', 'coily', 'wavy'],
    targetGoals: ['healthyhair', 'natural'],
    avoidFor: [],
    harshIngredients: [],
    price: '€12.90',
    affiliateUrl: 'https://www.klorane.com',
    description: 'kloraneHairMaskDesc',
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
    price: '€29.90',
    affiliateUrl: 'https://www.nuxe.com',
    description: 'nuxeOilDesc',
  },
  {
    id: 8,
    name: 'Ready Steady Glow Tonic',
    brand: 'REN Clean Skincare',
    image: renSerum,
    category: 'skin',
    tags: ['natural', 'vegan', 'cruelty-free'],
    targetConcerns: ['dullness', 'pores', 'hyperpigmentation'],
    targetHairTypes: [],
    targetGoals: ['clearskin', 'natural'],
    avoidFor: ['sensitivity'],
    harshIngredients: [],
    price: '€32.00',
    affiliateUrl: 'https://www.renskincare.com',
    description: 'renTonicDesc',
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
    price: '€34.85',
    affiliateUrl: 'https://www.moroccanoil.com',
    description: 'moroccanoilDesc',
  },
];

// Match reasons based on profile
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

// Get personalized recommendations
export const getRecommendations = (user: UserProfile, limit: number = 6): RecommendedProduct[] => {
  const recommendations = productCatalog
    .map(product => ({
      ...product,
      matchScore: calculateMatchScore(product, user),
      matchReasons: getMatchReasons(product, user),
    }))
    .filter(p => p.matchScore >= 50)
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
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  
  const allRecs = productCatalog
    .map(product => ({
      ...product,
      matchScore: calculateMatchScore(product, user),
      matchReasons: getMatchReasons(product, user),
    }))
    .filter(p => p.matchScore >= 50 && p.matchReasons.length > 0)
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
  
  // Deterministic community user counts based on product ID
  const communityUserCounts: Record<number, number> = {
    1: 486, 2: 312, 3: 528, 4: 445, 5: 367, 6: 289, 7: 412, 8: 234, 9: 378
  };

  // Filter out excluded products and simulate community popularity
  const popularProducts = productCatalog
    .filter(p => !excludeIds.includes(p.id))
    .map((product, index) => ({
      ...product,
      matchScore: 85 - (index * 5), // Simulated popularity
      matchReasons: [] as TranslationKey[],
      communityUsers: communityUserCounts[product.id] || 200,
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
