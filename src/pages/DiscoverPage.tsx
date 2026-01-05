import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Search, Heart, Filter, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { getRecommendations, tagTranslations, RecommendedProduct } from '@/lib/recommendations';
import { TranslationKey } from '@/lib/i18n';

const DiscoverPage = () => {
  const { t, user } = useUser();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);

  // Get personalized recommendations
  const recommendations = getRecommendations(user, 8);

  const categories = [
    { key: 'All', label: t('all') },
    { key: 'skin', label: t('skinCategory') },
    { key: 'hair', label: t('hairCategory') },
  ];

  const filteredProducts = recommendations.filter(product => {
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory || product.category === 'both';
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const getTagLabel = (tag: string): string => {
    const translationKey = tagTranslations[tag];
    return translationKey ? t(translationKey) : tag;
  };

  return (
    <AppLayout title={t('discover')}>
      <div className="px-4 py-6 space-y-5 animate-fade-in">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-12 rounded-2xl bg-card border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-secondary">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Personalized Header */}
        <div className="bg-gradient-to-r from-maseya-sage/20 to-maseya-cream/40 rounded-2xl p-4 border border-maseya-sage/30">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t('recommendedForYou')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('basedOnProfile')}
          </p>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                activeCategory === cat.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id}
              product={product}
              isFavorite={favorites.includes(product.id)}
              onToggleFavorite={() => toggleFavorite(product.id)}
              t={t}
              getTagLabel={getTagLabel}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('searchPlaceholder')}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

interface ProductCardProps {
  product: RecommendedProduct;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  t: (key: TranslationKey) => string;
  getTagLabel: (tag: string) => string;
}

const ProductCard = ({ product, isFavorite, onToggleFavorite, t, getTagLabel }: ProductCardProps) => {
  // Get the first match reason as the card subtitle
  const mainReason = product.matchReasons[0] ? t(product.matchReasons[0]) : '';

  return (
    <Link
      to={`/product/${product.id}`}
      className="bg-card rounded-2xl p-4 shadow-warm transition-all hover:shadow-warm-lg relative group"
    >
      {/* Match Badge */}
      <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
        <Star className="w-3 h-3" />
        {product.matchScore}%
      </div>

      {/* Favorite Button */}
      <button
        onClick={e => {
          e.preventDefault();
          onToggleFavorite();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 backdrop-blur-sm transition-all"
      >
        <Heart
          className={cn(
            'w-4 h-4 transition-colors',
            isFavorite
              ? 'fill-maseya-rose text-maseya-rose'
              : 'text-muted-foreground'
          )}
        />
      </button>

      {/* Image */}
      <div className="w-full aspect-square bg-secondary rounded-xl flex items-center justify-center text-4xl mb-3">
        {product.image}
      </div>

      {/* Info */}
      <p className="text-xs text-muted-foreground">{product.brand}</p>
      <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
        {product.name}
      </h3>

      {/* Match Reason */}
      {mainReason && (
        <p className="text-xs text-primary mb-2 line-clamp-1">
          ✨ {mainReason}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {product.tags.slice(0, 2).map(tag => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 bg-maseya-sage/30 text-foreground rounded-full"
          >
            {getTagLabel(tag)}
          </span>
        ))}
      </div>
    </Link>
  );
};

export default DiscoverPage;
