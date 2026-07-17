import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, ArrowLeft, Sparkles, RefreshCw, Check, X } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { saveToMaseya } from '@/lib/productLookup';
import { Button } from '@/components/ui/button';

/**
 * Resize a File/Blob to a JPEG dataURL, longest side capped at MAX_SIDE.
 * Uses createImageBitmap with `imageOrientation: 'from-image'` when available
 * so EXIF-rotated photos from the native camera don't come out sideways.
 * Falls back to an <img> element on browsers without support.
 */
async function fileToResizedDataUrl(
  file: File | Blob,
  opts: { maxSide?: number; quality?: number; square?: boolean } = {},
): Promise<string | null> {
  const { maxSide = 1600, quality = 0.88, square = false } = opts;
  try {
    let width = 0, height = 0;
    let source: CanvasImageSource | null = null;

    const supportsBitmapOrientation = typeof createImageBitmap === 'function';

    if (supportsBitmapOrientation) {
      try {
        const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
        source = bmp;
        width = bmp.width;
        height = bmp.height;
      } catch {
        source = null;
      }
    }

    if (!source) {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = url;
        });
        source = img;
        width = img.naturalWidth;
        height = img.naturalHeight;
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    }

    if (!width || !height) return null;

    // Square center-crop for product front photos so they look "cuadraditas"
    // consistently in cards and grids regardless of the phone's aspect ratio.
    let sx = 0, sy = 0, sW = width, sH = height, outW: number, outH: number;
    if (square) {
      const side = Math.min(width, height);
      sx = Math.round((width - side) / 2);
      sy = Math.round((height - side) / 2);
      sW = side;
      sH = side;
      const out = Math.min(side, maxSide);
      outW = out;
      outH = out;
    } else {
      const longest = Math.max(width, height);
      const scale = longest > maxSide ? maxSide / longest : 1;
      outW = Math.round(width * scale);
      outH = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, sx, sy, sW, sH, 0, 0, outW, outH);
    return canvas.toDataURL('image/jpeg', quality);
  } catch (e) {
    console.error('[photo-capture] resize failed', e);
    return null;
  }
}



const COPY = {
  es: {
    title: 'Añadir producto',
    back: 'Volver',
    stepOf: (n: number) => `Paso ${n} de 2`,
    front: {
      heading: 'Fotografía el frontal del producto',
      sub: 'Apunta a la parte delantera',
      tip: 'Incluye el nombre y la marca',
      cta: 'Capturar',
    },
    ingredients: {
      heading: 'Fotografía los ingredientes',
      sub: 'Lista de ingredientes (parte trasera o lateral)',
      hint: 'Busca «Ingredients:» o «Ingredientes:»',
      cta: 'Capturar',
    },
    nutrition: {
      heading: '¿Añadir la tabla nutricional?',
      sub: 'Desbloquea la nota completa del producto',
      hint: 'Busca la columna «por 100 g»',
      capture: 'Fotografiar tabla',
      skip: 'Omitir',
      cta: 'Capturar',
    },
    analyzing: 'Mira está analizando los ingredientes...',
    analyzingNutrition: 'Leyendo la tabla nutricional...',
    analyzingSub: 'Esto puede tardar unos segundos',
    error: 'No pude leer los ingredientes. Intenta con mejor iluminación o más cerca de la etiqueta.',
    errorSession: 'Inicia sesión para analizar productos por foto',
    errorRate: 'Demasiadas peticiones, espera un momento y reintenta',
    errorPayment: 'Servicio de análisis temporalmente no disponible',
    errorUnexpected: 'Error inesperado. Reintenta en unos segundos',
    errorNutritional: 'Parece que fotografiaste la tabla nutricional. Fotografía la lista de ingredientes.',
    errorTooLarge: 'La foto es demasiado grande. Reintenta acercándote al producto.',
    nutritionRejected: 'No pudimos leer la tabla con seguridad — puedes reintentarlo.',
    loginCta: 'Iniciar sesión',
    retry: 'Reintentar',
    addImageOnly: 'Añadir foto del producto',
    savedImage: '¡Gracias! Imagen añadida.',
    cameraDenied: 'No tenemos acceso a la cámara. Habilita el permiso desde los ajustes del navegador.',
    retake: 'Repetir',
    use: 'Usar esta foto',
    starting: 'Iniciando cámara...',
  },
  en: {
    title: 'Add product',
    back: 'Back',
    stepOf: (n: number) => `Step ${n} of 2`,
    front: {
      heading: 'Photograph the product front',
      sub: 'Aim at the front of the product',
      tip: 'Include the name and brand',
      cta: 'Capture',
    },
    ingredients: {
      heading: 'Photograph the ingredients',
      sub: 'Ingredient list (back or side)',
      hint: 'Look for "Ingredients:"',
      cta: 'Capture',
    },
    nutrition: {
      heading: 'Add the nutrition table?',
      sub: 'Unlock the full product score',
      hint: 'Look for the "per 100 g" column',
      capture: 'Photograph table',
      skip: 'Skip',
      cta: 'Capture',
    },
    analyzing: 'Mira is analyzing the ingredients...',
    analyzingNutrition: 'Reading the nutrition table...',
    analyzingSub: 'This may take a few seconds',
    error: "I couldn't read the ingredients. Try better lighting or get closer.",
    errorSession: 'Log in to analyze products by photo',
    errorRate: 'Too many requests, wait a moment and try again',
    errorPayment: 'Analysis service temporarily unavailable',
    errorUnexpected: 'Unexpected error. Try again in a few seconds',
    errorNutritional: 'Looks like you photographed the nutrition table. Photograph the ingredient list instead.',
    errorTooLarge: 'Photo is too large. Try getting closer to the product.',
    nutritionRejected: "We couldn't read the table reliably — you can try again.",
    loginCta: 'Log in',
    retry: 'Try again',
    addImageOnly: 'Add product photo',
    savedImage: 'Thanks! Image added.',
    cameraDenied: "We don't have camera access. Enable it in your browser settings.",
    retake: 'Retake',
    use: 'Use photo',
    starting: 'Starting camera...',
  },
  fr: {
    title: 'Ajouter un produit',
    back: 'Retour',
    stepOf: (n: number) => `Étape ${n} sur 2`,
    front: {
      heading: 'Photographiez le devant',
      sub: "Visez l'avant du produit",
      tip: 'Incluez le nom et la marque',
      cta: 'Capturer',
    },
    ingredients: {
      heading: 'Photographiez les ingrédients',
      sub: "Liste d'ingrédients (arrière ou côté)",
      hint: 'Cherchez « Ingrédients »',
      cta: 'Capturer',
    },
    nutrition: {
      heading: 'Ajouter le tableau nutritionnel ?',
      sub: 'Débloquez la note complète du produit',
      hint: 'Cherchez la colonne « pour 100 g »',
      capture: 'Photographier le tableau',
      skip: 'Ignorer',
      cta: 'Capturer',
    },
    analyzing: 'Mira analyse les ingrédients...',
    analyzingNutrition: 'Lecture du tableau nutritionnel...',
    analyzingSub: 'Cela peut prendre quelques secondes',
    error: "Je n'ai pas pu lire les ingrédients. Essayez avec un meilleur éclairage.",
    errorSession: 'Connectez-vous pour analyser les produits par photo',
    errorRate: 'Trop de requêtes, attendez un moment puis réessayez',
    errorPayment: "Service d'analyse temporairement indisponible",
    errorUnexpected: 'Erreur inattendue. Réessayez dans quelques secondes',
    errorNutritional: "Il semble que vous ayez photographié le tableau nutritionnel. Photographiez la liste d'ingrédients.",
    errorTooLarge: 'La photo est trop grande. Essayez de vous rapprocher du produit.',
    nutritionRejected: "Nous n'avons pas pu lire le tableau avec certitude — vous pouvez réessayer.",
    loginCta: 'Se connecter',
    retry: 'Réessayer',
    addImageOnly: 'Ajouter une photo',
    savedImage: 'Merci ! Image ajoutée.',
    cameraDenied: "Nous n'avons pas accès à la caméra. Activez-la dans les paramètres.",
    retake: 'Reprendre',
    use: 'Utiliser',
    starting: 'Démarrage de la caméra...',
  },
};


type ErrorKind = 'lighting' | 'session' | 'rate' | 'payment' | 'nutritional' | 'too_large' | 'unexpected';
type Step = 'front' | 'ingredients' | 'nutrition-offer' | 'nutrition-capture' | 'analyzing' | 'analyzing-nutrition' | 'error' | 'image-saved';

const PhotoCapturePage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const addImageFor = searchParams.get('addImageFor');
  const realBarcode = searchParams.get('barcode');
  const nutritionOnly = searchParams.get('step') === 'nutrition';
  const c = COPY[user.language] ?? COPY.es;

  const [step, setStep] = useState<Step>(nutritionOnly ? 'nutrition-capture' : 'front');
  const [errorKind, setErrorKind] = useState<ErrorKind>('lighting');
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null); // freshly captured, awaiting confirm
  const [processing, setProcessing] = useState(false);
  // Data extracted from the ingredients pass, kept while showing the
  // optional nutrition step so we can navigate to /result with fresh data.
  const [pendingProduct, setPendingProduct] = useState<null | {
    finalBarcode: string; product_name: string; brand: string;
    category: 'food' | 'cosmetic'; category_tag: string | null;
    ingredients_text: string; image: string | null; serverSaved: boolean;
  }>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('[photo-capture] mount — realBarcode URL param =', realBarcode, '| addImageFor =', addImageFor, '| nutritionOnly =', nutritionOnly);
  }, [realBarcode, addImageFor, nutritionOnly]);


  const openNativeCamera = () => {
    // Reset value so selecting the same file twice still fires onChange.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, { square: step === 'front' });
      if (dataUrl) setPreview(dataUrl);
    } finally {
      setProcessing(false);
    }
  };

  const onRetake = () => { setPreview(null); };

  const postExtract = async (body: Record<string, unknown>): Promise<{ ok: true; data: any } | { ok: false; kind: ErrorKind; msg?: string | null }> => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/extract-ingredients`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } catch (netErr) {
      console.error('[photo-capture] network', netErr);
      return { ok: false, kind: 'unexpected' };
    }
    let data: any = null;
    try { data = await res.json(); } catch {}
    if (!res.ok || !data || data.error) {
      const msg = typeof data?.message === 'string' ? data.message : null;
      let kind: ErrorKind = 'unexpected';
      if (res.status === 401 || data?.error === 'session_expired' || data?.error === 'Unauthorized') kind = 'session';
      else if (res.status === 429) kind = 'rate';
      else if (res.status === 413 || data?.error === 'image_too_large') kind = 'too_large';
      else if (res.status === 402) kind = 'payment';
      else if (data?.error === 'nutritional_table_detected') kind = 'nutritional';
      else if (data?.error === 'no_ingredients' || data?.error === 'parse_failed') kind = 'lighting';
      return { ok: false, kind, msg };
    }
    return { ok: true, data };
  };

  const finalizeAndNavigate = (nutriments?: Record<string, number> | null) => {
    if (!pendingProduct) return;
    const payload: Record<string, unknown> = {
      barcode: pendingProduct.finalBarcode,
      product_name: pendingProduct.product_name,
      brand: pendingProduct.brand,
      category: pendingProduct.category,
      category_tag: pendingProduct.category_tag,
      ingredients_text: pendingProduct.ingredients_text,
      image: pendingProduct.image,
      saved: pendingProduct.serverSaved,
      savedAt: Date.now(),
    };
    if (nutriments) payload.nutriments = nutriments;
    localStorage.setItem('maseya_photo_product', JSON.stringify(payload));
    localStorage.removeItem('maseya_photo_front');
    navigate(realBarcode ? `/result/${realBarcode}` : '/result/photo', { replace: true });
  };

  const submitNutrition = async (nutritionImage: string) => {
    setStep('analyzing-nutrition');
    // Deep-link nutrition-only mode (from result CTA): POST just the table.
    if (nutritionOnly && realBarcode) {
      const res = await postExtract({ nutrition_image: nutritionImage, barcode: realBarcode });
      if (!res.ok || res.data?.error === 'nutrition_rejected') {
        localStorage.setItem('maseya_nutrition_rejected', '1');
        navigate(`/result/${realBarcode}`, { replace: true });
        return;
      }
      navigate(`/result/${realBarcode}`, { replace: true });
      return;
    }
    // Regular flow: pendingProduct already saved server-side.
    if (!pendingProduct) return;
    const res = await postExtract({
      nutrition_image: nutritionImage,
      barcode: pendingProduct.finalBarcode && !pendingProduct.finalBarcode.startsWith('photo_')
        ? pendingProduct.finalBarcode
        : undefined,
    });
    if (!res.ok || res.data?.error === 'nutrition_rejected') {
      localStorage.setItem('maseya_nutrition_rejected', '1');
      finalizeAndNavigate();
      return;
    }
    finalizeAndNavigate((res.data?.nutriments as Record<string, number>) || null);
  };

  const onConfirm = async () => {
    if (!preview) return;

    if (step === 'nutrition-capture') {
      const img = preview;
      setPreview(null);
      await submitNutrition(img);
      return;
    }

    if (step === 'front') {
      setFrontPhoto(preview);
      localStorage.setItem('maseya_photo_front', preview);
      setPreview(null);
      if (addImageFor) {
        setStep('analyzing');
        const { error } = await supabase.from('maseya_products').update({ image_url: preview }).eq('barcode', addImageFor);
        if (error) console.error('[photo-capture] update image_url failed', error);
        setStep('image-saved');
        setTimeout(() => navigate(`/result/${addImageFor}`, { replace: true }), 900);
        return;
      }
      setStep('ingredients');
      return;
    }

    if (step === 'ingredients') {
      const ingredientsImage = preview;
      setPreview(null);
      setStep('analyzing');
      try {
        const front = frontPhoto ?? localStorage.getItem('maseya_photo_front');
        const res = await postExtract({
          front_image: front,
          ingredients_image: ingredientsImage,
          barcode: realBarcode || undefined,
        });
        if (res.ok === false) {
          setServerErrorMessage(res.msg ?? null);
          setErrorKind(res.kind);
          setStep('error');
          return;
        }

        const data = res.data;
        const product_name = (data.product_name as string) || 'Producto fotografiado';
        const brand = (data.brand as string) || '';
        const category = (data.category === 'food' ? 'food' : 'cosmetic') as 'food' | 'cosmetic';
        const ingredients_text = data.ingredients_text as string;
        const category_tag = typeof data.category_tag === 'string' && /^en:[a-z0-9-]+$/.test(data.category_tag) ? data.category_tag : null;
        const serverSaved = data.saved === true;
        const finalBarcode = realBarcode || `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const image = front;

        if (!serverSaved) {
          const saveRes = await saveToMaseya({
            barcode: finalBarcode, product_name, brand, category,
            ingredients_text, image_url: image, source: 'photo', verified: false,
          });
          if (!saveRes.ok && saveRes.error !== 'not_authenticated') {
            console.error('[photo-capture] saveToMaseya failed', saveRes.error);
          }
        }

        setPendingProduct({ finalBarcode, product_name, brand, category, category_tag, ingredients_text, image, serverSaved });

        // Offer optional nutrition step only for food with a real barcode
        // (we need it to persist the table server-side).
        if (category === 'food' && !finalBarcode.startsWith('photo_')) {
          setStep('nutrition-offer');
          return;
        }

        // Non-food or no real barcode → finalize immediately.
        localStorage.setItem('maseya_photo_product', JSON.stringify({
          barcode: finalBarcode, product_name, brand, category, category_tag,
          ingredients_text, image, saved: serverSaved, savedAt: Date.now(),
        }));
        localStorage.removeItem('maseya_photo_front');
        navigate(realBarcode ? `/result/${realBarcode}` : '/result/photo', { replace: true });
      } catch (e) {
        console.error('[photo-capture] ingredients error', e);
        setServerErrorMessage(null);
        setErrorKind('unexpected');
        setStep('error');
      }
    }
  };

  const stepNumber = addImageFor ? 1 : (step === 'front' ? 1 : 2);
  const showProgress = !nutritionOnly && (step === 'front' || step === 'ingredients');


  const goBack = () => {
    if (preview) {
      setPreview(null);
      return;
    }
    if (step === 'ingredients') { setStep('front'); return; }
    if (step === 'nutrition-capture') { setStep(nutritionOnly ? 'front' : 'nutrition-offer'); return; }
    if (step === 'nutrition-offer') { finalizeAndNavigate(); return; }

    navigate(-1);
  };


  const heading = step === 'front' ? c.front : step === 'nutrition-capture' ? c.nutrition : c.ingredients;
  const isCaptureStep = step === 'front' || step === 'ingredients' || step === 'nutrition-capture';


  return (
    <div className="min-h-[100dvh] bg-background overflow-x-hidden pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border pt-safe">
        <div className="w-full sm:max-w-lg sm:mx-auto px-2 h-14 flex items-center gap-2">
          <button
            onClick={goBack}
            aria-label={c.back}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/70"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-semibold truncate">
            {addImageFor ? c.addImageOnly : c.title}
          </h1>
        </div>
        {showProgress && !addImageFor && (
          <div className="w-full sm:max-w-lg sm:mx-auto px-4 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-primary uppercase tracking-wider">
                {c.stepOf(stepNumber)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: stepNumber === 1 ? '50%' : '100%' }}
              />
            </div>
          </div>
        )}
      </header>

      <div className="w-full sm:max-w-lg sm:mx-auto p-4 space-y-4">
        {isCaptureStep && (
          <>
            <div className="text-center space-y-1 px-2">
              <h2 className="font-display text-lg font-semibold">{heading.heading}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{heading.sub}</p>
              {(step === 'ingredients' || step === 'nutrition-capture') && (
                <p className="text-xs text-muted-foreground italic">
                  {step === 'nutrition-capture' ? c.nutrition.hint : c.ingredients.hint}
                </p>
              )}
            </div>

            <div className="relative w-full max-h-[55vh] aspect-[3/4] max-w-full rounded-3xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 border border-border flex items-center justify-center mx-auto">
              {preview ? (
                <img src={preview} alt="" className="w-full h-full max-w-full max-h-full object-contain" />
              ) : processing ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Sparkles className="w-10 h-10 animate-pulse text-primary" />
                  <p className="text-xs">{c.starting}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-3 p-8 text-center">
                  <Camera className="w-14 h-14 text-primary/70" />
                  <p className="text-xs leading-relaxed max-w-[220px]">
                    {step === 'front' ? c.front.tip : c.ingredients.hint}
                  </p>
                </div>
              )}
            </div>

            {/* Hidden native camera input — `capture="environment"` opens the
                rear camera app on mobile with full resolution, autofocus and
                flash. On desktop it falls back to a normal file picker. */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileSelected}
            />

            {preview ? (
              <div className="flex gap-3">
                <Button onClick={onRetake} variant="outline" className="flex-1 h-14 rounded-2xl">
                  <X className="w-4 h-4 mr-2" />
                  {c.retake}
                </Button>
                <Button onClick={onConfirm} className="flex-1 h-14 rounded-2xl">
                  <Check className="w-4 h-4 mr-2" />
                  {c.use}
                </Button>
              </div>
            ) : (
              <Button
                onClick={openNativeCamera}
                disabled={processing}
                className="w-full h-14 rounded-2xl"
              >
                <Camera className="w-5 h-5 mr-2" />
                {heading.cta}
              </Button>
            )}
          </>

        )}

        {(step === 'analyzing' || step === 'analyzing-nutrition') && (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="relative w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-primary animate-pulse" />
              <span className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
            <p className="text-sm font-medium">{step === 'analyzing-nutrition' ? c.analyzingNutrition : c.analyzing}</p>
            <p className="text-xs text-muted-foreground">{c.analyzingSub}</p>
          </div>
        )}

        {step === 'nutrition-offer' && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-lg font-semibold">{c.nutrition.heading}</h2>
            <p className="text-sm text-muted-foreground max-w-xs">{c.nutrition.sub}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
              <Button onClick={() => setStep('nutrition-capture')} className="h-12 rounded-2xl">
                <Camera className="w-4 h-4 mr-2" />
                {c.nutrition.capture}
              </Button>
              <Button onClick={() => finalizeAndNavigate()} variant="outline" className="h-12 rounded-2xl">
                {c.nutrition.skip}
              </Button>
            </div>
          </div>
        )}


        {step === 'image-saved' && (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-medium">{c.savedImage}</p>
          </div>
        )}

        {step === 'error' && (() => {
          const msg =
            errorKind === 'session' ? c.errorSession :
            errorKind === 'rate' ? c.errorRate :
            errorKind === 'payment' ? c.errorPayment :
            errorKind === 'too_large' ? c.errorTooLarge :
            errorKind === 'nutritional' ? (serverErrorMessage ?? c.errorNutritional) :
            errorKind === 'unexpected' ? c.errorUnexpected :
            c.error;
          return (
            <div className="py-12 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Camera className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{msg}</p>
              {errorKind === 'session' ? (
                <Button onClick={() => navigate('/login')} className="h-12 rounded-2xl px-6">
                  {c.loginCta}
                </Button>
              ) : (
                <Button onClick={() => setStep(addImageFor ? 'front' : 'ingredients')} className="h-12 rounded-2xl px-6">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {c.retry}
                </Button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Emergency exit — fixed bottom, always reachable even if the header
          gets pushed off-screen by iOS zoom/overflow. */}
      <div
        className="fixed bottom-0 inset-x-0 z-20 bg-background/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="w-full sm:max-w-lg sm:mx-auto px-4 py-3">
          <Button
            onClick={() => navigate('/scan', { replace: true })}
            variant="outline"
            className="w-full min-h-[44px] h-12 rounded-2xl"
          >
            {user.language === 'fr' ? 'Annuler' : user.language === 'en' ? 'Cancel' : 'Cancelar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCapturePage;
