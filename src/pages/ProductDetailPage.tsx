import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Users, Check, Leaf, ShoppingBag, ExternalLink, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRewards } from '@/hooks/useRewards';
import { getProductWithMatch, tagTranslations } from '@/lib/recommendations';
import { useAffiliateLinks } from '@/hooks/useAffiliateLinks';
import { supabase } from '@/integrations/supabase/client';
// Real ingredient data for products
const productIngredients: Record<number, { name: string; safe: boolean; note: string }[]> = {
  1: [
    { name: 'Sunflower Seed Oil', safe: true, note: 'Deep nourishment' },
    { name: 'Lanolin', safe: true, note: 'Protective barrier' },
    { name: 'Chamomile Extract', safe: true, note: 'Soothes irritation' },
  ],
  2: [
    { name: 'Rosehip Seed Oil', safe: true, note: 'Rich in Vitamin A & C' },
    { name: 'Vitamin E', safe: true, note: 'Antioxidant protection' },
    { name: 'Omega Fatty Acids', safe: true, note: 'Skin regeneration' },
  ],
  3: [
    { name: 'Niacinamide 10%', safe: true, note: 'Reduces blemishes' },
    { name: 'Zinc PCA 1%', safe: true, note: 'Oil control' },
    { name: 'Tasmanian Pepperberry', safe: true, note: 'Reduces irritation' },
  ],
  4: [
    { name: 'Bis-Aminopropyl Diglycol Dimaleate', safe: true, note: 'Bond repair' },
    { name: 'Moringa Oil', safe: true, note: 'Shine enhancement' },
    { name: 'Fermented Green Tea', safe: true, note: 'Antioxidant' },
  ],
  5: [
    { name: 'Ceramides 1, 3, 6-II', safe: true, note: 'Restores skin barrier' },
    { name: 'Hyaluronic Acid', safe: true, note: 'Hydration' },
    { name: 'Glycerin', safe: true, note: 'Moisture retention' },
  ],
  6: [
    { name: 'Mango Butter', safe: true, note: 'Intense nourishment' },
    { name: 'Apricot Kernel Oil', safe: true, note: 'Softening' },
    { name: 'Vitamin E', safe: true, note: 'Hair protection' },
  ],
  7: [
    { name: 'Tsubaki Oil', safe: true, note: 'Shine & softness' },
    { name: 'Argan Oil', safe: true, note: 'Nourishment' },
    { name: 'Sweet Almond Oil', safe: true, note: 'Conditioning' },
    { name: 'Hazelnut Oil', safe: true, note: 'Lightweight moisture' },
  ],
  8: [
    { name: 'Lactic Acid', safe: true, note: 'Gentle exfoliation' },
    { name: 'Willow Bark Extract', safe: true, note: 'Pore refinement' },
    { name: 'Succinic Acid', safe: true, note: 'Brightening' },
  ],
  9: [
    { name: 'Argan Oil', safe: true, note: 'Deep conditioning' },
    { name: 'Linseed Extract', safe: true, note: 'Strengthening' },
    { name: 'Vitamin E & F', safe: true, note: 'Shine & protection' },
  ],
};

// User counts for social proof
const productUserCounts: Record<number, number> = {
  1: 892, 2: 654, 3: 743, 4: 521, 5: 612, 6: 987, 7: 423, 8: 567, 9: 389,
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, user, updateUser } = useUser();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAllRetailers, setShowAllRetailers] = useState(false);

  const productId = Number(id) || 1;
  const product = getProductWithMatch(productId, user);
  const ingredients = productIngredients[productId] || productIngredients[1];
  const usersLikeYou = productUserCounts[productId] || 500;
  const { links, primaryLink, isLoading: linksLoading, trackClick } = useAffiliateLinks(productId);
  const { currentUser } = useAuth();
  const { awardBadge, recordPoints } = useRewards();

  // Track affiliate click with reward (max 1/product/day)
  const handleAffiliateClick = useCallback(async (link: typeof primaryLink) => {
    if (!link) return;
    
    // Award points (check daily limit per product)
    if (currentUser?.id) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('point_transactions')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('reason', 'affiliate_click')
          .eq('badge_id', `product_${productId}`)
          .gte('created_at', `${today}T00:00:00`)
          .limit(1);
        
        if (!existing || existing.length === 0) {
          updateUser({ points: user.points + 3 });
          recordPoints(3, 'affiliate_click', `product_${productId}`);
        }
        
        // Badge: first affiliate click ever
        awardBadge('smart_shopper');
      } catch (e) {
        console.error('Error awarding affiliate points:', e);
      }
    }
    
    trackClick(link);
  }, [currentUser?.id, productId, user.points, updateUser, recordPoints, awardBadge, trackClick]);

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

  const secondaryLinks = links.filter(l => !l.is_primary);
  const visibleSecondaryLinks = showAllRetailers ? secondaryLinks : secondaryLinks.slice(0, 2);

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
        <div className="bg-card rounded-3xl shadow-warm flex flex-col items-center overflow-hidden">
          <div className="w-full aspect-square bg-white">
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">{product.brand}</p>
            <h1 className="font-display text-xl font-semibold">{product.name}</h1>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
                {product.matchScore}% {t('match')}
              </span>
              <span className="text-lg font-semibold text-primary">{product.price}</span>
            </div>
            
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
        </div>

        {/* Real Product Note */}
        <div className="bg-maseya-cream/50 border border-maseya-sage/30 rounded-xl p-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {t('realProductNote')}
          </p>
        </div>

        {/* Where to Buy - Multi-retailer */}
        {links.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              {t('whereToBy')}
            </h2>

            <div className="space-y-2">
              {/* Primary retailer - prominent */}
              {primaryLink && (
                <button
                  onClick={() => handleAffiliateClick(primaryLink)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{primaryLink.retailer_icon}</span>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{primaryLink.retailer_name}</p>
                      <p className="text-xs text-muted-foreground">{t('officialStore')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{product.price}</span>
                    <ExternalLink className="w-4 h-4 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </button>
              )}

              {/* Secondary retailers */}
              {visibleSecondaryLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => handleAffiliateClick(link)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{link.retailer_icon}</span>
                    <p className="font-medium text-foreground text-sm">{link.retailer_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('visitStore')}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>
              ))}

              {/* Show more toggle */}
              {secondaryLinks.length > 2 && !showAllRetailers && (
                <button
                  onClick={() => setShowAllRetailers(true)}
                  className="w-full flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  {t('moreOptions')}
                </button>
              )}
            </div>
          </div>
        )}

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

      {/* Fixed CTA - Primary affiliate link */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto">
          <Button 
            className="w-full h-14 rounded-2xl text-lg font-medium bg-gradient-olive"
            disabled={linksLoading || !primaryLink}
            onClick={() => {
              if (primaryLink) {
                handleAffiliateClick(primaryLink);
              }
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
