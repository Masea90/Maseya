import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { ProductData } from '@/lib/productLookup';
import { supabase } from '@/integrations/supabase/client';
import {
  flagIngredients,
  calculateScore,
  calculatePersonalScore,
  scoreLabel,
  loadOnboarding,
} from '@/lib/scoring';
import { hasHealthDataConsent } from '@/components/consent/ConsentModal';
import { guessCategoryTagsFromName, isFoodCategoryTag } from '@/lib/categoryGuess';


interface Props {
  current: ProductData;
  /** Baseline to beat. Pass the personal score when consent is on, else the general score. */
  currentScore: number;
}

interface Candidate {
  data: ProductData;
  score: number;
  label: ReturnType<typeof scoreLabel>;
  flagged: ReturnType<typeof flagIngredients>;
}

// v5: adds local catalog fallback so alternatives still render in private/incognito sessions.
const CACHE_PREFIX = 'maseya_alts_v5::';
const FETCH_TIMEOUT_MS = 8000;
// TODO: derive country from user locale/settings when we expand beyond Spain.
const COUNTRY_TAG = 'en:spain';


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

interface CatalogItem {
  barcode: string;
  product_name: string | null;
  brand: string | null;
  category: string | null;
  category_tag: string | null;
  ingredients_text: string | null;
  image_url: string | null;
  source: string | null;
}

const normalizeSource = (source: string | null): ProductData['source'] => {
  if (source === 'off' || source === 'obf' || source === 'photo' || source === 'maseya') return source;
  return 'maseya';
};

const normalizeCategory = (category: string | null): ProductData['category'] => {
  if (category === 'food' || category === 'cosmetic') return category;
  return 'unknown';
};

const toCatalogProductData = (item: CatalogItem): ProductData | null => {
  if (!item.barcode) return null;
  const raw: Record<string, unknown> = { ...item };
  if (item.category_tag) raw.categories_tags = [item.category_tag];
  return {
    barcode: item.barcode,
    source: normalizeSource(item.source),
    category: normalizeCategory(item.category),
    name: item.product_name || 'Producto',
    brand: item.brand || '',
    image: item.image_url || null,
    nutriscore_grade: null,
    ingredients_text: item.ingredients_text || null,
    ingredients_tags: [],
    labels_tags: [],
    ingredients_analysis_tags: [],
    allergens_tags: [],
    traces_tags: [],
    raw,
  };
};

const isCleanserLikeName = (name: string): boolean => {
  const n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return /\b(limpiador|limpiadora|limpieza|cleanser|cleansing|clean|tonico|micelar)\b/.test(n);
};

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

  // Cross-validate: if the product is cosmetic but the raw category is a
  // clearly-food tag (community mislabel — real case: OBF facial cleanser
  // tagged en:milks), discard it and rely on the name-based guess.
  let rawCategoryTag = eligible ? pickCategoryTag(current.raw) : null;
  if (rawCategoryTag && current.category === 'cosmetic' && isFoodCategoryTag(rawCategoryTag)) {
    rawCategoryTag = null;
  }
  const guessedCategoryTags = eligible
    ? guessCategoryTagsFromName(current.name, current.category as 'food' | 'cosmetic')
    : [];
  const hasAnyTag = !!rawCategoryTag || guessedCategoryTags.length > 0;
  // Stable dep key so the effect doesn't re-run on every render.
  const guessedTagsKey = guessedCategoryTags.join('|');

  useEffect(() => {
    if (!eligible) {
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

        const buildUrl = (tag: string, withCountry: boolean) =>
          `https://${host}/api/v2/search` +
          `?categories_tags=${encodeURIComponent(tag)}` +
          `&sort_by=unique_scans_n&page_size=24&fields=${fields}` +
          (withCountry ? `&countries_tags=${encodeURIComponent(COUNTRY_TAG)}` : '');

        // Build an ordered attempt list: for each candidate tag, try +ES then
        // global. Raw tag first (most authoritative), then each guessed tag
        // from most-specific to broadest (e.g. cleansing-milks → cleansers).
        const tagCandidates: string[] = [];
        const seenTags = new Set<string>();
        const pushTag = (t: string | null | undefined) => {
          if (!t || seenTags.has(t)) return;
          seenTags.add(t);
          tagCandidates.push(t);
        };
        pushTag(rawCategoryTag);
        for (const t of guessedCategoryTags) pushTag(t);

        const attempts: string[] = [];
        for (const tag of tagCandidates) {
          attempts.push(buildUrl(tag, true));
          attempts.push(buildUrl(tag, false));
        }

        let products: SearchItem[] = [];
        for (const url of attempts) {
          try {
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) continue;
            const json = (await res.json()) as { products?: SearchItem[] };
            if (json.products && json.products.length > 0) {
              products = json.products;
              break;
            }
          } catch (e) {
            if (controller.signal.aborted) throw e;
          }
        }

        const consent = hasHealthDataConsent();
        const profile = consent ? loadProfile() : null;

        const scored: Candidate[] = [];
        const seenCodes = new Set<string>([current.barcode]);
        const addCandidate = (pd: ProductData | null) => {
          if (!pd) return;
          if (!pd.barcode || seenCodes.has(pd.barcode)) return;
          if (!pd.ingredients_text && !pd.nutriscore_grade) return;
          seenCodes.add(pd.barcode);
          const flagged = flagIngredients(pd);
          const general = calculateScore(pd, flagged);
          const score = consent && profile
            ? calculatePersonalScore(pd, flagged, profile, general)
            : general;
          scored.push({ data: pd, score, label: scoreLabel(score), flagged });
        };

        for (const raw of products) {
          addCandidate(toProductData(raw, candidateSource, cat));
        }

        const tagSet = new Set(tagCandidates);
        const currentIsCleanserLike = isCleanserLikeName(current.name) || tagSet.has('en:cleansers') || tagSet.has('en:cleansing-milks');
        const { data: catalogRows, error: catalogError } = await supabase
          .from('maseya_products')
          .select('barcode, product_name, brand, category, category_tag, ingredients_text, image_url, source')
          .eq('category', cat)
          .neq('barcode', current.barcode)
          .not('ingredients_text', 'is', null)
          .order('scan_count', { ascending: false })
          .limit(80);

        if (catalogError) {
          console.warn('[alternatives] local catalog fallback failed', catalogError.message);
        } else {
          for (const row of (catalogRows || []) as CatalogItem[]) {
            const rowTags = [
              row.category_tag,
              ...guessCategoryTagsFromName(row.product_name || '', cat),
            ].filter((tag): tag is string => !!tag);
            const sharesTag = tagSet.size === 0 || rowTags.some(tag => tagSet.has(tag));
            const sameCleanserFamily = currentIsCleanserLike && isCleanserLikeName(row.product_name || '');
            if (!sharesTag && !sameCleanserFamily) continue;
            addCandidate(toCatalogProductData(row));
          }
        }

        scored.sort((a, b) => b.score - a.score);
        // Always show up to 3 top-scoring candidates from the same category,
        // even if none strictly beat the current score. The user asked to see
        // similar products regardless — the score badge already communicates
        // whether each option is better, similar, or worse.
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
  }, [current.barcode, current.source, current.category, current.name, rawCategoryTag, guessedTagsKey, currentScore, eligible]);

  if (!eligible) return null;


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
  const anyBetter = items.some(i => i.score > currentScore);
  const title = anyBetter
    ? (consent ? '💡 Alternativas mejores para ti' : '💡 Alternativas mejores')
    : '💡 Otras opciones similares';

  return (
    <div>
      <h3 className="font-display font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map(({ data, score, label, flagged }) => {
          // Top 3 ingredients to show as chips: prioritise problematic ones
          // (avoid/caution) so the user sees at-a-glance what's inside; if
          // everything is safe, show the first three safe INCI names instead.
          const chipIngredients = flagged.slice(0, 3);
          return (
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
                {chipIngredients.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {chipIngredients.map((ing, i) => {
                      const bg =
                        ing.level === 'avoid' ? 'hsl(var(--destructive) / 0.12)' :
                        ing.level === 'caution' ? 'hsl(45 93% 47% / 0.15)' :
                        'hsl(var(--muted))';
                      const color =
                        ing.level === 'avoid' ? 'hsl(var(--destructive))' :
                        ing.level === 'caution' ? 'hsl(35 80% 35%)' :
                        'hsl(var(--muted-foreground))';
                      return (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded-md font-medium truncate max-w-[110px]"
                          style={{ backgroundColor: bg, color }}
                        >
                          {ing.name}
                        </span>
                      );
                    })}
                  </div>
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
          );
        })}
      </div>
    </div>
  );
};
