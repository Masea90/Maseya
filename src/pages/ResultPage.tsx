import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Sparkles, Loader2, Camera } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lookupProduct, ProductData } from '@/lib/productLookup';
import {
  flagIngredients, calculateScore, scoreLabel, naturalness, personalAlerts, loadOnboarding,
  FlaggedIngredient, PersonalAlert,
} from '@/lib/scoring';
import { RegistrationSheet } from '@/components/auth/RegistrationSheet';

const ResultPage = () => {
  const { barcode } = useParams<{ barcode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    if (!barcode || barcode === 'photo') {
      setLoading(false);
      setNotFound(barcode !== 'photo');
      return;
    }
    let cancelled = false;
    (async () => {
      const data = await lookupProduct(barcode);
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProduct(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [barcode]);

  // Persist + soft paywall logic
  useEffect(() => {
    if (!product) return;
    const flagged = flagIngredients(product);
    const score = calculateScore(product, flagged);

    if (isAuthenticated && currentUser?.id) {
      supabase.from('scan_history').insert([{
        user_id: currentUser.id,
        barcode: product.barcode,
        product_name: product.name,
        product_image: product.image ?? undefined,
        category: product.category,
        source: product.source,
        product_data: JSON.parse(JSON.stringify(product.raw)),
        scores: { global: score },
      }]).then(({ error }) => {
        if (error) console.error('[scan_history] insert', error);
      });
    } else {
      const key = 'maseya_anon_scans';
      const count = Number(localStorage.getItem(key) || '0') + 1;
      localStorage.setItem(key, String(count));
      if (count >= 3) setPaywall(true);
      else setShowSheet(true);
    }
  }, [product, isAuthenticated, currentUser?.id]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Analizando producto...</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="w-full sm:max-w-lg sm:mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => navigate('/scan')} aria-label="Volver">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg font-semibold">Producto no encontrado</h1>
          </div>
        </header>
        <div className="w-full sm:max-w-lg sm:mx-auto p-6 space-y-4 text-center">
          <p className="text-muted-foreground">No tenemos información de este producto en nuestras bases.</p>
          <Button onClick={() => navigate('/scan/photo')} className="w-full h-12 rounded-2xl">
            Fotografiar ingredientes
          </Button>
        </div>
      </div>
    );
  }

  const flagged = flagIngredients(product);
  const score = calculateScore(product, flagged);
  const sl = scoreLabel(score);
  const nat = naturalness(product, flagged);
  const profile = loadOnboarding();
  const alerts = personalAlerts(product, profile);
  const hasIngredientData = flagged.length >= 3;
  const hasNutriscore = product.category === 'food' && !!product.nutriscore_grade;
  const showScore = product.category === 'cosmetic'
    ? hasIngredientData
    : (hasNutriscore || hasIngredientData);

  const badgeVariant = (lvl: FlaggedIngredient['level']) =>
    lvl === 'avoid' ? 'bg-[#E63946] text-white'
      : lvl === 'caution' ? 'bg-[#F4A261] text-white'
      : 'bg-[#95D5B2] text-[#1B1B1B]';

  const alertColor = (lvl: PersonalAlert['level']) =>
    lvl === 'danger' ? 'bg-[#E63946]/10 border-[#E63946]/30 text-[#E63946]'
      : lvl === 'warn' ? 'bg-[#F4A261]/10 border-[#F4A261]/40 text-[#8a4a1e]'
      : 'bg-[#95D5B2]/15 border-[#2D6A4F]/30 text-[#2D6A4F]';

  const alertIcon = (lvl: PersonalAlert['level']) =>
    lvl === 'danger' ? '🚨' : lvl === 'warn' ? '⚠️' : '✅';

  return (
    <div className="min-h-[100dvh] bg-background pb-12">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="w-full sm:max-w-lg sm:mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/scan')} aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-base font-semibold truncate">{product.name}</h1>
        </div>
      </header>

      <div className="w-full sm:max-w-lg sm:mx-auto px-4 py-6 space-y-6">
        {/* Header card */}
        <div className="bg-card rounded-3xl p-5 border border-border flex gap-4">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-20 h-20 rounded-2xl object-cover bg-muted" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-muted" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold leading-tight">{product.name}</p>
            {product.brand && <p className="text-xs text-muted-foreground mt-1 truncate">{product.brand}</p>}
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
              {product.category === 'food' ? 'Alimentación' : 'Cosmética'}
            </p>
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-warm-lg"
            style={{ backgroundColor: sl.bg, color: sl.color }}
          >
            <div className="text-4xl font-bold">{score}</div>
            <div className="text-xs uppercase tracking-wider opacity-90">/ 100</div>
          </div>
          <div className="font-display text-lg font-semibold" style={{ color: sl.bg }}>{sl.label}</div>
          {!hasIngredientData && (
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Puntuación basada en datos nutricionales. Escanea la etiqueta para análisis de ingredientes completo.
            </p>
          )}
        </div>

        {/* Cards */}
        <Collapsible defaultOpen>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-2">🔬 Ingredientes generales</span>
              <ChevronDown className="w-4 h-4" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0">
                {!hasIngredientData ? (
                  <div className="space-y-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      {product.category === 'cosmetic'
                        ? 'Este producto cosmético no tiene ingredientes registrados en nuestra base de datos. Fotografía la etiqueta para análisis completo.'
                        : 'Sin lista de ingredientes disponible para este producto. Puedes fotografiar la etiqueta para un análisis completo.'}
                    </p>
                    <Button onClick={() => navigate('/scan/photo')} variant="outline" className="rounded-xl">
                      <Camera className="w-4 h-4 mr-2" />
                      Fotografiar etiqueta
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {flagged.slice(0, 20).map((f, i) => (
                      <Badge key={i} className={`${badgeVariant(f.level)} font-normal capitalize`}>{f.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        <Collapsible defaultOpen>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-2">🌿 ¿Es natural?</span>
              <ChevronDown className="w-4 h-4" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-3">
                {!hasIngredientData ? (
                  <p className="text-sm text-muted-foreground">
                    Datos insuficientes — fotografía la etiqueta para calcular naturalidad
                  </p>
                ) : (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Ingredientes limpios</span><span className="font-semibold">{nat.pct}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${nat.pct}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-primary/10 text-primary border border-primary/20">{nat.level}</Badge>
                      {nat.organic && <Badge className="bg-[#95D5B2] text-[#1B1B1B]">Bio / Orgánico</Badge>}
                    </div>
                  </>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        <Collapsible defaultOpen>
          <div className="bg-card rounded-2xl border-2 border-primary/40 overflow-hidden">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-2">👤 ¿Es para ti?</span>
              <ChevronDown className="w-4 h-4" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-2">
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Completa tu perfil para ver análisis personalizado.</p>
                ) : (
                  alerts.map((a, i) => (
                    <div key={i} className={`flex gap-2 items-start p-3 rounded-xl border ${alertColor(a.level)}`}>
                      <span className="text-base leading-none">{alertIcon(a.level)}</span>
                      <span className="text-sm flex-1">{a.text}</span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Mira summary */}
        <div className="bg-secondary/40 rounded-2xl p-4 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <p className="text-sm leading-relaxed">
            He analizado este producto para tu perfil. Revisa las capas anteriores para ver si es adecuado para ti.
            En la próxima fase recibirás mi análisis completo personalizado.
          </p>
        </div>

        {/* Alternatives */}
        <div>
          <h3 className="font-display font-semibold mb-3">Mejores opciones para ti</h3>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted/50 border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                Próximamente
              </div>
            ))}
          </div>
        </div>
      </div>

      <RegistrationSheet open={showSheet || paywall} onOpenChange={(v) => { setShowSheet(v); if (!v) setPaywall(false); }} variant={paywall ? 'paywall' : 'soft'} />
    </div>
  );
};

export default ResultPage;
