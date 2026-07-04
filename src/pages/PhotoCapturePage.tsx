import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, ArrowLeft, Sparkles, RefreshCw, Check, X } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { saveToMaseya } from '@/lib/productLookup';
import { Button } from '@/components/ui/button';

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
    analyzing: 'Mira está analizando los ingredientes...',
    analyzingSub: 'Esto puede tardar unos segundos',
    error: 'No pude leer los ingredientes. Intenta con mejor iluminación o más cerca de la etiqueta.',
    errorSession: 'Inicia sesión para analizar productos por foto',
    errorRate: 'Demasiadas peticiones, espera un momento y reintenta',
    errorPayment: 'Servicio de análisis temporalmente no disponible',
    errorUnexpected: 'Error inesperado. Reintenta en unos segundos',
    errorNutritional: 'Parece que fotografiaste la tabla nutricional. Fotografía la lista de ingredientes.',
    errorTooLarge: 'La foto es demasiado grande. Reintenta acercándote al producto.',
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
    analyzing: 'Mira is analyzing the ingredients...',
    analyzingSub: 'This may take a few seconds',
    error: "I couldn't read the ingredients. Try better lighting or get closer.",
    errorSession: 'Log in to analyze products by photo',
    errorRate: 'Too many requests, wait a moment and try again',
    errorPayment: 'Analysis service temporarily unavailable',
    errorUnexpected: 'Unexpected error. Try again in a few seconds',
    errorNutritional: 'Looks like you photographed the nutrition table. Photograph the ingredient list instead.',
    errorTooLarge: 'Photo is too large. Try getting closer to the product.',
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
    analyzing: 'Mira analyse les ingrédients...',
    analyzingSub: 'Cela peut prendre quelques secondes',
    error: "Je n'ai pas pu lire les ingrédients. Essayez avec un meilleur éclairage.",
    errorSession: 'Connectez-vous pour analyser les produits par photo',
    errorRate: 'Trop de requêtes, attendez un moment puis réessayez',
    errorPayment: "Service d'analyse temporairement indisponible",
    errorUnexpected: 'Erreur inattendue. Réessayez dans quelques secondes',
    errorNutritional: "Il semble que vous ayez photographié le tableau nutritionnel. Photographiez la liste d'ingrédients.",
    errorTooLarge: 'La photo est trop grande. Essayez de vous rapprocher du produit.',
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
type Step = 'front' | 'ingredients' | 'analyzing' | 'error' | 'image-saved';

const PhotoCapturePage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const addImageFor = searchParams.get('addImageFor');
  const realBarcode = searchParams.get('barcode');
  const c = COPY[user.language] ?? COPY.es;

  const [step, setStep] = useState<Step>('front');
  const [errorKind, setErrorKind] = useState<ErrorKind>('lighting');
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null); // freshly captured, awaiting confirm
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setCameraReady(false);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' } },
          audio: false,
        });
      } catch (e) {
        console.warn('[camera] exact environment failed, trying loose', e);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (e) {
      console.error('[camera] getUserMedia failed', e);
      setCameraError(c.cameraDenied);
    }
  }, [c.cameraDenied, stopCamera]);

  // Debug: log realBarcode on mount to verify URL param is passed correctly
  useEffect(() => {
    console.log('[photo-capture] mount — realBarcode URL param =', realBarcode, '| addImageFor =', addImageFor);
  }, [realBarcode, addImageFor]);

  // Start camera when entering a capture step (and no preview pending)
  useEffect(() => {
    const isCaptureStep = (step === 'front' || step === 'ingredients') && !preview;
    if (isCaptureStep) void startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, preview]);

  const captureFrame = async (): Promise<string | null> => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = v.videoWidth;
    srcCanvas.height = v.videoHeight;
    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) return null;
    srcCtx.drawImage(v, 0, 0);

    // Downscale: longest side max 1600px, JPEG quality 0.8 → keeps payload
    // well under the 5MB edge-function limit and speeds up upload/analysis.
    const MAX_SIDE = 1600;
    const longest = Math.max(srcCanvas.width, srcCanvas.height);
    const scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1;
    const outW = Math.round(srcCanvas.width * scale);
    const outH = Math.round(srcCanvas.height * scale);
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return null;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(srcCanvas, 0, 0, outW, outH);
    return outCanvas.toDataURL('image/jpeg', 0.8);
  };

  const onCapture = async () => {
    const dataUrl = await captureFrame();
    if (!dataUrl) return;
    setPreview(dataUrl);
    stopCamera();
  };

  const onRetake = () => {
    setPreview(null);
  };

  const onConfirm = async () => {
    if (!preview) return;
    if (step === 'front') {
      setFrontPhoto(preview);
      localStorage.setItem('maseya_photo_front', preview);
      setPreview(null);

      if (addImageFor) {
        setStep('analyzing');
        const { error } = await supabase
          .from('maseya_products')
          .update({ image_url: preview })
          .eq('barcode', addImageFor);
        if (error) console.error('[photo-capture] update image_url failed', error);
        setStep('image-saved');
        setTimeout(() => navigate(`/result/${addImageFor}`), 900);
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
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/extract-ingredients`;
        let res: Response;
        try {
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              front_image: front,
              ingredients_image: ingredientsImage,
              barcode: realBarcode || undefined,
            }),
          });
        } catch (netErr) {
          console.error('[photo-capture] extract failed', 'network', netErr);
          setServerErrorMessage(null);
          setErrorKind('unexpected');
          setStep('error');
          return;
        }
        let data: any = null;
        try { data = await res.json(); } catch {}
        if (!res.ok || !data || data.error) {
          console.error('[photo-capture] extract failed', res.status, data);
          setServerErrorMessage(typeof data?.message === 'string' ? data.message : null);
          if (res.status === 401 || data?.error === 'session_expired' || data?.error === 'Unauthorized') setErrorKind('session');
          else if (res.status === 429) setErrorKind('rate');
          else if (res.status === 413 || data?.error === 'image_too_large') setErrorKind('too_large');
          else if (res.status === 402) setErrorKind('payment');
          else if (data?.error === 'nutritional_table_detected') setErrorKind('nutritional');
          else if (data?.error === 'no_ingredients' || data?.error === 'parse_failed') setErrorKind('lighting');
          else setErrorKind('unexpected');
          setStep('error');
          return;
        }
        const product_name = (data.product_name as string) || 'Producto fotografiado';
        const brand = (data.brand as string) || '';
        const category = (data.category === 'food' ? 'food' : 'cosmetic') as 'food' | 'cosmetic';
        const ingredients_text = data.ingredients_text as string;
        const category_tag = typeof data.category_tag === 'string' && /^en:[a-z0-9-]+$/.test(data.category_tag)
          ? data.category_tag
          : null;
        const serverSaved = data.saved === true;
        const finalBarcode = realBarcode || `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const image = front;

        console.log('[photo-capture] realBarcode param =', realBarcode, '| server saved =', serverSaved);

        // Fallback client-side save only if the server didn't persist it.
        if (!serverSaved) {
          const result = await saveToMaseya({
            barcode: finalBarcode,
            product_name,
            brand,
            category,
            ingredients_text,
            image_url: image,
            source: 'photo',
            verified: false,
          });
          if (!result.ok) {
            if (result.error === 'not_authenticated') {
              console.info('[photo-capture] saveToMaseya skipped: user not authenticated. Product kept locally; will be contributable after sign-up.');
            } else {
              console.error('[photo-capture] saveToMaseya failed', result.error);
            }
          } else {
            console.log('[photo-capture] saveToMaseya (client fallback) OK for', finalBarcode);
          }
        }

        localStorage.setItem('maseya_photo_product', JSON.stringify({
          barcode: finalBarcode,
          product_name,
          brand,
          category,
          category_tag,
          ingredients_text,
          image,
          saved: serverSaved,
          savedAt: Date.now(),
        }));
        localStorage.removeItem('maseya_photo_front');


        navigate(realBarcode ? `/result/${realBarcode}` : '/result/photo');
      } catch (e) {
        console.error('[photo-capture] ingredients error', e);
        setServerErrorMessage(null);
        setErrorKind('unexpected');
        setStep('error');
      }
    }
  };

  const stepNumber = addImageFor ? 1 : (step === 'front' ? 1 : 2);
  const showProgress = step === 'front' || step === 'ingredients';

  const goBack = () => {
    if (preview) {
      setPreview(null);
      return;
    }
    if (step === 'ingredients') {
      setStep('front');
      return;
    }
    stopCamera();
    navigate(-1);
  };

  const heading = step === 'front' ? c.front : c.ingredients;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="w-full sm:max-w-lg sm:mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={goBack} aria-label={c.back}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">
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
        {(step === 'front' || step === 'ingredients') && (
          <>
            <div className="text-center space-y-1 px-2">
              <h2 className="font-display text-lg font-semibold">{heading.heading}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{heading.sub}</p>
              {step === 'ingredients' && (
                <p className="text-xs text-muted-foreground italic">{c.ingredients.hint}</p>
              )}
            </div>

            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-black border border-border">
              {preview ? (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                  {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2">
                      <Camera className="w-10 h-10 animate-pulse" />
                      <p className="text-xs">{c.starting}</p>
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center gap-3 bg-black/70">
                      <Camera className="w-10 h-10 text-destructive" />
                      <p className="text-sm">{cameraError}</p>
                      <Button onClick={() => void startCamera()} variant="secondary" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {c.retry}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

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
                onClick={onCapture}
                disabled={!cameraReady}
                className="w-full h-14 rounded-2xl"
              >
                <Camera className="w-5 h-5 mr-2" />
                {heading.cta}
              </Button>
            )}
          </>
        )}

        {step === 'analyzing' && (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="relative w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-primary animate-pulse" />
              <span className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
            <p className="text-sm font-medium">{c.analyzing}</p>
            <p className="text-xs text-muted-foreground">{c.analyzingSub}</p>
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
    </div>
  );
};

export default PhotoCapturePage;
