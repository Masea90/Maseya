import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/lib/premium';
import { supabase } from '@/integrations/supabase/client';
import { personalAlerts } from '@/lib/scoring';


interface Props {
  product: {
    product_name: string;
    brand: string;
    category: string;
    ingredients_text: string;
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
  const premium = usePremium();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Free basic summary (always available, no AI call)
  const basicSummary = hasIngredientData
    ? buildBasicSummary(product, profile, score)
    : 'Fotografía la etiqueta para obtener un análisis completo de este producto.';

  useEffect(() => {
    if (!premium || startedRef.current) return;
    startedRef.current = true;
    setLoading(true);
    setText('');
    setError(null);

    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) {
          setError('Inicia sesión para ver el análisis personalizado.');
          setLoading(false);
          return;
        }
        const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mira-analyze`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ product, profile, score }),
        });
        if (!res.ok || !res.body) {
          setError('Mira no está disponible ahora mismo.');
          setLoading(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let acc = '';
        while (true) {
          const { done, value } = await reader.read();
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
        setLoading(false);
      } catch (e) {
        console.error('[mira] stream error', e);
        setError('Mira no está disponible ahora mismo.');
        setLoading(false);
      }
    })();
  }, [premium, product, profile, score]);

  if (!premium) {
    return (
      <div className="space-y-3">
        {/* Basic summary — free */}
        <div className="bg-secondary/40 rounded-2xl p-4 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Mira · Resumen</p>
            <p className="text-sm leading-relaxed">{basicSummary}</p>
          </div>
        </div>

        {/* Deep analysis upsell */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center opacity-60">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Análisis profundo de Mira</p>
              <p className="text-[11px] text-muted-foreground">Análisis detallado con IA · Premium</p>
            </div>
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-1.5 select-none" style={{ filter: 'blur(4px)' }} aria-hidden>
            <div className="h-3 bg-muted rounded w-11/12" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-9/12" />
          </div>
          <Button onClick={() => navigate('/premium')} className="w-full rounded-xl">
            Desbloquear con Premium
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">3,99€/mes · 7 días gratis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary/40 rounded-2xl p-4 flex gap-3">
      <div className={`w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ${loading ? 'animate-pulse' : ''}`}>
        <Sparkles className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        {loading && !text && (
          <p className="text-sm text-muted-foreground italic">Mira está analizando para tu perfil...</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>}
      </div>
    </div>
  );
};
