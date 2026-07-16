import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { personalAlerts } from '@/lib/scoring';


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
}

// Generates a 1-2 sentence basic summary using the highest-priority personal alert.
// No AI call — pure local logic so it's free for everyone.
function buildBasicSummary(
  product: Props['product'],
  profile: any,
  score: number,
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
  const productLabel = product.product_name || 'Este producto';

  if (top) {
    return `${productLabel}: ${top.text}`;
  }
  if (score >= 70) {
    return `${productLabel} parece una buena opción según tu perfil.`;
  }
  if (score >= 40) {
    return `${productLabel} es aceptable, aunque no destaca para tu perfil.`;
  }
  return `${productLabel} no es ideal según tu perfil — revisa los ingredientes destacados.`;
}

export const MiraAnalysis = ({ product, profile, score, hasIngredientData = true }: Props) => {
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
    ? 'Fotografía la etiqueta para obtener un análisis completo de este producto.'
    : profile
      ? buildBasicSummary(product, profile, score)
      : 'Análisis general del producto. Activa la personalización para ver si es adecuado para tu perfil.';

  // Track cancellation per identity so a parent re-render (which creates new
  // `product`/`profile` object refs) does NOT kill an in-flight Mira stream.
  const cancelRef = useRef<{ id: string; cancel: () => void } | null>(null);

  useEffect(() => {
    // Identity keyed on barcode when available so navigating between products
    // with the same name (or empty ingredient text) never reuses the previous
    // product's Mira analysis. Falls back to name+ingredients for photo scans
    // without a barcode.
    const identity = product.barcode && product.barcode !== 'photo'
      ? `bc:${product.barcode}`
      : `nm:${product.product_name}::${product.ingredients_text || ''}`;
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
          body: JSON.stringify({ product, profile, score }),
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
  }, [product, profile, score, hasIngredientData]);

  const displayText = text || basicSummary;

  return (
    <div className="bg-secondary/40 rounded-2xl p-4 flex gap-3">
      <div className={`w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ${loading && !text ? 'animate-pulse' : ''}`}>
        <Sparkles className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Mira</p>
        {loading && !text ? (
          <p className="text-sm text-muted-foreground italic">Mira está analizando...</p>
        ) : error ? (
          <p className="text-sm leading-relaxed">{basicSummary}</p>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
        )}
      </div>
    </div>
  );
};
