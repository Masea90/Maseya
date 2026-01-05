import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Search, Heart, Filter, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const mockProducts = [
  {
    id: 1,
    name: 'Gentle Hydrating Cleanser',
    brand: 'CeraVe',
    match: 94,
    image: '🧴',
    tags: ['Fragrance-free', 'Dermatologist approved'],
    reason: 'Great for dry, sensitive skin',
    category: 'Skin',
  },
  {
    id: 2,
    name: 'Rosemary Scalp Oil',
    brand: 'Mielle',
    match: 91,
    image: '🌿',
    tags: ['Natural', 'Stimulating'],
    reason: 'Promotes hair growth',
    category: 'Hair',
  },
  {
    id: 3,
    name: 'Hyaluronic Acid Serum',
    brand: 'The Ordinary',
    match: 89,
    image: '💧',
    tags: ['Vegan', 'Hydrating'],
    reason: 'Intense hydration for dehydrated skin',
    category: 'Hydration',
  },
  {
    id: 4,
    name: 'Squalane Oil',
    brand: 'Biossance',
    match: 87,
    image: '✨',
    tags: ['Clean', 'Non-comedogenic'],
    reason: 'Lightweight moisture for all skin types',
    category: 'Sensitive',
  },
  {
    id: 5,
    name: 'Rice Water Hair Rinse',
    brand: 'Kitsch',
    match: 85,
    image: '🍚',
    tags: ['Traditional', 'Strengthening'],
    reason: 'Ancient remedy for shiny hair',
    category: 'Hair',
  },
  {
    id: 6,
    name: 'Niacinamide 10%',
    brand: 'The Inkey List',
    match: 83,
    image: '🔬',
    tags: ['Pore-minimizing', 'Oil-control'],
    reason: 'Reduces appearance of pores',
    category: 'Skin',
  },
];

const DiscoverPage = () => {
  const { t } = useUser();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);

  const categories = [
    { key: 'All', label: t('all') },
    { key: 'Skin', label: t('skinCategory') },
    { key: 'Hair', label: t('hairCategory') },
    { key: 'Sensitive', label: t('sensitivity') },
    { key: 'Hydration', label: t('hydrationFocus') },
  ];

  const filteredProducts = mockProducts.filter(product => {
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <AppLayout title={t('discover')}>
      <div className="px-4 py-6 space-y-4 animate-fade-in">
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
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="bg-card rounded-2xl p-4 shadow-warm transition-all hover:shadow-warm-lg relative group"
            >
              {/* Match Badge */}
              <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                {product.match}%
              </div>

              {/* Favorite Button */}
              <button
                onClick={e => {
                  e.preventDefault();
                  toggleFavorite(product.id);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 backdrop-blur-sm transition-all"
              >
                <Heart
                  className={cn(
                    'w-4 h-4 transition-colors',
                    favorites.includes(product.id)
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
              <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-2">
                {product.name}
              </h3>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {product.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 bg-maseya-sage/30 text-foreground rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default DiscoverPage;
