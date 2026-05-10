import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Sparkles, Loader2, Camera, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lookupProduct, ProductData } from '@/lib/productLookup';
import {
  flagIngredients, calculateScore, calculatePersonalScore, scoreLabel, naturalness, personalAlerts, loadOnboarding,
  FlaggedIngredient, PersonalAlert,
} from '@/lib/scoring';
import { usePremium } from '@/lib/premium';
import { Lock } from 'lucide-react';
import { RegistrationSheet } from '@/components/auth/RegistrationSheet';
import { MiraAnalysis } from '@/components/result/MiraAnalysis';
import { Alternatives } from '@/components/result/Alternatives';

const ResultPage = () => {
  const { barcode } = useParams<{ barcode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();
  const premium = usePremium();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const [fromPhoto, setFromPhoto] = useState(false);
  const [healthProfile, setHealthProfile] = useState<any>(null);

  useEffect(() => {
    if (!currentUser?.id) {
      // Fallback to localStorage onboarding data
      try {
        const raw = localStorage.getItem('maseya_onboarding');
        if (raw) setHealthProfile(JSON.parse(raw));
      } catch {}
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('health_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setHealthProfile({
          skin_type: data.skin_type || [],
          skin_conditions: data.skin_conditions || [],
          skin_sensitivities: data.skin_sensitivities || [],
          allergies: data.allergies || [],
          diet: data.diet || '',
          nutrition_goals: data.nutrition_goals || [],
          pregnancy_or_lactation: !!data.pregnancy_or_lactation,
        });
      } else {
        try {
          const raw = localStorage.getItem('maseya_onboarding');
          if (raw) setHealthProfile(JSON.parse(raw));
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!barcode) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    if (barcode === 'photo') {
      try {
        const raw = localStorage.getItem('maseya_photo_product');
        if (!raw) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const p = JSON.parse(raw);
        const cat: ProductData['category'] =
          p.category === 'food' ? 'food' : p.category === 'cosmetic' ? 'cosmetic' : 'unknown';
        setProduct({
          barcode: p.barcode,
          source: 'photo',
          name: p.product_name || 'Producto fotografiado',
          brand: p.brand || '',
          image: p.image || null,
          category: cat,
          nutriscore_grade: null,
          ingredients_text: p.ingredients_text || null,
          ingredients_tags: [],
          labels_tags: [],
          ingredients_analysis_tags: [],
          raw: p,
        });
        setFromPhoto(true);
        setLoading(false);
      } catch (e) {
        console.error('[result] photo parse failed', e);
        setNotFound(true);
        setLoading(false);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      const data = await lookupProduct(barcode);
      if (cancelled) return;
      if (!data) {
        // Try real-time enrichment before giving up
        setEnriching(true);
        try {
          await supabase.functions.invoke('enrich-products', { body: { barcode } });
        } catch (e) {
          console.error('[result] enrich error', e);
        }
        if (cancelled) return;
        const retry = await lookupProduct(barcode);
        if (cancelled) return;
        setEnriching(false);
        if (!retry) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProduct(retry);
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

    // Track popularity in maseya_products (best-effort, no await)
    if (product.barcode && product.barcode !== 'photo') {
      supabase.rpc('increment_product_scan_count', { p_barcode: product.barcode })
        .then(({ error }) => { if (error) console.warn('[scan_count]', error.message); });
    }

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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          {enriching ? 'Buscando información del producto...' : 'Analizando producto...'}
        </p>
        {enriching && (
          <p className="text-xs text-muted-foreground/80 max-w-xs">
            Estamos consultando bases de datos internacionales para encontrar este producto.
          </p>
        )}
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
  const personalScore = calculatePersonalScore(product, flagged, healthProfile || profile, score);
  const psl = scoreLabel(personalScore);
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
          
        </div>
      </header>

      <div className="w-full sm:max-w-lg sm:mx-auto px-4 py-6 space-y-6">
        {/* Header card */}
        <div className="bg-card rounded-3xl p-5 border border-border flex gap-4">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-20 h-20 rounded-2xl object-cover bg-muted" />
          ) : (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
              <span className="font-display font-bold text-primary text-2xl">
                {(product.name || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold leading-tight">{product.name}</p>
            {product.brand && <p className="text-xs text-muted-foreground mt-1 truncate">{product.brand}</p>}
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
              {product.category === 'food' ? 'Alimentación' : 'Cosmética'}
            </p>
            {fromPhoto && (
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <span>✅</span>
                <span>Añadido a nuestra base de datos</span>
              </div>
            )}
          </div>
        </div>

        {product.category === 'cosmetic' && !hasIngredientData ? (
          <>
            <div className="bg-card rounded-3xl p-6 border border-border flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-display text-lg font-semibold">Ayúdanos a analizar este producto</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Este producto aún no tiene ingredientes en nuestra base de datos. Fotografía la etiqueta y Mira lo analizará al instante.
              </p>
              <Button onClick={() => navigate('/scan/photo')} className="w-full h-12 rounded-2xl">
                <Camera className="w-4 h-4 mr-2" />
                Fotografiar etiqueta
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center px-4">
              También puedes buscar este producto más tarde cuando nuestra base de datos lo incluya.
            </p>
          </>
        ) : (
          <>
            {/* Score */}
            <div className="flex flex-col items-center gap-3">
              {showScore ? (
                <>
                  <div
                    className="w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-warm-lg"
                    style={{ backgroundColor: sl.bg, color: sl.color }}
                  >
                    <div className="text-4xl font-bold">{score}</div>
                    <div className="text-xs uppercase tracking-wider opacity-90">/ 100</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="font-display text-lg font-semibold" style={{ color: sl.bg }}>{sl.label}</div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label="¿Cómo calculamos la puntuación?"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 text-sm" align="center">
                        <p className="font-display font-semibold mb-2">¿Cómo calculamos la puntuación?</p>
                        <p className="text-muted-foreground leading-relaxed">
                          Para alimentos usamos el Nutriscore oficial europeo + bonificaciones por naturalidad y ausencia de aditivos.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          Para cosméticos analizamos cada ingrediente individualmente.
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {!hasIngredientData && hasNutriscore && (
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                      Basado en valor nutricional. Fotografía la etiqueta para análisis completo de ingredientes.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="w-36 h-36 rounded-full flex flex-col items-center justify-center bg-muted text-muted-foreground border border-border">
                    <div className="text-2xl">—</div>
                    <div className="text-[10px] uppercase tracking-wider mt-1">Sin datos</div>
                  </div>
                  <div className="font-display text-lg font-semibold text-muted-foreground">Datos insuficientes</div>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Fotografía la etiqueta para obtener tu puntuación personalizada.
                  </p>
                  <Button onClick={() => navigate('/scan/photo')} variant="outline" className="rounded-xl mt-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Fotografiar etiqueta
                  </Button>
                </>
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
                          Sin lista de ingredientes disponible para este producto. Puedes fotografiar la etiqueta para un análisis completo.
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

            {/* Mira personalised analysis (Premium gated) */}
            <MiraAnalysis
              product={{
                product_name: product.name,
                brand: product.brand || '',
                category: product.category,
                ingredients_text: product.ingredients_text || '',
              }}
              profile={healthProfile || profile}
              score={score}
            />

            {/* Alternatives */}
            <Alternatives current={product} currentScore={score} />
          </>
        )}
      </div>

      <RegistrationSheet open={showSheet || paywall} onOpenChange={(v) => { setShowSheet(v); if (!v) setPaywall(false); }} variant={paywall ? 'paywall' : 'soft'} />
    </div>
  );
};

export default ResultPage;
