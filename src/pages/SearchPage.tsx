import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X, Clock, TrendingUp, Package, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { productCatalog } from '@/lib/recommendations';
import { remedies } from '@/lib/remedies';

const RECENT_KEY = 'maseya_recent_searches';
const MAX_RECENT = 8;

const loadRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};
const saveRecent = (list: string[]) => localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));

const SearchPage = () => {
  const navigate = useNavigate();
  const { t } = useUser();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecent);

  const addRecent = (term: string) => {
    const trimmed = term.trim().toLowerCase();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    saveRecent(updated);
  };

  const clearRecent = () => { setRecentSearches([]); saveRecent([]); };

  const q = query.trim().toLowerCase();

  const productResults = useMemo(() => {
    if (!q) return [];
    return productCatalog.filter(p =>
      p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) ||
      p.tags.some(tag => tag.includes(q)) || p.targetConcerns.some(c => c.includes(q))
    );
  }, [q]);

  const remedyResults = useMemo(() => {
    if (!q) return [];
    return remedies.filter(r => {
      const title = t(r.titleKey).toLowerCase();
      const desc = t(r.descriptionKey).toLowerCase();
      const cat = r.category.toLowerCase();
      return title.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [q, t]);

  const hasResults = productResults.length > 0 || remedyResults.length > 0;
  const isSearching = q.length > 0;

  const handleSelect = (term: string) => { setQuery(term); addRecent(term); };

  const trendingTerms = ['niacinamide', 'rosemary', 'collagen', 'turmeric', 'avocado', 'rice water'];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && q) addRecent(q); }}
              autoFocus
              className="w-full h-12 pl-12 pr-10 rounded-2xl bg-card border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full sm:max-w-lg sm:mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {!isSearching ? (
          <>
            {recentSearches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /> {t('recentSearches')}</h2>
                  <button onClick={clearRecent} className="text-xs text-primary hover:underline">{t('clearRecent')}</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map(s => (
                    <button key={s} onClick={() => handleSelect(s)} className="px-4 py-2 bg-secondary rounded-full text-sm text-secondary-foreground hover:bg-secondary/80 transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> {t('trendingSearches')}</h2>
              <div className="flex flex-wrap gap-2">
                {trendingTerms.map((s, i) => (
                  <button key={s} onClick={() => handleSelect(s)} className="px-4 py-2 bg-primary/5 border border-primary/20 rounded-full text-sm text-foreground hover:bg-primary/10 transition-colors flex items-center gap-2">
                    <span className="text-xs text-primary font-medium">#{i + 1}</span>{s}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : !hasResults ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-foreground">{t('searchNoResults')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('searchNoResultsDesc')}</p>
          </div>
        ) : (
          <>
            {productResults.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-base font-semibold flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> {t('searchTabProducts')} ({productResults.length})</h2>
                <div className="space-y-2">
                  {productResults.map(p => (
                    <button key={p.id} onClick={() => { addRecent(q); navigate(`/product/${p.id}`); }} className="w-full flex items-center gap-3 p-3 bg-card rounded-xl shadow-warm hover:shadow-warm-lg transition-all text-left">
                      <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.brand}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {remedyResults.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-base font-semibold flex items-center gap-2"><Leaf className="w-4 h-4 text-primary" /> {t('searchTabRemedies')} ({remedyResults.length})</h2>
                <div className="space-y-2">
                  {remedyResults.map(r => (
                    <button key={r.id} onClick={() => { addRecent(q); navigate(`/remedy/${r.id}`); }} className="w-full flex items-center gap-3 p-3 bg-card rounded-xl shadow-warm hover:shadow-warm-lg transition-all text-left">
                      <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center text-2xl">{r.image}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t(r.titleKey)}</p>
                        <p className="text-xs text-muted-foreground">{t(r.timeKey)} • {r.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
