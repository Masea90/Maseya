import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/lib/premium';
import { supabase } from '@/integrations/supabase/client';
import { flagIngredients, calculateScore, scoreLabel } from '@/lib/scoring';
import type { ProductData } from '@/lib/productLookup';

interface Props {
  current: ProductData;
  currentScore: number;
}

interface Alt {
  barcode: string;
  product_name: string;
  brand: string | null;
  image: string | null;
  score: number;
}

const buildPseudo = (
  barcode: string,
  name: string,
  brand: string | null,
  category: 'food' | 'cosmetic',
  image: string | null,
  ingredients_text: string | null,
  nutriscore_grade: string | null,
  raw: Record<string, unknown>
): ProductData => ({
  barcode,
  source: 'maseya',
  name,
  brand: brand || '',
  image,
  category,
  nutriscore_grade,
  ingredients_text,
  ingredients_tags: [],
  labels_tags: [],
  ingredients_analysis_tags: [],
  raw,
});

const pickSpecificCategoryTag = (raw: Record<string, unknown> | undefined): string | null => {
  if (!raw) return null;
  const tags = (raw as any).categories_tags;
  if (!Array.isArray(tags) || tags.length === 0) return null;
  // Most specific tag is typically the last one. Prefer en: prefix.
  const enTags = tags.filter((t: unknown): t is string => typeof t === 'string' && t.startsWith('en:'));
  const pool = enTags.length > 0 ? enTags : tags.filter((t: unknown): t is string => typeof t === 'string');
  if (pool.length === 0) return null;
  return pool[pool.length - 1];
};

const fetchOpenFactsAlternatives = async (
  category: 'food' | 'cosmetic',
  excludeBarcode: string,
  specificTag?: string | null
): Promise<Alt[]> => {
  const host = category === 'food' ? 'world.openfoodfacts.org' : 'world.openbeautyfacts.org';
  const tag = specificTag || (category === 'food' ? 'food' : 'cosmetics');
  const url = `https://${host}/cgi/search.pl?action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(tag)}&sort_by=unique_scans_n&json=true&page_size=20&fields=code,product_name,brands,image_front_url,nutriscore_grade,ingredients_text`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = await res.json();
    const items: any[] = Array.isArray(j?.products) ? j.products : [];
    return items
      .filter(p => p.code && String(p.code) !== excludeBarcode && (p.product_name || '').trim())
      .map(p => {
        const pseudo = buildPseudo(
          p.code,
          p.product_name,
          p.brands || null,
          category,
          p.image_front_url || null,
          p.ingredients_text || null,
          p.nutriscore_grade || null,
          p
        );
        const flagged = flagIngredients(pseudo);
        const score = calculateScore(pseudo, flagged);
        return {
          barcode: p.code as string,
          product_name: p.product_name as string,
          brand: (p.brands as string) || null,
          image: (p.image_front_url as string) || null,
          score,
        };
      });
  } catch {
    return [];
  }
};

export const Alternatives = ({ current, currentScore }: Props) => {
  const premium = usePremium();
  const navigate = useNavigate();
  const [alts, setAlts] = useState<Alt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!premium) { setLoading(false); return; }
    if (current.category !== 'food' && current.category !== 'cosmetic') {
      setLoading(false);
      return;
    }
    const cat = current.category;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('maseya_products')
        .select('barcode, product_name, brand, category, ingredients_text, image_url')
        .eq('category', cat)
        .neq('barcode', current.barcode)
        .limit(20);

      const fromMaseya: Alt[] = (data ?? []).map((p: any) => {
        const pseudo = buildPseudo(
          p.barcode,
          p.product_name,
          p.brand,
          cat,
          p.image_url ?? null,
          p.ingredients_text || null,
          null,
          p
        );
        const flagged = flagIngredients(pseudo);
        const score = calculateScore(pseudo, flagged);
        return {
          barcode: p.barcode,
          product_name: p.product_name,
          brand: p.brand,
          image: p.image_url ?? null,
          score,
        };
      });

      let combined = fromMaseya;
      if (fromMaseya.filter(a => a.score >= currentScore).length < 3) {
        const specificTag = pickSpecificCategoryTag(current.raw);
        let fromOFF = await fetchOpenFactsAlternatives(cat, current.barcode, specificTag);
        if (fromOFF.length < 3 && specificTag) {
          // Fallback to broad category search
          const broad = await fetchOpenFactsAlternatives(cat, current.barcode, null);
          fromOFF = [...fromOFF, ...broad];
        }
        combined = [...fromMaseya, ...fromOFF];
      }
      if (cancelled) return;

      const sorted = combined
        .filter(a => a.score >= currentScore)
        .sort((a, b) => b.score - a.score);

      // Dedupe by normalized product_name — keep highest score
      const seen = new Set<string>();
      const deduped: Alt[] = [];
      for (const a of sorted) {
        const key = (a.product_name || '').trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(a);
        if (deduped.length === 3) break;
      }
      setAlts(deduped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [premium, current.barcode, current.category, currentScore]);

  if (!premium) {
    return (
      <div>
        <h3 className="font-display font-semibold mb-3">Mejores opciones para ti</h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="aspect-[3/4] rounded-2xl bg-muted/60 border border-border flex flex-col items-center justify-center gap-2 p-2 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 backdrop-blur-sm" />
              <Lock className="w-5 h-5 text-muted-foreground relative z-10" />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mb-2">
          Desbloquea alternativas con Premium
        </p>
        <Button onClick={() => navigate('/premium')} variant="outline" className="w-full rounded-xl">
          Ver Premium
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-display font-semibold mb-3">Mejores opciones para ti</h3>
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : alts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hemos encontrado alternativas mejores aún.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {alts.map(a => {
            const sl = scoreLabel(a.score);
            return (
              <button
                key={a.barcode}
                onClick={() => navigate(`/result/${encodeURIComponent(a.barcode)}`)}
                className="aspect-[3/4] rounded-2xl bg-card border border-border p-2 flex flex-col gap-1 text-left hover:border-primary/50 transition-colors overflow-hidden"
              >
                <div className="flex items-start justify-between gap-1">
                  <div
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: sl.bg, color: sl.color }}
                  >
                    {a.score}
                  </div>
                </div>
                {a.image ? (
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={a.image} alt={a.product_name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="font-display font-bold text-primary/60 text-lg">
                      {(a.product_name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <p className="text-[11px] font-semibold leading-tight line-clamp-2">{a.product_name}</p>
                {a.brand && <p className="text-[10px] text-muted-foreground line-clamp-1">{a.brand}</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
