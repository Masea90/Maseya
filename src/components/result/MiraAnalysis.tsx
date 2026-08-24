import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { personalAlerts } from '@/lib/scoring';
import { useUser } from '@/contexts/UserContext';
import type { Language } from '@/lib/i18n';

const COPY: Record<Language, {
  noData: string; general: string; analyzing: string;
  good: (n: string) => string; ok: (n: string) => string; bad: (n: string) => string;
  fallbackName: string;
}> = {
  es: {
    noData: 'Fotografía la etiqueta para obtener un análisis completo de este producto.',
    general: 'Análisis general del producto. Activa la personalización para ver si es adecuado para tu perfil.',
    analyzing: 'Mira está analizando...',
    good: n => `${n} parece una buena opción según tu perfil.`,
    ok: n => `${n} es aceptable, aunque no destaca para tu perfil.`,
    bad: n => `${n} no es ideal según tu perfil — revisa los ingredientes destacados.`,
    fallbackName: 'Este producto',
  },
  en: {
    noData: 'Photograph the label to get a full analysis of this product.',
    general: 'General product analysis. Turn on personalization to see if it suits your profile.',
    analyzing: 'Mira is analyzing...',
    good: n => `${n} looks like a good option for your profile.`,
    ok: n => `${n} is acceptable, though it does not stand out for your profile.`,
    bad: n => `${n} is not ideal for your profile — check the highlighted ingredients.`,
    fallbackName: 'This product',
  },
  fr: {
    noData: "Photographie l'étiquette pour obtenir une analyse complète de ce produit.",
    general: 'Analyse générale du produit. Active la personnalisation pour voir si ce produit te convient.',
    analyzing: 'Mira analyse...',
    good: n => `${n} semble une bonne option pour ton profil.`,
    ok: n => `${n} est acceptable, mais ne se distingue pas pour ton profil.`,
    bad: n => `${n} n'est pas idéal pour ton profil — vérifie les ingrédients signalés.`,
    fallbackName: 'Ce produit',
  },
};


interface Props {
  product: {
    product_name: string;
    brand: string;
    category: string;
    ingredients_text: string;
    barcode?: string;
  };
  profile: any;
  score: number;
  hasIngredientData?: boolean;
  /** First name for personalized greeting (only when consent is granted). */
  firstName?: string | null;
  /** Personal score so Mira's tone matches the personal fit. */
  personalScore?: number | null;
  /** Top personal alerts (danger/warn) — Mira must be coherent with these. */
  topAlerts?: string[];
  /** Score breakdown factors so Mira can explain WHY the score is what it is. */
  factors?: string[];
  /** Key nutrients per 100 g, pre-formatted, so Mira can cite real numbers. */
  nutriments?: string | null;
  /** Names of ingredients we already flag — server skips them as candidates. */
  flaggedIngredients?: string[];
}

// Generates a 1-2 sentence basic summary using the highest-priority personal alert.
// No AI call — pure local logic so it's free for everyone.
function buildBasicSummary(
  product: Props['product'],
  profile: any,
  score: number,
  c: (typeof COPY)[Language],
): string {
  const productLike: any = {
    name: product.product_name,
    brand: product.brand,
    category: product.category === 'food' ? 'food' : 'cosmetic',
    ingredients_text: product.ingredients_text || '',
    ingredients_tags: [],
    labels_tags: [],
    ingredients_analysis_tags: [],
    allergens_tags: [],
    traces_tags: [],

    nutriscore_grade: null,
    image: null,
    barcode: '',
    source: 'basic',
    raw: {},
  };
  const alerts = personalAlerts(productLike, profile);
  const top = alerts.find(a => a.level === 'danger') || alerts.find(a => a.level === 'warn') || alerts[0];
  const productLabel = product.product_name || c.fallbackName;

  if (top) {
    return `${productLabel}: ${top.text}`;
  }
  if (score >= 70) return c.good(productLabel);
  if (score >= 40) return c.ok(productLabel);
  return c.bad(productLabel);
}

export const MiraAnalysis = ({ product, profile, score, hasIngredientData = true, firstName = null, personalScore = null, topAlerts = [], factors = [], nutriments = null, flaggedIngredients = [] }: Props) => {
  const { user } = useUser();
  const language = user.language;
  const c = COPY[language] ?? COPY.es;
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Identity of the analysis in flight — resets when the product changes so
  // navigating to an alternative doesn't keep showing the previous product's
  // Mira analysis.
  const startedForRef = useRef<string | null>(null);

  // Free basic summary (always available, no AI call). Used as a fallback while
  // the streaming AI response arrives or if it fails.
  const basicSummary = !hasIngredientData
    ? c.noData
    : profile
      ? buildBasicSummary(product, profile, score, c)
      : c.general;

  // Track cancellation per identity so a parent re-render (which creates new
  // `product`/`profile` object refs) does NOT kill an in-flight Mira stream.
  const cancelRef = useRef<{ id: string; cancel: () => void } | null>(null);

  useEffect(() => {
    // Identity keyed on barcode when available so navigating between products
    // with the same name (or empty ingredient text) never reuses the previous
    // product's Mira analysis. Falls back to name+ingredients for photo scans
    // without a barcode.
    const identity = (product.barcode && product.barcode !== 'photo'
      ? `bc:${product.barcode}`
      : `nm:${product.product_name}::${product.ingredients_text || ''}`) + `::ps:${personalScore ?? 'x'}::lg:${language}`;
    if (startedForRef.current === identity) return;

    // New identity → cancel any previous stream AND wipe the previous product's
    // text so users never see a stale analysis while the new one loads.
    cancelRef.current?.cancel();
    setText('');

    if (!hasIngredientData) {
      startedForRef.current = identity;
      setText('');
      setLoading(false);
      setError(null);
      return;
    }
    startedForRef.current = identity;
    let cancelled = false;
    cancelRef.current = { id: identity, cancel: () => { cancelled = true; } };
    setLoading(true);
    setText('');
    setError(null);

    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mira-analyze`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ product, profile, score, firstName, personalScore, topAlerts, factors, nutriments, flaggedIngredients, language }),
        });
        if (cancelled) return;
        if (!res.ok || !res.body) {
          setError(null);
          setLoading(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let acc = '';
        while (true) {
          const { done, value } = await reader.read();
          if (cancelled) { try { await reader.cancel(); } catch {} return; }
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const payload = t.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const obj = JSON.parse(payload);
              const delta = obj.choices?.[0]?.delta?.content;
              if (delta) {
                acc += delta;
                setText(acc);
              }
            } catch {}
          }
        }
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error('[mira] stream error', e);
        setError(null);
        setLoading(false);
      }
    })();
    // NOTE: no cleanup that unconditionally cancels — a parent re-render
    // must not abort an in-flight analysis. Cancellation happens above only
    // when the product identity actually changes.
  }, [product, profile, score, hasIngredientData, personalScore, language]);

  const displayText = text || basicSummary;

  return (
    <div className="bg-secondary/40 rounded-2xl p-4 flex gap-3">
      <div className={`w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ${loading && !text ? 'animate-pulse' : ''}`}>
        <Sparkles className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Mira</p>
        {loading && !text ? (
          <p className="text-sm text-muted-foreground italic">{c.analyzing}</p>
        ) : error ? (
          <p className="text-sm leading-relaxed">{basicSummary}</p>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
        )}
      </div>
    </div>
  );
};
