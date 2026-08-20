import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
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
import { guessCategoryTagsFromName, isFoodCategoryTag, isBroadCategoryTag } from '@/lib/categoryGuess';


interface Props {
  current: ProductData;
  /** Baseline to beat. Pass the personal score when consent is on, else the general score. */
  currentScore: number;
  /** Normalized profile (buildActiveProfile) so cards show the PERSONAL score. */
  profile?: Record<string, unknown> | null;
  /** Health-data consent — when true the card score is the personal one. */
  consent?: boolean;
}

interface Candidate {
  data: ProductData;
  score: number;
  label: ReturnType<typeof scoreLabel>;
  flagged: ReturnType<typeof flagIngredients>;
}

// v12: card score parity with the product page (full fields + per-finalist
// refetch) and strict category/family filtering on EVERY candidate route.
const CACHE_PREFIX = 'maseya_alts_v13::';
const FETCH_TIMEOUT_MS = 8000;
const MIN_SCORE = 50;
// TODO: derive country from user locale/settings when we expand beyond Spain.
const COUNTRY_TAG = 'en:spain';

// Categories that are NEVER a valid alternative for food or cosmetics
// (OBF also hosts household cleaning products — real case: dishwasher tablets
// surfacing as an alternative to a cleansing milk).
const HOUSEHOLD_TAG_HINTS = [
  'dishwash', 'detergent', 'cleaning', 'cleaner', 'laundry', 'household',
  'bleach', 'descaler', 'fabric-softener', 'washing-up', 'washing-machine',
  'air-freshener', 'insecticide', 'pet-', 'stain-remover',
];
const HOUSEHOLD_NAME_HINTS = [
  'lavavajillas', 'loica', 'loiça', 'detergente', 'limpiahogar', 'quitagrasas',
  'lejia', 'suavizante', 'friegasuelos', 'limpiacristales', 'antical',
  'dishwasher', 'laundry', 'detergent', 'fabric softener', 'bleach',
];
// Cosmetic-ish tags that must never appear as a FOOD alternative.
const COSMETIC_TAG_HINTS = [
  'shampoo', 'cosmetic', 'deodorant', 'toothpaste', 'sunscreen', 'sun-care',
  'shower-gel', 'soap', 'cream', 'lotion', 'cleanser', 'perfume', 'makeup',
  'hair-care', 'skin-care',
];

const normTxt = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// --- Semantic incompatibility ----------------------------------------------
// Two products can share a parent category (en:sauces) and still be absurd
// substitutes (mayonnaise vs ketchup). Within a known family, a candidate is
// only valid if it belongs to the SAME subgroup as the scanned product.
interface SubGroup {
  id: string;
  family: 'sauces' | 'dairy' | 'drinks' | 'cosmetic';
  tags: string[];      // exact OFF/OBF category tags
  names: string[];     // normalized name hints
}

const SUBGROUPS: SubGroup[] = [
  // Sauces & condiments
  { id: 'mayo', family: 'sauces', tags: ['en:mayonnaises', 'en:mayonnaise', 'en:light-mayonnaises'], names: ['mayonesa', 'mayonnaise', 'ligeresa'] },
  { id: 'ketchup', family: 'sauces', tags: ['en:ketchup', 'en:ketchups', 'en:tomato-ketchup'], names: ['ketchup', 'catsup'] },
  { id: 'mustard', family: 'sauces', tags: ['en:mustards', 'en:mustard'], names: ['mostaza', 'mustard', 'moutarde'] },
  { id: 'tomato-sauce', family: 'sauces', tags: ['en:tomato-sauces', 'en:tomato-pastes', 'en:pasta-sauces'], names: ['tomate frito', 'salsa de tomate', 'tomato sauce', 'sofrito'] },
  { id: 'hot-sauce', family: 'sauces', tags: ['en:hot-sauces', 'en:chili-sauces'], names: ['salsa picante', 'hot sauce', 'sriracha', 'tabasco'] },
  // Dairy
  { id: 'yogurt', family: 'dairy', tags: ['en:yogurts', 'en:yoghurts', 'en:plain-yogurts', 'en:fermented-milk-products'], names: ['yogur', 'yoghurt', 'yogurt', 'skyr', 'kefir'] },
  { id: 'cheese', family: 'dairy', tags: ['en:cheeses', 'en:fresh-cheeses', 'en:processed-cheese'], names: ['queso', 'cheese', 'fromage'] },
  { id: 'milk', family: 'dairy', tags: ['en:milks', 'en:semi-skimmed-milks', 'en:whole-milks', 'en:skimmed-milks', 'en:plant-based-milk-alternatives'], names: ['leche', 'milk', 'bebida de avena', 'bebida de soja', 'bebida de almendra'] },
  // Drinks
  { id: 'water', family: 'drinks', tags: ['en:waters', 'en:mineral-waters', 'en:spring-waters', 'en:natural-mineral-waters'], names: ['agua', 'water'] },
  { id: 'soda', family: 'drinks', tags: ['en:sodas', 'en:carbonated-drinks', 'en:colas', 'en:soft-drinks'], names: ['refresco', 'cola', 'soda', 'gaseosa'] },
  { id: 'juice', family: 'drinks', tags: ['en:fruit-juices', 'en:juices', 'en:nectars', 'en:fruit-nectars'], names: ['zumo', 'jugo', 'juice', 'nectar'] },
  { id: 'energy', family: 'drinks', tags: ['en:energy-drinks'], names: ['energy', 'energetica', 'energetico'] },
  // Cosmetics
  { id: 'shampoo', family: 'cosmetic', tags: ['en:shampoos', 'en:shampoo'], names: ['champu', 'shampoo', 'shampooing'] },
  { id: 'conditioner', family: 'cosmetic', tags: ['en:hair-conditioners', 'en:conditioners', 'en:hair-masks'], names: ['acondicionador', 'conditioner', 'mascarilla capilar'] },
  { id: 'shower', family: 'cosmetic', tags: ['en:shower-gels', 'en:body-washes', 'en:soaps'], names: ['gel de ducha', 'shower gel', 'jabon'] },
  { id: 'sunscreen', family: 'cosmetic', tags: ['en:sunscreens', 'en:sun-care', 'en:sun-protection'], names: ['protector solar', 'proteccion solar', 'sunscreen', 'spf', 'solar'] },
  { id: 'face-cream', family: 'cosmetic', tags: ['en:face-creams', 'en:moisturizers', 'en:face-moisturizers', 'en:day-creams', 'en:night-creams'], names: ['crema facial', 'hidratante facial', 'face cream', 'moisturizer'] },
  { id: 'toner', family: 'cosmetic', tags: ['en:toners', 'en:face-toners', 'en:lotions-toniques'], names: ['tonico', 'toner'] },
];

const subgroupOf = (cats: string[], name: string): SubGroup | null => {
  const tagSet = new Set(cats.map(t => t.toLowerCase()));
  for (const g of SUBGROUPS) {
    if (g.tags.some(t => tagSet.has(t))) return g;
  }
  const n = normTxt(name || '');
  for (const g of SUBGROUPS) {
    if (g.names.some(h => n.includes(h))) return g;
  }
  return null;
};



const hostForCategory = (category: 'food' | 'cosmetic') =>
  category === 'cosmetic' ? 'world.openbeautyfacts.org' : 'world.openfoodfacts.org';

// Best-effort guess for the source of a candidate returned by the search API.
const sourceForCategory = (category: 'food' | 'cosmetic'): ProductData['source'] =>
  category === 'cosmetic' ? 'obf' : 'off';

// Returns the full category hierarchy from OFF/OBF, ordered most-specific → broadest.
// This lets us try the tightest match first (e.g. "cocoa-powders") and progressively
// broaden (e.g. "cocoas" → "sweet-snacks") until we find enough alternatives.
const pickCategoryTags = (raw: Record<string, unknown>): string[] => {
  const tags = (raw as { categories_tags?: string[] })?.categories_tags;
  if (!Array.isArray(tags) || tags.length === 0) return [];
  // OFF orders from most-general to most-specific; reverse so specific is first.
  return [...tags].reverse().filter((t): t is string => typeof t === 'string' && t.length > 0);
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
  countries_tags?: string[];
  categories_tags?: string[];
  additives_tags?: string[];
  nova_group?: number;
  nutriments?: Record<string, number>;
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

/**
 * Rejects a candidate that can never be a sensible alternative:
 * household/cleaning products, the wrong family (food vs cosmetic) and
 * anything whose own category doesn't match what we searched for.
 * Applied to EVERY route (OFF search, OBF search, local catalog).
 */
const isDisallowedCandidate = (
  pd: ProductData,
  cat: 'food' | 'cosmetic',
  tagSet: Set<string>,
  currentGroup?: SubGroup | null,
): boolean => {
  const cats = (Array.isArray((pd.raw as { categories_tags?: unknown }).categories_tags)
    ? ((pd.raw as { categories_tags?: string[] }).categories_tags as string[])
    : []
  ).filter((t): t is string => typeof t === 'string').map(t => t.toLowerCase());
  const name = normTxt(pd.name || '');

  // 1. Household / cleaning products are never an alternative.
  if (cats.some(t => HOUSEHOLD_TAG_HINTS.some(h => t.includes(h)))) return true;
  if (HOUSEHOLD_NAME_HINTS.some(h => name.includes(h))) return true;

  // 2. Family mismatch (food vs cosmetic).
  if (cat === 'cosmetic' && cats.some(isFoodCategoryTag)) return true;
  if (cat === 'food' && cats.some(t => COSMETIC_TAG_HINTS.some(h => t.includes(h)))) return true;

  // 3. Strict category: the candidate must declare a category and it must be
  //    one of the tags we searched. No category → out (never guess for candidates).
  if (cats.length === 0) return true;
  if (!cats.some(t => tagSet.has(t))) return true;

  // 4. Name conflict: if the candidate's own name maps to a different specific
  //    category (real case: "Protector solar" offered as shampoo alternative).
  const guessed = guessCategoryTagsFromName(pd.name || '', cat);
  if (guessed.length > 0 && !guessed.some(t => tagSet.has(t))) return true;

  // 5. Semantic incompatibility: same parent category is not enough
  //    (mayonesa vs kétchup). Only applied when the scanned product belongs
  //    to a known subgroup; otherwise the previous strict behaviour stands.
  if (currentGroup) {
    const candidateGroup = subgroupOf(cats, pd.name || '');
    if (!candidateGroup || candidateGroup.id !== currentGroup.id) return true;
  }

  return false;
};

export const Alternatives = ({ current, currentScore, profile: profileProp, consent: consentProp }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Candidate[] | null>(null);

  // Eligible when the product has any category (food/cosmetic) AND its raw
  // payload includes a categories_tags array — regardless of the source
  // (off/obf/maseya/photo). The search host is chosen by category, not source.
  const eligible = current.category === 'food' || current.category === 'cosmetic';

  // Cross-validate: if the product is cosmetic but a raw tag is clearly food
  // (community mislabel — real case: OBF facial cleanser tagged en:milks),
  // drop those food tags and rely on the name-based guess for that ambiguity.
  const rawCategoryTags = eligible
    ? pickCategoryTags(current.raw).filter(
        (t) =>
          !isBroadCategoryTag(t) &&
          !(current.category === 'cosmetic' && isFoodCategoryTag(t))
      )
    : [];
  const guessedCategoryTags = eligible
    ? guessCategoryTagsFromName(current.name, current.category as 'food' | 'cosmetic')
    : [];
  const hasAnyTag = rawCategoryTags.length > 0 || guessedCategoryTags.length > 0;
  // Stable dep keys so the effect doesn't re-run on every render.
  const rawTagsKey = rawCategoryTags.join('|');
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
          'countries_tags', 'categories_tags', 'additives_tags', 'nova_group',
          'nutriments',
        ].join(',');

        // Strict Spain filter — we intentionally do NOT fall back to a
        // no-country query, otherwise we surface products not sold in Spain
        // (previous bug: French/Moroccan waters appearing as alternatives).
        const buildUrl = (tag: string) =>
          `https://${host}/api/v2/search` +
          `?categories_tags=${encodeURIComponent(tag)}` +
          `&countries_tags=${encodeURIComponent(COUNTRY_TAG)}` +
          `&sort_by=unique_scans_n&page_size=24&fields=${fields}`;

        const tagCandidates: string[] = [];
        const seenTags = new Set<string>();
        const pushTag = (t: string | null | undefined) => {
          if (!t || seenTags.has(t)) return;
          if (isBroadCategoryTag(t)) return;
          seenTags.add(t);
          tagCandidates.push(t);
        };
        for (const t of rawCategoryTags) pushTag(t);
        for (const t of guessedCategoryTags) pushTag(t);

        // Triple guardrail (a): if no specific tag survives the blocklist, we
        // have no way to find similar products. Bail out — better nothing
        // than surfacing a toothpaste as an alternative to intimate wash.
        if (tagCandidates.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }

        const attempts: string[] = tagCandidates.map(buildUrl);

        let products: SearchItem[] = [];
        for (const url of attempts) {
          try {
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) continue;
            const json = (await res.json()) as { products?: SearchItem[] };
            // Strict client-side safety net: candidate MUST declare
            // countries_tags AND include en:spain. Previously we accepted
            // products without countries_tags, which let non-Spanish items
            // through (e.g. Argentine "La Serenísima").
            const spanish = (json.products || []).filter(
              p => Array.isArray(p.countries_tags) && p.countries_tags.includes(COUNTRY_TAG)
            );
            if (spanish.length > 0) {
              products = spanish;
              break;
            }
          } catch (e) {
            if (controller.signal.aborted) throw e;
          }
        }

        const consent = consentProp ?? hasHealthDataConsent();
        const profile = consent ? (profileProp ?? loadProfile()) : null;
        const tagSet = new Set(tagCandidates);
        const currentGroup = subgroupOf(
          (Array.isArray((current.raw as { categories_tags?: unknown }).categories_tags)
            ? ((current.raw as { categories_tags?: string[] }).categories_tags as string[])
            : []).map(t => String(t).toLowerCase()),
          current.name,
        );

        const scoreOf = (pd: ProductData, fl: ReturnType<typeof flagIngredients>) => {
          const general = calculateScore(pd, fl);
          return consent && profile
            ? calculatePersonalScore(pd, fl, profile, general)
            : general;
        };

        const scored: Candidate[] = [];
        const seenCodes = new Set<string>([current.barcode]);
        const addCandidate = (pd: ProductData | null) => {
          if (!pd) return;
          if (!pd.barcode || seenCodes.has(pd.barcode)) return;
          if (isDisallowedCandidate(pd, cat, tagSet, currentGroup)) return;
          // Data floor per candidate: food needs a nutriscore, cosmetic needs
          // at least 3 parseable ingredients. Prevents empty "shell" entries
          // from scoring 100 and drowning real products.
          const candidateFlagged = flagIngredients(pd);
          if (pd.category === 'food') {
            if (!pd.nutriscore_grade) return;
          } else if (pd.category === 'cosmetic') {
            if (candidateFlagged.length < 3) return;
          } else {
            if (!pd.ingredients_text && !pd.nutriscore_grade) return;
          }
          seenCodes.add(pd.barcode);
          const score = scoreOf(pd, candidateFlagged);
          scored.push({ data: pd, score, label: scoreLabel(score), flagged: candidateFlagged });
        };

        for (const raw of products) {
          addCandidate(toProductData(raw, candidateSource, cat));
        }

        const { data: catalogRows, error: catalogError } = await supabase
          .from('maseya_products')
          .select('barcode, product_name, brand, category, category_tag, ingredients_text, image_url, source')
          .eq('category', cat)
          .neq('barcode', current.barcode)
          .not('barcode', 'like', 'photo\\_%')
          .not('category_tag', 'is', null)
          .neq('category_tag', '')
          .not('ingredients_text', 'is', null)
          .order('scan_count', { ascending: false })
          .limit(80);

        if (catalogError) {
          console.warn('[alternatives] local catalog fallback failed', catalogError.message);
        } else {
          for (const row of (catalogRows || []) as CatalogItem[]) {
            // Strict category match: the candidate's own category_tag must be
            // one of the tags we're searching for. Never guess by name for
            // candidates — that's how a cleanser ended up as a toner alt.
            if (!row.category_tag || !tagSet.has(row.category_tag)) continue;
            addCandidate(toCatalogProductData(row));
          }
        }


        // Quality floor: a candidate is only valid if its score is >= 50
        // AND strictly better than the current product. Never surface a
        // red/regular product as a "better" alternative.
        const eligible = scored
          .filter(c => c.score >= MIN_SCORE && c.score > currentScore)
          .sort((a, b) => b.score - a.score);

        // Score parity with the product page: the search payload can still be
        // partial, so refetch the FULL record for the finalists and rescore
        // exactly like ResultPage does (real case: a jam shown at 95 on the
        // card and 65 once opened, because additives were missing).
        const finalists = eligible.slice(0, 4);
        await Promise.all(finalists.map(async (c) => {
          if (c.data.source !== 'off' && c.data.source !== 'obf') return;
          try {
            const res = await fetch(
              `https://${host}/api/v2/product/${encodeURIComponent(c.data.barcode)}.json`,
              { signal: controller.signal },
            );
            if (!res.ok) return;
            const json = (await res.json()) as { product?: SearchItem };
            if (!json.product) return;
            const full = toProductData({ ...json.product, code: c.data.barcode }, c.data.source, cat);
            if (!full) return;
            const fl = flagIngredients(full);
            c.data = full;
            c.flagged = fl;
            c.score = scoreOf(full, fl);
            c.label = scoreLabel(c.score);
          } catch {
            /* keep the search-based score */
          }
        }));

        const top = finalists
          .filter(c => c.score >= MIN_SCORE && c.score > currentScore)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        if (cancelled) return;
        try { sessionStorage.setItem(cacheKey, JSON.stringify(top)); } catch {}
        track('alternatives_shown', { count: top.length });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.barcode, current.source, current.category, current.name, rawTagsKey, guessedTagsKey, currentScore, eligible, consentProp]);

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

  const consent = consentProp ?? hasHealthDataConsent();
  const title = consent ? '💡 Alternativas mejores para ti' : '💡 Alternativas mejores';

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
              onClick={() => navigate(`/result/${data.barcode}`, { state: { skipHistory: true } })}
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
