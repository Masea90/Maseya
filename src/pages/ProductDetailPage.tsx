import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Check, Leaf, ShoppingBag, ExternalLink, ChevronDown } from 'lucide-react';
import { buildAmazonAffiliateUrl } from '@/lib/amazonAffiliate';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRewards } from '@/hooks/useRewards';
import { getProductWithMatch, tagTranslations } from '@/lib/recommendations';
import { useAffiliateLinks } from '@/hooks/useAffiliateLinks';
import { useWishlist } from '@/hooks/useWishlist';
import { supabase } from '@/integrations/supabase/client';
// Real ingredient data for products — only verified ingredients
// Notes use i18n keys for full localization
const productIngredients: Record<number, { name: string; noteKey: string }[]> = {
  3: [
    { name: 'Niacinamide 10%', noteKey: 'ingNoteReducesBlemishes' },
    { name: 'Zinc PCA 1%', noteKey: 'ingNoteOilControl' },
    { name: 'Tasmanian Pepperberry', noteKey: 'ingNoteReducesIrritation' },
  ],
  4: [
    { name: 'Bis-Aminopropyl Diglycol Dimaleate', noteKey: 'ingNoteBondRepair' },
    { name: 'Moringa Oil', noteKey: 'ingNoteShineEnhancement' },
    { name: 'Fermented Green Tea', noteKey: 'ingNoteAntioxidant' },
  ],
  5: [
    { name: 'Ceramides 1, 3, 6-II', noteKey: 'ingNoteRestoresBarrier' },
    { name: 'Hyaluronic Acid', noteKey: 'ingNoteHydration' },
    { name: 'Glycerin', noteKey: 'ingNoteMoistureRetention' },
  ],
  7: [
    { name: 'Tsubaki Oil', noteKey: 'ingNoteShineSoftness' },
    { name: 'Argan Oil', noteKey: 'ingNoteNourishment' },
    { name: 'Sweet Almond Oil', noteKey: 'ingNoteConditioning' },
    { name: 'Hazelnut Oil', noteKey: 'ingNoteLightMoisture' },
  ],
  9: [
    { name: 'Argan Oil', noteKey: 'ingNoteDeepConditioning' },
    { name: 'Linseed Extract', noteKey: 'ingNoteStrengthening' },
    { name: 'Vitamin E & F', noteKey: 'ingNoteShineProtection' },
  ],
  10: [
    { name: 'Sunflower Seed Oil', noteKey: 'ingNoteDeepNourishment' },
    { name: 'Lanolin', noteKey: 'ingNoteProtectiveBarrier' },
    { name: 'Viola Tricolor Extract', noteKey: 'ingNoteSoothesCalms' },
    { name: 'Chamomile Extract', noteKey: 'ingNoteAntiInflammatory' },
    { name: 'Calendula Extract', noteKey: 'ingNoteSkinRepair' },
  ],
  11: [
    { name: 'Rosehip Fruit Oil (CO2)', noteKey: 'ingNoteVitaminAC' },
    { name: 'Rosehip Seed Oil', noteKey: 'ingNoteSkinRegeneration' },
    { name: 'Vitamin E (Tocopherol)', noteKey: 'ingNoteAntioxidantProtection' },
  ],
  12: [
    { name: 'Lactic Acid (AHA)', noteKey: 'ingNoteGentleExfoliation' },
    { name: 'Willow Bark Extract (BHA)', noteKey: 'ingNotePoreRefinement' },
    { name: 'Azelaic Acid', noteKey: 'ingNoteBrighteningAntiRedness' },
  ],
  13: [
    { name: 'Mango Butter', noteKey: 'ingNoteIntenseNourishment' },
    { name: 'Mango Pulp Extract', noteKey: 'ingNoteSofteningRepair' },
    { name: 'Coconut Oil', noteKey: 'ingNoteDeepConditioning' },
  ],
};


const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, user, updateUser } = useUser();
  const [showAllRetailers, setShowAllRetailers] = useState(false);
  const productId = Number(id) || 1;
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isFavorite = isInWishlist(productId);


  const product = getProductWithMatch(productId, user);
  const ingredients = productIngredients[productId] || null;
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
        <p className="text-muted-foreground">{t('productNotFound')}</p>
      </div>
    );
  }

  const getTagLabel = (tag: string): string => {
    const translationKey = tagTranslations[tag];
    return translationKey ? t(translationKey) : tag;
  };

  const secondaryLinks = links.filter(l => !l.is_primary);

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
            onClick={() => toggleWishlist(productId)}
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

        {/* Verified product badge - only show tags that are true for this product */}

        {/* Where to Buy */}
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">{t('openOnAmazon')}</span>
                    <ExternalLink className="w-4 h-4 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </button>
              )}

              {/* Other countries - collapsed by default */}
              {secondaryLinks.length > 0 && (
                <>
                  {showAllRetailers ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium px-1">{t('otherCountries')}</p>
                      {secondaryLinks.map(link => (
                        <button
                          key={link.id}
                          onClick={() => handleAffiliateClick(link)}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{link.retailer_icon}</span>
                            <p className="font-medium text-foreground text-sm">{link.retailer_name}</p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAllRetailers(true)}
                      className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      {t('otherCountries')}
                    </button>
                  )}
                </>
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
          {ingredients ? (
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
                  <span className="text-xs text-muted-foreground">{t(ing.noteKey as any)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-border bg-muted/30 text-center">
              <p className="text-sm text-muted-foreground">{t('ingredientListComingSoon')}</p>
            </div>
          )}
        </div>

        {/* Trust Badge */}
        <div className="bg-card rounded-2xl p-4 shadow-warm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{t('selectedForYourProfile')}</p>
              <p className="text-sm text-muted-foreground">{t('curatedForYou')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed CTA - Primary affiliate link */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border">
        <div className="w-full sm:max-w-lg sm:mx-auto">
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
            {t('openOnAmazon')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
