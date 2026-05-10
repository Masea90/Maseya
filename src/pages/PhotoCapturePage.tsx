import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, ArrowLeft, Sparkles, RefreshCw, Check } from 'lucide-react';
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
      sub: 'Fotografía la parte delantera del producto para identificarlo',
      tip: 'Incluye el nombre y la marca',
      cta: 'Tomar foto del frontal',
    },
    ingredients: {
      heading: 'Fotografía los ingredientes',
      sub: 'Ahora fotografía la lista de ingredientes (parte trasera o lateral del producto)',
      hint: "Busca el texto que empieza por «Ingredients:» o «Ingredientes:»",
      tipsTitle: '💡 Consejos:',
      tips: ['Buena iluminación', 'Texto bien enfocado', 'Incluye toda la lista'],
      cta: 'Tomar foto de ingredientes',
    },
    analyzing: 'Mira está analizando los ingredientes...',
    analyzingSub: 'Esto puede tardar unos segundos',
    error: 'No pude leer los ingredientes. Intenta con mejor iluminación o más cerca de la etiqueta.',
    retry: 'Reintentar',
    addImageOnly: 'Añadir foto del producto',
    savedImage: '¡Gracias! Imagen añadida.',
  },
  en: {
    title: 'Add product',
    back: 'Back',
    stepOf: (n: number) => `Step ${n} of 2`,
    front: {
      heading: 'Photograph the product front',
      sub: 'Photograph the front of the product to identify it',
      tip: 'Include the name and brand',
      cta: 'Take front photo',
    },
    ingredients: {
      heading: 'Photograph the ingredients',
      sub: 'Now photograph the ingredient list (back or side of the product)',
      hint: 'Look for text starting with "Ingredients:"',
      tipsTitle: '💡 Tips:',
      tips: ['Good lighting', 'Text well focused', 'Include the whole list'],
      cta: 'Take ingredients photo',
    },
    analyzing: 'Mira is analyzing the ingredients...',
    analyzingSub: 'This may take a few seconds',
    error: "I couldn't read the ingredients. Try better lighting or get closer to the label.",
    retry: 'Try again',
    addImageOnly: 'Add product photo',
    savedImage: 'Thanks! Image added.',
  },
  fr: {
    title: 'Ajouter un produit',
    back: 'Retour',
    stepOf: (n: number) => `Étape ${n} sur 2`,
    front: {
      heading: 'Photographiez le devant du produit',
      sub: "Photographiez l'avant du produit pour l'identifier",
      tip: 'Incluez le nom et la marque',
      cta: 'Photo du devant',
    },
    ingredients: {
      heading: 'Photographiez les ingrédients',
      sub: "Photographiez maintenant la liste d'ingrédients (arrière ou côté du produit)",
      hint: 'Cherchez le texte commençant par « Ingredients » ou « Ingrédients »',
      tipsTitle: '💡 Conseils :',
      tips: ['Bon éclairage', 'Texte bien net', 'Incluez toute la liste'],
      cta: 'Photo des ingrédients',
    },
    analyzing: 'Mira analyse les ingrédients...',
    analyzingSub: 'Cela peut prendre quelques secondes',
    error: "Je n'ai pas pu lire les ingrédients. Essayez avec un meilleur éclairage.",
    retry: 'Réessayer',
    addImageOnly: 'Ajouter une photo du produit',
    savedImage: 'Merci ! Image ajoutée.',
  },
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

type Step = 'front' | 'ingredients' | 'analyzing' | 'error' | 'image-saved';

const PhotoCapturePage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const addImageFor = searchParams.get('addImageFor'); // existing barcode needing only an image
  const c = COPY[user.language] ?? COPY.es;

  const [step, setStep] = useState<Step>('front');
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);

  const handleFrontPhoto = async (file: File) => {
    try {
      const dataUrl = await fileToBase64(file);
      setFrontPhoto(dataUrl);
      localStorage.setItem('maseya_photo_front', dataUrl);

      // If we're only adding an image to an existing product, save and return.
      if (addImageFor) {
        setStep('analyzing');
        const { error } = await supabase
          .from('maseya_products')
          .update({ image_url: dataUrl })
          .eq('barcode', addImageFor);
        if (error) console.error('[photo-capture] update image_url failed', error);
        setStep('image-saved');
        setTimeout(() => navigate(`/result/${addImageFor}`), 900);
        return;
      }

      setStep('ingredients');
    } catch (e) {
      console.error('[photo-capture] front photo error', e);
      setStep('error');
    }
  };

  const handleIngredientsPhoto = async (file: File) => {
    setStep('analyzing');
    try {
      const dataUrl = await fileToBase64(file);
      const front = frontPhoto ?? localStorage.getItem('maseya_photo_front');

      const { data, error: fnError } = await supabase.functions.invoke('extract-ingredients', {
        body: { front_image: front, ingredients_image: dataUrl },
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
      const synthBarcode = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const image = frontPhoto ?? localStorage.getItem('maseya_photo_front');

      await saveToMaseya({
        barcode: synthBarcode,
        product_name,
        brand,
        category,
        ingredients_text,
        image_url: image,
        source: 'photo',
        verified: false,
      });

      localStorage.setItem('maseya_photo_product', JSON.stringify({
        barcode: synthBarcode,
        product_name,
        brand,
        category,
        ingredients_text,
        image,
        savedAt: Date.now(),
      }));
      localStorage.removeItem('maseya_photo_front');

      navigate('/result/photo');
    } catch (e) {
      console.error('[photo-capture] ingredients error', e);
      setStep('error');
    }
  };

  const onPickFront = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFrontPhoto(f);
  };
  const onPickIngredients = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleIngredientsPhoto(f);
  };

  const cameraInputProps = (onChange: React.ChangeEventHandler<HTMLInputElement>): Record<string, unknown> => ({
    type: 'file',
    accept: 'image/*',
    capture: 'environment',
    camera: 'environment',
    className: 'sr-only',
    onChange,
  });

  const stepNumber = addImageFor ? 1 : (step === 'front' ? 1 : 2);
  const showProgress = step === 'front' || step === 'ingredients';

  const goBack = () => {
    if (step === 'ingredients') {
      setStep('front');
      return;
    }
    navigate(-1);
  };

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

      <div className="w-full sm:max-w-lg sm:mx-auto p-6 space-y-6">
        {step === 'front' && (
          <>
            <div className="aspect-square rounded-3xl bg-secondary/50 border-2 border-dashed border-primary/40 flex items-center justify-center">
              <Camera className="w-16 h-16 text-primary/60" strokeWidth={1.5} />
            </div>
            <div className="text-center space-y-2">
              <h2 className="font-display text-lg font-semibold">{c.front.heading}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.front.sub}</p>
              <p className="text-xs text-primary font-medium">💡 {c.front.tip}</p>
            </div>
            <label className="w-full h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center gap-2 font-medium cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-5 h-5" />
              {c.front.cta}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPickFront} />
            </label>
          </>
        )}

        {step === 'ingredients' && (
          <>
            {frontPhoto && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/20">
                <img src={frontPhoto} alt="" className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 text-xs">
                  <p className="font-medium text-primary flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Frontal capturado
                  </p>
                  <p className="text-muted-foreground">Ahora la lista de ingredientes</p>
                </div>
              </div>
            )}
            <div className="aspect-square rounded-3xl bg-secondary/50 border-2 border-dashed border-primary/40 flex items-center justify-center">
              <Camera className="w-16 h-16 text-primary/60" strokeWidth={1.5} />
            </div>
            <div className="text-center space-y-2">
              <h2 className="font-display text-lg font-semibold">{c.ingredients.heading}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.ingredients.sub}</p>
              <p className="text-xs text-muted-foreground italic">{c.ingredients.hint}</p>
            </div>
            <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 space-y-1">
              <p className="text-xs font-semibold text-primary">{c.ingredients.tipsTitle}</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-1">
                {c.ingredients.tips.map(t => <li key={t}>• {t}</li>)}
              </ul>
            </div>
            <label className="w-full h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center gap-2 font-medium cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-5 h-5" />
              {c.ingredients.cta}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPickIngredients} />
            </label>
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
