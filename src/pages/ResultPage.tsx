import { useEffect, useRef, useState } from 'react';
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
  flagIngredients, calculateScoreBreakdown, calculatePersonalScoreBreakdown, scoreLabel, naturalness, personalAlerts, loadOnboarding,
  isNutritionalData,
  FlaggedIngredient, PersonalAlert,
} from '@/lib/scoring';
import { inciLabel } from '@/lib/inciLabels';
import { RegistrationSheet } from '@/components/auth/RegistrationSheet';
import { MiraAnalysis } from '@/components/result/MiraAnalysis';
import { Alternatives } from '@/components/result/Alternatives';
import { ScoreBreakdown } from '@/components/result/ScoreBreakdown';
import { InstallPrompt } from '@/components/InstallPrompt';

import { hasHealthDataConsent, getStoredConsent, saveConsent } from '@/components/consent/ConsentModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HeartPulse } from 'lucide-react';

const ResultPage = () => {
  const { barcode } = useParams<{ barcode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();
  

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  

  const [fromPhoto, setFromPhoto] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);

  const [healthProfile, setHealthProfile] = useState<any>(null);
  const [healthConsent, setHealthConsent] = useState<boolean>(() => hasHealthDataConsent());
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  // Re-evaluate consent when auth hydrates (DB→localStorage sync from AuthContext)
  // or when the user grants it in another tab/component.
  useEffect(() => {
    const refresh = () => setHealthConsent(hasHealthDataConsent());
    refresh();
    window.addEventListener('maseya:consent-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('maseya:consent-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [currentUser?.id]);


  const grantHealthConsent = async () => {
    const current = getStoredConsent();
    saveConsent({
      analytics: !!current?.analytics,
      personalization: current?.personalization ?? true,
      health_data: true,
      date: new Date().toISOString(),
    });
    setHealthConsent(true);
    setShowConsentDialog(false);
    if (currentUser?.id) {
      try {
        await supabase
          .from('profiles')
          .update({
            consent_analytics: !!current?.analytics,
            consent_personalization: current?.personalization ?? true,
            consent_health_data: true,
            consent_date: new Date().toISOString(),
          })
          .eq('user_id', currentUser.id);
      } catch (e) {
        console.error('[consent] db sync failed', e);
      }
    }
  };

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
          diet: Array.isArray(data.diet) ? data.diet : (data.diet ? [data.diet] : []),
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

    const loadFromPhotoLocalStorage = (matchBarcode?: string): boolean => {
      try {
        const raw = localStorage.getItem('maseya_photo_product');
        if (!raw) return false;
        const p = JSON.parse(raw);
        if (matchBarcode && p.barcode !== matchBarcode) return false;
        const cat: ProductData['category'] =
          p.category === 'food' ? 'food' : p.category === 'cosmetic' ? 'cosmetic' : 'unknown';
        const categoryTag = typeof p.category_tag === 'string' && /^en:[a-z0-9-]+$/.test(p.category_tag)
          ? p.category_tag
          : null;
        const rawObj: Record<string, unknown> = { ...p };
        if (categoryTag) rawObj.categories_tags = [categoryTag];
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
          allergens_tags: [],
          traces_tags: [],
          raw: rawObj,
        });
        setFromPhoto(true);
        setPhotoSaved(p.saved === true);
        setLoading(false);

        return true;
      } catch (e) {
        console.error('[result] photo parse failed', e);
        return false;
      }
    };

    if (barcode === 'photo') {
      if (!loadFromPhotoLocalStorage()) {
        setNotFound(true);
        setLoading(false);
      }
      return;
    }

    // Anonymous photo flow: if the user just photographed this exact barcode,
    // saveToMaseya may have failed silently (not_authenticated). Use the
    // in-memory capture from localStorage before hitting the network.
    if (loadFromPhotoLocalStorage(barcode)) {
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
          // Symmetric fallback: if a photo capture for this barcode exists
          // locally, surface it instead of a dead-end "not found".
          if (loadFromPhotoLocalStorage(barcode)) return;
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


  // Persist + soft paywall logic. Guarded so it only fires ONCE per product,
  // regardless of how many times deps like isAuthenticated/currentUser?.id
  // hydrate (previously this incremented the anon counter multiple times and
  // could also toggle showSheet back and forth on re-renders).
  const persistedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!product) return;
    // Wait until we know the auth state (avoids racing anon-vs-authed writes).
    if (isAuthenticated && !currentUser?.id) return;
    const key = `${product.barcode}::${isAuthenticated ? currentUser?.id : 'anon'}`;
    if (persistedRef.current === key) return;
    persistedRef.current = key;

    const flagged = flagIngredients(product);
    const score = calculateScoreBreakdown(product, flagged).score;
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
      const ck = 'maseya_anon_scans';
      const count = Number(localStorage.getItem(ck) || '0') + 1;
      localStorage.setItem(ck, String(count));
      // Anonymous users: prompt registration from the 5th scan onwards, but
      // don't spam — only show once every 24h so the user can keep browsing
      // if they dismissed it.
      if (count >= 5) {
        const lastShown = Number(localStorage.getItem('maseya_regsheet_shown_at') || '0');
        const dayMs = 24 * 60 * 60 * 1000;
        if (Date.now() - lastShown > dayMs) {
          localStorage.setItem('maseya_regsheet_shown_at', String(Date.now()));
          // Defer to next tick so the result page has painted first — some
          // browsers otherwise skip the sheet's enter animation and it appears
          // to never open.
          setTimeout(() => setShowSheet(true), 400);
        }
      }
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
            <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/scan'))} aria-label="Volver">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg font-semibold">Producto no encontrado</h1>
          </div>
        </header>
        <div className="w-full sm:max-w-lg sm:mx-auto p-6 space-y-4 text-center">
          <p className="text-muted-foreground">No tenemos información de este producto en nuestras bases.</p>
          <Button onClick={() => navigate(barcode && barcode !== 'photo' ? `/scan/photo?barcode=${barcode}` : '/scan/photo')} className="w-full h-12 rounded-2xl">
            Fotografiar ingredientes
          </Button>
        </div>
      </div>
    );
  }

  const flagged = flagIngredients(product);
  const scoreBreakdown = calculateScoreBreakdown(product, flagged);
  const score = scoreBreakdown.score;
  const sl = scoreLabel(score);
  const nat = naturalness(product, flagged);
  const profile = loadOnboarding();
  // Use the SAME profile object for both alerts and the personal score so
  // the "declared by manufacturer" alert and the score can never disagree.
  const activeProfile = healthProfile || profile;
  const alerts = healthConsent ? personalAlerts(product, activeProfile) : [];
  const personalBreakdown = healthConsent
    ? calculatePersonalScoreBreakdown(product, flagged, activeProfile, score)
    : null;
  const personalScore = personalBreakdown ? personalBreakdown.score : score;
  const psl = scoreLabel(personalScore);
  // Consider ingredient data available when we have ANY flagged item OR when
  // there's non-nutritional ingredients text. Many legit products are
  // mono-ingredient (coconut oil, honey, salt, rice, legumes) — the old
  // `flagged.length >= 3` heuristic wrongly hid them.
  const rawText = (product.ingredients_text || '').trim();
  const hasIngredientData =
    flagged.length >= 1 ||
    (rawText.length > 0 && !isNutritionalData(rawText));
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
          <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/scan'))} aria-label="Volver">
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
                {photoSaved ? (
                  <><span>✅</span><span>Añadido a nuestra base de datos</span></>
                ) : (
                  <><span>📱</span><span>Análisis guardado en tu dispositivo</span></>
                )}
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
              <Button onClick={() => navigate(barcode && barcode !== 'photo' ? `/scan/photo?barcode=${barcode}` : '/scan/photo')} className="w-full h-12 rounded-2xl">
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
                  <div className="flex items-end justify-center gap-4">
                    {/* General score (free) */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-warm"
                        style={{ backgroundColor: sl.bg, color: sl.color }}
                      >
                        <div className="text-3xl font-bold">{score}</div>
                        <div className="text-[10px] uppercase tracking-wider opacity-90">/ 100</div>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">General</div>
                    </div>

                    {/* Personal score — only when health-data consent is given */}
                    {healthConsent && (
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className="w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-warm-lg ring-4 ring-primary/40"
                          style={{ backgroundColor: psl.bg, color: psl.color }}
                        >
                          <div className="text-4xl font-bold">{personalScore}</div>
                          <div className="text-[10px] uppercase tracking-wider opacity-90">/ 100</div>
                        </div>
                        <div className="text-xs font-semibold text-primary">Para ti</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="font-display text-lg font-semibold" style={{ color: psl.bg }}>{psl.label}</div>
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
                          La <strong>puntuación general</strong> evalúa el producto para el público general (Nutriscore + ingredientes).
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                          La <strong>puntuación personal</strong> ajusta esa nota según tu perfil: piel, alergias, dieta y objetivos.
                        </p>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Score composition: helps users understand where the number comes from. */}
                  <div className="w-full flex flex-col items-center gap-2">
                    <ScoreBreakdown factors={scoreBreakdown.factors} title="¿Por qué esta nota general?" />
                    {personalBreakdown && (
                      <ScoreBreakdown factors={personalBreakdown.factors} title="¿Por qué tu nota personal?" />
                    )}
                  </div>

                  {!hasIngredientData && hasNutriscore && (
                    <div className="w-full max-w-sm mt-1 rounded-2xl border border-[#F4A261]/50 bg-[#F4A261]/10 p-3 flex gap-2 items-start">
                      <span className="text-base leading-none">⚠️</span>
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-[#8a4a1e] leading-relaxed">
                          <strong>Análisis incompleto:</strong> esta nota se basa solo en el Nutriscore. Fotografía la lista de ingredientes para un análisis completo.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(barcode && barcode !== 'photo' ? `/scan/photo?barcode=${barcode}` : '/scan/photo')}
                          className="rounded-xl h-8 text-xs border-[#F4A261]/60 bg-white/60 hover:bg-white"
                        >
                          <Camera className="w-3.5 h-3.5 mr-1.5" />
                          Fotografiar ingredientes
                        </Button>
                      </div>
                    </div>
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
                  <Button onClick={() => navigate(barcode && barcode !== 'photo' ? `/scan/photo?barcode=${barcode}` : '/scan/photo')} variant="outline" className="rounded-xl mt-1">
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
                        <Button onClick={() => navigate(barcode && barcode !== 'photo' ? `/scan/photo?barcode=${barcode}` : '/scan/photo')} variant="outline" className="rounded-xl">
                          <Camera className="w-4 h-4 mr-2" />
                          Fotografiar etiqueta
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {flagged.slice(0, 20).map((f, i) => {
                          const es = inciLabel(f.name);
                          return (
                            <Badge key={i} className={`${badgeVariant(f.level)} font-normal capitalize`}>
                              {f.name}{es ? ` (${es})` : ''}
                            </Badge>
                          );
                        })}
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
                    {!healthConsent ? (
                      <div className="flex gap-3 items-start p-3 rounded-xl border border-primary/30 bg-primary/5">
                        <HeartPulse className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-foreground/90">
                            Activa la personalización para saber si este producto es adecuado para tu perfil.
                          </p>
                          <Button
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setShowConsentDialog(true)}
                          >
                            Activar personalización
                          </Button>
                        </div>
                      </div>
                    ) : alerts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {hasIngredientData
                          ? 'No hemos detectado incompatibilidades con tu perfil. Verifica siempre el etiquetado.'
                          : 'Fotografía la etiqueta para ver si este producto es adecuado para ti.'}
                      </p>
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

            {/* Mira personalised analysis — free for everyone */}
            <MiraAnalysis
              product={{
                product_name: product.name,
                brand: product.brand || '',
                category: product.category,
                ingredients_text: product.ingredients_text || '',
              }}
              profile={healthConsent ? (healthProfile || profile) : null}
              score={score}
              hasIngredientData={hasIngredientData}
            />

            {/* Alternatives */}
            <Alternatives current={product} currentScore={healthConsent ? personalScore : score} />
          </>
        )}

        {/* PWA install prompt — shown after the first scan result renders */}
        <InstallPrompt />

        {/* Medical / legal disclaimer — always visible on results */}
        <div className="mt-4 rounded-2xl border border-border/70 bg-muted/40 p-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground/80">Aviso: </span>
            Maseya ofrece información orientativa basada en datos públicos y en tu perfil. No sustituye el consejo de un médico, dermatólogo o nutricionista. Si tienes alergias graves, verifica siempre el etiquetado oficial del producto.
          </p>
        </div>
      </div>


      <RegistrationSheet open={showSheet} onOpenChange={setShowSheet} variant="soft" />

      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent className="max-w-md mx-auto rounded-3xl">
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center font-display">
              Activar personalización
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-foreground/90">
            <p>
              Acepto el tratamiento de mis datos de salud (alergias, tipo de piel, embarazo) para
              personalizar los análisis.
            </p>
            <p className="text-xs text-muted-foreground">
              Sin este consentimiento la app sigue funcionando, pero solo con análisis generales.
              Puedes cambiarlo en cualquier momento.{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Política de privacidad
              </a>
              .
            </p>
          </div>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setShowConsentDialog(false)}
            >
              Ahora no
            </Button>
            <Button className="flex-1 rounded-xl" onClick={grantHealthConsent}>
              Acepto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultPage;
