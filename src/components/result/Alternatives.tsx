import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { ProductData } from '@/lib/productLookup';
import {
  flagIngredients,
  calculateScore,
  calculatePersonalScore,
  scoreLabel,
  loadOnboarding,
} from '@/lib/scoring';
import { hasHealthDataConsent } from '@/components/consent/ConsentModal';

interface Props {
  current: ProductData;
  /** Baseline to beat. Pass the personal score when consent is on, else the general score. */
  currentScore: number;
}

interface Candidate {
  data: ProductData;
  score: number;
  label: ReturnType<typeof scoreLabel>;
}

const CACHE_PREFIX = 'maseya_alts_v1::';
const FETCH_TIMEOUT_MS = 8000;

const hostForCategory = (category: 'food' | 'cosmetic') =>
  category === 'cosmetic' ? 'world.openbeautyfacts.org' : 'world.openfoodfacts.org';

// Best-effort guess for the source of a candidate returned by the search API.
const sourceForCategory = (category: 'food' | 'cosmetic'): ProductData['source'] =>
  category === 'cosmetic' ? 'obf' : 'off';

const pickCategoryTag = (raw: Record<string, unknown>): string | null => {
  const tags = (raw as { categories_tags?: string[] })?.categories_tags;
  if (!Array.isArray(tags) || tags.length === 0) return null;
  // Most specific category is typically the last one in OFF/OBF.
  return tags[tags.length - 1] || null;
};

interface SearchItem {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  image_front_url?: string;
  nutriscore_grade?: string;
  ingredients_text?: string;
  ingredients_tags?: string[];
  labels_tags?: string[];
  ingredients_analysis_tags?: string[];
  allergens_tags?: string[];
  traces_tags?: string[];
}

const toProductData = (
  item: SearchItem,
  source: ProductData['source'],
  category: 'food' | 'cosmetic',
): ProductData | null => {
  if (!item.code) return null;
  return {
    barcode: item.code,
    source,
    category,
    name: item.product_name_es || item.product_name || 'Producto',
    brand: item.brands || '',
    image: item.image_front_url || null,
    nutriscore_grade: item.nutriscore_grade || null,
    ingredients_text: item.ingredients_text || null,
    ingredients_tags: item.ingredients_tags || [],
    labels_tags: item.labels_tags || [],
    ingredients_analysis_tags: item.ingredients_analysis_tags || [],
    allergens_tags: item.allergens_tags || [],
    traces_tags: item.traces_tags || [],
    raw: item as unknown as Record<string, unknown>,
  };
};

const loadProfile = (): Record<string, unknown> | null => {
  try {
    const raw = localStorage.getItem('maseya_onboarding');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const Alternatives = ({ current, currentScore }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Candidate[] | null>(null);

  // Eligible when the product has any category (food/cosmetic) AND its raw
  // payload includes a categories_tags array — regardless of the source
  // (off/obf/maseya/photo). The search host is chosen by category, not source.
  const eligible = current.category === 'food' || current.category === 'cosmetic';
  const categoryTag = eligible ? pickCategoryTag(current.raw) : null;

  useEffect(() => {
    if (!eligible || !categoryTag) {
      setItems(null);
      return;
    }

    const cacheKey = `${CACHE_PREFIX}${current.barcode}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Candidate[];
        setItems(parsed);
        return;
      }
    } catch {}

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const cat = current.category as 'food' | 'cosmetic';
        const host = hostForCategory(cat);
        const candidateSource = sourceForCategory(cat);
        const fields = [
          'code', 'product_name', 'product_name_es', 'brands', 'image_front_url',
          'nutriscore_grade', 'ingredients_text', 'ingredients_tags',
          'labels_tags', 'ingredients_analysis_tags', 'allergens_tags', 'traces_tags',
        ].join(',');
        const url =
          `https://${host}/api/v2/search` +
          `?categories_tags=${encodeURIComponent(categoryTag)}` +
          `&sort_by=unique_scans_n&page_size=24&fields=${fields}`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const json = (await res.json()) as { products?: SearchItem[] };

        const consent = hasHealthDataConsent();
        const profile = consent ? loadProfile() : null;

        const scored: Candidate[] = [];
        for (const raw of json.products || []) {
          if (!raw.code || raw.code === current.barcode) continue;
          if (!raw.ingredients_text && !raw.nutriscore_grade) continue;
          const pd = toProductData(raw, candidateSource, cat);
          if (!pd) continue;
          const flagged = flagIngredients(pd);
          const general = calculateScore(pd, flagged);
          const score = consent && profile
            ? calculatePersonalScore(pd, flagged, profile, general)
            : general;
          if (score <= currentScore) continue;
          scored.push({ data: pd, score, label: scoreLabel(score) });
        }

        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, 3);

        if (cancelled) return;
        try { sessionStorage.setItem(cacheKey, JSON.stringify(top)); } catch {}
        setItems(top);
      } catch (e) {
        if (!cancelled) {
          console.warn('[alternatives] fetch failed', e);
          setItems([]);
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [current.barcode, current.source, current.category, categoryTag, currentScore, eligible]);

  if (!eligible || !categoryTag) return null;

  if (loading) {
    return (
      <div>
        <h3 className="font-display font-semibold mb-3">Alternativas mejores</h3>
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Buscando opciones…</span>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  const consent = hasHealthDataConsent();
  const title = consent ? '💡 Alternativas mejores para ti' : '💡 Alternativas mejores';

  return (
    <div>
      <h3 className="font-display font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map(({ data, score, label }) => (
          <button
            key={data.barcode}
            onClick={() => navigate(`/result/${data.barcode}`)}
            className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left hover:bg-muted/40 transition-colors"
          >
            {data.image ? (
              <img
                src={data.image}
                alt={data.name}
                className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                <span className="font-display font-bold text-primary text-lg">
                  {(data.name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight truncate">{data.name}</p>
              {data.brand && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{data.brand}</p>
              )}
            </div>
            <div
              className="w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0"
              style={{ backgroundColor: label.bg, color: label.color }}
              aria-label={`Puntuación ${score} sobre 100`}
            >
              <span className="text-sm font-bold leading-none">{score}</span>
              <span className="text-[8px] uppercase tracking-wider opacity-90 mt-0.5">/100</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
