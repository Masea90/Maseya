import { UserProfile } from '@/contexts/UserContext';
import { TranslationKey } from '@/lib/i18n';

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
  avoidFor: string[]; // skin concerns where this should be avoided
  harshIngredients: string[]; // ingredients that make it unsuitable for sensitive skin
  price: string;
  affiliateUrl?: string;
  description: TranslationKey;
}

export interface RecommendedProduct extends Product {
  matchScore: number;
  matchReasons: TranslationKey[];
}

// Product catalog - bio, natural, skin-safe products
export const productCatalog: Product[] = [
  {
    id: 1,
    name: 'Gentle Aloe Vera Cleanser',
    brand: 'Weleda',
    image: '🌿',
    category: 'skin',
    tags: ['bio', 'natural', 'vegan'],
    targetConcerns: ['sensitivity', 'dryness', 'dullness'],
    targetHairTypes: [],
    targetGoals: ['clearskin', 'natural'],
    avoidFor: [],
    harshIngredients: [],
    price: '€12.99',
    description: 'aloeCleanserDesc',
  },
  {
    id: 2,
    name: 'Organic Rosehip Oil',
    brand: 'Pai Skincare',
    image: '🌹',
    category: 'skin',
    tags: ['organic', 'natural', 'vegan', 'cruelty-free'],
    targetConcerns: ['aging', 'dryness', 'hyperpigmentation', 'dullness'],
    targetHairTypes: [],
    targetGoals: ['clearskin', 'natural'],
    avoidFor: ['oiliness', 'acne'],
    harshIngredients: [],
    price: '€24.00',
    description: 'rosehipOilDesc',
  },
  {
    id: 3,
    name: 'Argan Hair Repair Mask',
    brand: 'Maison Bio',
    image: '✨',
    category: 'hair',
    tags: ['bio', 'natural', 'cruelty-free'],
    targetConcerns: [],
    targetHairTypes: ['curly', 'coily', 'wavy'],
    targetGoals: ['healthyhair', 'natural'],
    avoidFor: [],
    harshIngredients: [],
    price: '€18.50',
    description: 'arganMaskDesc',
  },
  {
    id: 4,
    name: 'Chamomile Soothing Serum',
    brand: 'Dr. Hauschka',
    image: '🌼',
    category: 'skin',
    tags: ['natural', 'organic', 'cruelty-free'],
    targetConcerns: ['sensitivity', 'acne', 'pores'],
    targetHairTypes: [],
    targetGoals: ['clearskin', 'natural'],
    avoidFor: [],
    harshIngredients: [],
    price: '€32.00',
    description: 'chamomileSerumDesc',
  },
  {
    id: 5,
    name: 'Coconut Scalp Treatment',
    brand: 'Rahua',
    image: '🥥',
    category: 'hair',
    tags: ['organic', 'vegan', 'natural'],
    targetConcerns: [],
    targetHairTypes: ['straight', 'wavy', 'curly', 'coily'],
    targetGoals: ['healthyhair', 'natural'],
    avoidFor: [],
    harshIngredients: [],
    price: '€28.00',
    description: 'coconutScalpDesc',
  },
  {
    id: 6,
    name: 'Hyaluronic Acid Serum',
    brand: 'Typology',
    image: '💧',
    category: 'skin',
    tags: ['vegan', 'natural', 'cruelty-free'],
    targetConcerns: ['dryness', 'aging', 'dullness'],
    targetHairTypes: [],
    targetGoals: ['clearskin', 'natural'],
    avoidFor: [],
    harshIngredients: [],
    price: '€19.90',
    description: 'hyaluronicSerumDesc',
  },
  {
    id: 7,
    name: 'Moringa Hair Oil',
    brand: 'Klorane',
    image: '🌱',
    category: 'hair',
    tags: ['bio', 'natural', 'vegan'],
    targetConcerns: [],
    targetHairTypes: ['curly', 'coily'],
    targetGoals: ['healthyhair', 'natural'],
    avoidFor: [],
    harshIngredients: [],
    price: '€15.90',
    description: 'moringaOilDesc',
  },
  {
    id: 8,
    name: 'Clay Purifying Mask',
    brand: 'Cattier',
    image: '🏺',
    category: 'skin',
    tags: ['bio', 'organic', 'natural'],
    targetConcerns: ['oiliness', 'acne', 'pores'],
    targetHairTypes: [],
    targetGoals: ['clearskin', 'natural'],
    avoidFor: ['dryness', 'sensitivity'],
    harshIngredients: [],
    price: '€9.90',
    description: 'clayMaskDesc',
  },
  {
    id: 9,
    name: 'Quinoa Repair Shampoo',
    brand: 'Kérastase Aura Botanica',
    image: '🌾',
    category: 'hair',
    tags: ['natural', 'vegan'],
    targetConcerns: [],
    targetHairTypes: ['straight', 'wavy'],
    targetGoals: ['healthyhair', 'routine'],
    avoidFor: [],
    harshIngredients: [],
    price: '€26.00',
    description: 'quinoaShampooDesc',
  },
  {
    id: 10,
    name: 'Calendula Repair Balm',
    brand: 'Weleda',
    image: '🧡',
    category: 'both',
    tags: ['bio', 'natural', 'organic'],
    targetConcerns: ['dryness', 'sensitivity'],
    targetHairTypes: ['curly', 'coily'],
    targetGoals: ['natural', 'clearskin', 'healthyhair'],
    avoidFor: [],
    harshIngredients: [],
    price: '€11.50',
    description: 'calendulaBalm',
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
  const matchingHairConcerns = product.category !== 'skin' && user.hairConcerns.some(c => 
    ['dryness', 'frizz', 'hairfall'].includes(c)
  );
  if (matchingHairConcerns && product.category === 'hair') {
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

  return reasons.slice(0, 3); // Max 3 reasons
};

// Calculate match score (0-100)
const calculateMatchScore = (product: Product, user: UserProfile): number => {
  // If user has no profile data, show products with decent base score
  const hasProfile = user.skinConcerns.length > 0 || user.hairType || user.goals.length > 0;
  let score = hasProfile ? 50 : 70; // Higher base for users without profile

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
    .filter(p => p.matchScore >= 50) // Only show products with 50%+ match
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return recommendations;
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
