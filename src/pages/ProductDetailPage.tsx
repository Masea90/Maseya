import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, ExternalLink, Users, Check, Leaf, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { getProductWithMatch, tagTranslations } from '@/lib/recommendations';

// Static ingredient data for products
const productIngredients: Record<number, { name: string; safe: boolean; note: string }[]> = {
  1: [
    { name: 'Aloe Vera', safe: true, note: 'Soothes & hydrates' },
    { name: 'Glycerin', safe: true, note: 'Moisture retention' },
    { name: 'Vitamin E', safe: true, note: 'Antioxidant protection' },
  ],
  2: [
    { name: 'Rosehip Seed Oil', safe: true, note: 'Rich in Vitamin A & C' },
    { name: 'Essential Fatty Acids', safe: true, note: 'Skin regeneration' },
    { name: 'Beta-Carotene', safe: true, note: 'Natural antioxidant' },
  ],
  3: [
    { name: 'Argan Oil', safe: true, note: 'Deep nourishment' },
    { name: 'Keratin', safe: true, note: 'Hair repair' },
    { name: 'Shea Butter', safe: true, note: 'Intense moisture' },
  ],
  4: [
    { name: 'Chamomile Extract', safe: true, note: 'Calming & anti-inflammatory' },
    { name: 'Bisabolol', safe: true, note: 'Reduces redness' },
    { name: 'Allantoin', safe: true, note: 'Skin healing' },
  ],
  5: [
    { name: 'Coconut Oil', safe: true, note: 'Deep conditioning' },
    { name: 'Vitamin E', safe: true, note: 'Scalp health' },
    { name: 'Lauric Acid', safe: true, note: 'Antimicrobial' },
  ],
  6: [
    { name: 'Hyaluronic Acid', safe: true, note: 'Intense hydration' },
    { name: 'Sodium Hyaluronate', safe: true, note: 'Deep penetration' },
    { name: 'Panthenol', safe: true, note: 'Skin barrier support' },
  ],
  7: [
    { name: 'Moringa Oil', safe: true, note: 'Lightweight moisture' },
    { name: 'Oleic Acid', safe: true, note: 'Hair flexibility' },
    { name: 'Vitamin C', safe: true, note: 'Hair strength' },
  ],
  8: [
    { name: 'Kaolin Clay', safe: true, note: 'Draws out impurities' },
    { name: 'Bentonite Clay', safe: true, note: 'Minimizes pores' },
    { name: 'Zinc Oxide', safe: true, note: 'Oil control' },
  ],
  9: [
    { name: 'Quinoa Protein', safe: true, note: 'Hair strengthening' },
    { name: 'Panthenol', safe: true, note: 'Moisture retention' },
    { name: 'Biotin', safe: true, note: 'Hair growth support' },
  ],
  10: [
    { name: 'Calendula Extract', safe: true, note: 'Healing & soothing' },
    { name: 'Beeswax', safe: true, note: 'Protective barrier' },
    { name: 'Vitamin E', safe: true, note: 'Skin repair' },
  ],
};

// User counts for social proof
const productUserCounts: Record<number, number> = {
  1: 892,
  2: 654,
  3: 743,
  4: 521,
  5: 612,
  6: 987,
  7: 423,
  8: 567,
  9: 389,
  10: 456,
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, user } = useUser();
  const [isFavorite, setIsFavorite] = useState(false);

  const productId = Number(id) || 1;
  const product = getProductWithMatch(productId, user);
  const ingredients = productIngredients[productId] || productIngredients[1];
  const usersLikeYou = productUserCounts[productId] || 500;

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const getTagLabel = (tag: string): string => {
    const translationKey = tagTranslations[tag];
    return translationKey ? t(translationKey) : tag;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <Heart
              className={cn(
                'w-6 h-6',
                isFavorite ? 'fill-maseya-rose text-maseya-rose' : 'text-muted-foreground'
              )}
            />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 animate-fade-in pb-28">
        {/* Product Hero */}
        <div className="bg-card rounded-3xl p-8 shadow-warm flex flex-col items-center">
          <span className="text-7xl mb-4">{product.image}</span>
          <p className="text-sm text-muted-foreground">{product.brand}</p>
          <h1 className="font-display text-xl font-semibold text-center">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2">
            <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
              {product.matchScore}% {t('match')}
            </span>
            <span className="text-lg font-semibold text-primary">{product.price}</span>
          </div>
          
          {/* Product Tags */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {product.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-maseya-sage/20 text-foreground rounded-full"
              >
                <Leaf className="w-3 h-3" />
                {getTagLabel(tag)}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('about')}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t(product.description)}
          </p>
        </div>

        {/* Why It Matches */}
        {product.matchReasons.length > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 space-y-3">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              ✨ {t('whyThisMatches')}
            </h2>
            <ul className="space-y-2">
              {product.matchReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{t(reason)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ingredients */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">{t('keyIngredients')}</h2>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl border bg-maseya-sage/5 border-maseya-sage/20"
              >
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{ing.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{ing.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-card rounded-2xl p-4 shadow-warm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-maseya-rose/20 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-maseya-rose" />
            </div>
            <div>
              <p className="font-medium text-foreground">{usersLikeYou} {t('members')}</p>
              <p className="text-sm text-muted-foreground">{t('usersLikeYouAlsoUse')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto">
          <Button 
            className="w-full h-14 rounded-2xl text-lg font-medium bg-gradient-olive"
            onClick={() => {
              // Placeholder for affiliate link
              window.open('#', '_blank');
            }}
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            {t('buyNow')} · {product.price}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
