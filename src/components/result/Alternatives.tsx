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
  score: number;
}

export const Alternatives = ({ current, currentScore }: Props) => {
  const premium = usePremium();
  const navigate = useNavigate();
  const [alts, setAlts] = useState<Alt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!premium) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('maseya_products')
        .select('barcode, product_name, brand, category, ingredients_text, image_url')
        .eq('category', current.category)
        .neq('barcode', current.barcode)
        .limit(20);
      if (cancelled) return;
      if (error || !data) { setLoading(false); return; }
      const scored: Alt[] = data
        .map((p: any) => {
          const pseudo: ProductData = {
            barcode: p.barcode,
            source: 'maseya',
            name: p.product_name,
            brand: p.brand || '',
            image: p.image_url ?? null,
            category: (p.category === 'food' ? 'food' : 'cosmetic'),
            nutriscore_grade: null,
            ingredients_text: p.ingredients_text || null,
            ingredients_tags: [],
            labels_tags: [],
            ingredients_analysis_tags: [],
            raw: p,
          };
          const flagged = flagIngredients(pseudo);
          const score = calculateScore(pseudo, flagged);
          return { barcode: p.barcode, product_name: p.product_name, brand: p.brand, score };
        })
        .filter(a => a.score >= currentScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      setAlts(scored);
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
                className="aspect-[3/4] rounded-2xl bg-card border border-border p-2 flex flex-col gap-1 text-left hover:border-primary/50 transition-colors"
              >
                <div
                  className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: sl.bg, color: sl.color }}
                >
                  {a.score}
                </div>
                <p className="text-[11px] font-semibold leading-tight line-clamp-2 mt-1">{a.product_name}</p>
                {a.brand && <p className="text-[10px] text-muted-foreground line-clamp-1">{a.brand}</p>}
                <span className="mt-auto text-[10px] text-primary font-medium">Ver análisis →</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
