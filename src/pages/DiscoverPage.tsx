import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Search, Heart, Star, Sparkles, Crown, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { 
  getTopRecommendation, 
  getProfileRecommendations, 
  getCommunityPopular,
  tagTranslations, 
  RecommendedProduct 
} from '@/lib/recommendations';
import { TranslationKey } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
const DiscoverPage = () => {
  const { t, user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);

  // Check if user has completed their profile
  const hasProfile = user.skinConcerns.length > 0 || user.hairType || user.goals.length > 0;

  // Get personalized recommendations with rotation
  const topPick = useMemo(() => getTopRecommendation(user), [user]);
  const profilePicks = useMemo(() => getProfileRecommendations(user, 2), [user]);
  
  // Get IDs of products already shown to exclude from community section
  const shownIds = useMemo(() => {
    const ids: number[] = [];
    if (topPick) ids.push(topPick.id);
    profilePicks.forEach(p => ids.push(p.id));
    return ids;
  }, [topPick, profilePicks]);
  
  const communityPopular = useMemo(() => getCommunityPopular(2, shownIds), [shownIds]);

  // Filter by search
  const filterBySearch = (products: RecommendedProduct[]) => {
    if (!searchQuery) return products;
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredTopPick = topPick && (
    topPick.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topPick.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    !searchQuery
  ) ? topPick : null;

  const filteredProfilePicks = filterBySearch(profilePicks);
  const filteredCommunityPicks = filterBySearch(communityPopular);

  const hasResults = filteredTopPick || filteredProfilePicks.length > 0 || filteredCommunityPicks.length > 0;

  const toggleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const getTagLabel = (tag: string): string => {
    const translationKey = tagTranslations[tag];
    return translationKey ? t(translationKey) : tag;
  };

  // Get the "Recommended because you selected X" text
  const getRecommendedBecauseText = (product: RecommendedProduct): string => {
    if (product.recommendedBecause && product.recommendedBecause.length > 0) {
      return `${t('recommendedBecause')} ${product.recommendedBecause.join(' & ')}`;
    }
    return '';
  };

  // Get the main concern this product solves for the user
  const getSolvesText = (product: RecommendedProduct): string => {
    if (product.matchReasons.length > 0) {
      return t(product.matchReasons[0]);
    }
    return '';
  };

  return (
    <AppLayout title={t('discover')}>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-card border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* No Profile Message */}
        {!hasProfile && (
          <div className="bg-gradient-to-br from-maseya-cream to-maseya-sage/20 rounded-2xl p-6 border border-maseya-sage/30 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">
                {t('completeProfileTitle')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('completeProfileDesc')}
              </p>
            </div>
            <Link to="/profile">
              <Button className="w-full">
                {t('completeProfile')}
              </Button>
            </Link>
          </div>
        )}

        {/* Top Pick - Hero Section */}
        {hasProfile && filteredTopPick && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {t('topPickForYou')}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t('refreshesDaily')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground -mt-1">
              {t('topPickSubtitle')}
            </p>
            
            <TopPickCard 
              product={filteredTopPick}
              isFavorite={favorites.includes(filteredTopPick.id)}
              onToggleFavorite={() => toggleFavorite(filteredTopPick.id)}
              t={t}
              getTagLabel={getTagLabel}
              getSolvesText={getSolvesText}
              getRecommendedBecauseText={getRecommendedBecauseText}
            />
          </section>
        )}

        {/* Because of Your Profile Section */}
        {hasProfile && filteredProfilePicks.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {t('becauseOfProfile')}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t('refreshesDaily')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground -mt-1">
              {t('becauseOfProfileSubtitle')}
            </p>
            
            <div className="space-y-3">
              {filteredProfilePicks.map(product => (
                <ProfilePickCard 
                  key={product.id}
                  product={product}
                  isFavorite={favorites.includes(product.id)}
                  onToggleFavorite={() => toggleFavorite(product.id)}
                  t={t}
                  getTagLabel={getTagLabel}
                  getSolvesText={getSolvesText}
                  getRecommendedBecauseText={getRecommendedBecauseText}
                />
              ))}
            </div>
          </section>
        )}

        {/* Popular in Community Section */}
        {filteredCommunityPicks.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-maseya-rose" />
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {t('popularInCommunity')}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t('refreshesWeekly')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground -mt-1">
              {t('popularSubtitle')}
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {filteredCommunityPicks.map(product => (
                <CommunityCard 
                  key={product.id}
                  product={product}
                  isFavorite={favorites.includes(product.id)}
                  onToggleFavorite={() => toggleFavorite(product.id)}
                  t={t}
                  getTagLabel={getTagLabel}
                />
              ))}
            </div>
          </section>
        )}

        {!hasResults && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t('noProductsFound')}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

// Top Pick - Large hero card
interface TopPickCardProps {
  product: RecommendedProduct;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  t: (key: TranslationKey) => string;
  getTagLabel: (tag: string) => string;
  getSolvesText: (product: RecommendedProduct) => string;
  getRecommendedBecauseText: (product: RecommendedProduct) => string;
}

const TopPickCard = ({ product, isFavorite, onToggleFavorite, t, getTagLabel, getSolvesText, getRecommendedBecauseText }: TopPickCardProps) => {
  const solvesText = getSolvesText(product);
  const recommendedBecause = getRecommendedBecauseText(product);

  return (
    <Link
      to={`/product/${product.id}`}
      className="block bg-gradient-to-br from-maseya-cream to-maseya-sage/20 rounded-2xl overflow-hidden shadow-warm transition-all hover:shadow-warm-lg border border-maseya-sage/30"
    >
      <div className="flex gap-4 p-4">
        {/* Product Image */}
        <div className="w-28 h-28 flex-shrink-0 bg-white rounded-xl overflow-hidden">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{product.brand}</p>
              <h3 className="font-display font-semibold text-foreground line-clamp-2">
                {product.name}
              </h3>
            </div>
            <button
              onClick={e => {
                e.preventDefault();
                onToggleFavorite();
              }}
              className="p-2 rounded-full bg-background/80 backdrop-blur-sm transition-all flex-shrink-0"
            >
              <Heart
                className={cn(
                  'w-5 h-5 transition-colors',
                  isFavorite ? 'fill-maseya-rose text-maseya-rose' : 'text-muted-foreground'
                )}
              />
            </button>
          </div>
          
          {/* Match Score */}
          <div className="flex items-center gap-2 mt-2">
            <div className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3" />
              {product.matchScore}% match
            </div>
            <span className="text-sm font-medium text-foreground">{product.price}</span>
          </div>
          
          {/* Recommended because - the key personalization message */}
          {recommendedBecause && (
            <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
              🎯 {recommendedBecause}
            </p>
          )}
          
          {/* Solves concern */}
          {solvesText && (
            <p className="text-sm text-primary mt-1 font-medium">
              ✨ {solvesText}
            </p>
          )}
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {product.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 bg-maseya-sage/40 text-foreground rounded-full"
              >
                {getTagLabel(tag)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

// Profile-based pick - Horizontal list card
interface ProfilePickCardProps {
  product: RecommendedProduct;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  t: (key: TranslationKey) => string;
  getTagLabel: (tag: string) => string;
  getSolvesText: (product: RecommendedProduct) => string;
  getRecommendedBecauseText: (product: RecommendedProduct) => string;
}

const ProfilePickCard = ({ product, isFavorite, onToggleFavorite, t, getTagLabel, getSolvesText, getRecommendedBecauseText }: ProfilePickCardProps) => {
  const solvesText = getSolvesText(product);
  const recommendedBecause = getRecommendedBecauseText(product);

  return (
    <Link
      to={`/product/${product.id}`}
      className="flex gap-3 bg-card rounded-xl p-3 shadow-warm transition-all hover:shadow-warm-lg border border-border"
    >
      {/* Product Image */}
      <div className="w-20 h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{product.brand}</p>
            <h3 className="font-medium text-sm text-foreground line-clamp-1">
              {product.name}
            </h3>
          </div>
          <button
            onClick={e => {
              e.preventDefault();
              onToggleFavorite();
            }}
            className="p-1.5 rounded-full bg-secondary transition-all flex-shrink-0"
          >
            <Heart
              className={cn(
                'w-4 h-4 transition-colors',
                isFavorite ? 'fill-maseya-rose text-maseya-rose' : 'text-muted-foreground'
              )}
            />
          </button>
        </div>
        
        {/* Recommended because */}
        {recommendedBecause && (
          <p className="text-[10px] text-muted-foreground mt-1 italic line-clamp-2">
            🎯 {recommendedBecause}
          </p>
        )}
        
        {/* Solves concern - the key selling point */}
        {solvesText && (
          <p className="text-xs text-primary mt-1 font-medium line-clamp-1">
            ✨ {solvesText}
          </p>
        )}
        
        {/* Price and match */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <Star className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">{product.matchScore}%</span>
          </div>
          <span className="text-sm font-semibold text-foreground">{product.price}</span>
        </div>
      </div>
    </Link>
  );
};

// Community popular - Grid card
interface CommunityCardProps {
  product: RecommendedProduct & { communityUsers?: number };
  isFavorite: boolean;
  onToggleFavorite: () => void;
  t: (key: TranslationKey) => string;
  getTagLabel: (tag: string) => string;
}

const CommunityCard = ({ product, isFavorite, onToggleFavorite, t, getTagLabel }: CommunityCardProps) => {
  return (
    <Link
      to={`/product/${product.id}`}
      className="bg-card rounded-2xl p-3 shadow-warm transition-all hover:shadow-warm-lg relative border border-border"
    >
      {/* Favorite Button */}
      <button
        onClick={e => {
          e.preventDefault();
          onToggleFavorite();
        }}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm transition-all z-10"
      >
        <Heart
          className={cn(
            'w-4 h-4 transition-colors',
            isFavorite ? 'fill-maseya-rose text-maseya-rose' : 'text-muted-foreground'
          )}
        />
      </button>

      {/* Product Image */}
      <div className="w-full aspect-square bg-white rounded-xl flex items-center justify-center overflow-hidden mb-2">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <p className="text-xs text-muted-foreground">{product.brand}</p>
      <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
        {product.name}
      </h3>

      {/* Community social proof */}
      <div className="flex items-center gap-1 text-xs text-maseya-rose mb-2">
        <Users className="w-3 h-3" />
        <span>{product.communityUsers || 200}+ {t('usersUsing')}</span>
      </div>

      {/* Price and tags */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{product.price}</span>
        {product.tags[0] && (
          <span className="text-[10px] px-2 py-0.5 bg-maseya-sage/30 text-foreground rounded-full">
            {getTagLabel(product.tags[0])}
          </span>
        )}
      </div>
    </Link>
  );
};

export default DiscoverPage;
