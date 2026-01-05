import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const recentSearches = ['vitamin c', 'hyaluronic acid', 'rosemary oil'];

const categories = [
  { label: 'Skin Care', emoji: '✨', count: 234 },
  { label: 'Hair Care', emoji: '💇', count: 156 },
  { label: 'Natural Remedies', emoji: '🌿', count: 89 },
  { label: 'Nutrition', emoji: '🥗', count: 67 },
];

const trendingSearches = [
  'retinol', 'niacinamide', 'collagen', 'biotin', 'rice water', 'castor oil'
];

const SearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products, ingredients, tips..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              className="w-full h-12 pl-12 pr-4 rounded-2xl bg-card border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Recent</h2>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map(search => (
                <button
                  key={search}
                  onClick={() => setQuery(search)}
                  className="px-4 py-2 bg-secondary rounded-full text-sm text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Browse Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(cat => (
              <button
                key={cat.label}
                className="bg-card rounded-2xl p-4 text-left shadow-warm hover:shadow-warm-lg transition-all flex items-center gap-3"
              >
                <span className="text-2xl">{cat.emoji}</span>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.count} items</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Trending */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Trending Searches</h2>
          <div className="flex flex-wrap gap-2">
            {trendingSearches.map((search, i) => (
              <button
                key={search}
                onClick={() => setQuery(search)}
                className="px-4 py-2 bg-zwina-gold/10 border border-zwina-gold/30 rounded-full text-sm text-foreground hover:bg-zwina-gold/20 transition-colors flex items-center gap-2"
              >
                <span className="text-xs text-zwina-gold font-medium">#{i + 1}</span>
                {search}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
