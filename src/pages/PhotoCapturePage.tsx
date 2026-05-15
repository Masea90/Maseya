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
    retry: 'Réessayer',
    addImageOnly: 'Ajouter une photo',
    savedImage: 'Merci ! Image ajoutée.',
    cameraDenied: "Nous n'avons pas accès à la caméra. Activez-la dans les paramètres.",
    retake: 'Reprendre',
    use: 'Utiliser',
    starting: 'Démarrage de la caméra...',
  },
};

type Step = 'front' | 'ingredients' | 'analyzing' | 'error' | 'image-saved';

const PhotoCapturePage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const addImageFor = searchParams.get('addImageFor');
  const realBarcode = searchParams.get('barcode');
  const c = COPY[user.language] ?? COPY.es;

  const [step, setStep] = useState<Step>('front');
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

  const captureFrame = (): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const onCapture = () => {
    const dataUrl = captureFrame();
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
        const { data, error: fnError } = await supabase.functions.invoke('extract-ingredients', {
          body: { front_image: front, ingredients_image: ingredientsImage },
        });
        if (fnError || !data || data.error) {
          console.error('[photo-capture] extract failed', fnError, data);
          setStep('error');
          return;
        }
        const product_name = (data.product_name as string) || 'Producto fotografiado';
        const brand = (data.brand as string) || '';
        const category = (data.category === 'food' ? 'food' : 'cosmetic') as 'food' | 'cosmetic';
        const ingredients_text = data.ingredients_text as string;
        const finalBarcode = realBarcode || `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const image = front;

        console.log('[photo-capture] realBarcode param =', realBarcode);
        console.log('[photo-capture] saving to maseya_products with barcode =', finalBarcode);

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
          console.error('[photo-capture] saveToMaseya failed', result.error);
        } else {
          console.log('[photo-capture] saveToMaseya OK for', finalBarcode);
        }

        localStorage.setItem('maseya_photo_product', JSON.stringify({
          barcode: finalBarcode,
          product_name,
          brand,
          category,
          ingredients_text,
          image,
          savedAt: Date.now(),
        }));
        localStorage.removeItem('maseya_photo_front');

        navigate(realBarcode ? `/result/${realBarcode}` : '/result/photo');
      } catch (e) {
        console.error('[photo-capture] ingredients error', e);
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

        {step === 'error' && (
          <div className="py-12 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{c.error}</p>
            <Button onClick={() => setStep(addImageFor ? 'front' : 'ingredients')} className="h-12 rounded-2xl px-6">
              <RefreshCw className="w-4 h-4 mr-2" />
              {c.retry}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoCapturePage;
