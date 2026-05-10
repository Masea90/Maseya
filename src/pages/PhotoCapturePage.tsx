import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { saveToMaseya } from '@/lib/productLookup';
import { Button } from '@/components/ui/button';

const COPY = {
  es: {
    title: 'Fotografiar ingredientes',
    cta: 'Tomar foto',
    analyzing: 'Mira está analizando los ingredientes...',
    analyzingSub: 'Esto puede tardar unos segundos',
    back: 'Volver',
    error: 'No pude leer los ingredientes. Intenta con mejor iluminación o más cerca de la etiqueta.',
    retry: 'Reintentar',
    hint: 'Centra la lista de ingredientes en la foto',
  },
  en: {
    title: 'Photograph ingredients',
    cta: 'Take photo',
    analyzing: 'Mira is analyzing the ingredients...',
    analyzingSub: 'This may take a few seconds',
    back: 'Back',
    error: "I couldn't read the ingredients. Try better lighting or get closer to the label.",
    retry: 'Try again',
    hint: 'Center the ingredient list in the photo',
  },
  fr: {
    title: 'Photographier les ingrédients',
    cta: 'Prendre la photo',
    analyzing: 'Mira analyse les ingrédients...',
    analyzingSub: 'Cela peut prendre quelques secondes',
    back: 'Retour',
    error: "Je n'ai pas pu lire les ingrédients. Essayez avec un meilleur éclairage ou plus près de l'étiquette.",
    retry: 'Réessayer',
    hint: 'Centrez la liste des ingrédients dans la photo',
  },
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const PhotoCapturePage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setAnalyzing(true);
    setError(null);
    try {
      const dataUrl = await fileToBase64(file);

      const { data, error: fnError } = await supabase.functions.invoke('extract-ingredients', {
        body: { image: dataUrl },
      });

      if (fnError || !data || data.error) {
        console.error('[photo-capture] extract failed', fnError, data);
        setError(c.error);
        setAnalyzing(false);
        return;
      }

      const product_name = data.product_name as string;
      const brand = (data.brand as string) || '';
      const category = (data.category === 'food' ? 'food' : 'cosmetic') as 'food' | 'cosmetic';
      const ingredients_text = data.ingredients_text as string;
      const synthBarcode = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await saveToMaseya({
        barcode: synthBarcode,
        product_name,
        brand,
        category,
        ingredients_text,
        image_url: null,
        source: 'photo',
        verified: false,
      });

      // Pass extracted product to /result/photo via localStorage
      localStorage.setItem('maseya_photo_product', JSON.stringify({
        barcode: synthBarcode,
        product_name,
        brand,
        category,
        ingredients_text,
        image: dataUrl,
        savedAt: Date.now(),
      }));

      navigate('/result/photo');
    } catch (e) {
      console.error('[photo-capture] error', e);
      setError(c.error);
      setAnalyzing(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void processFile(file);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="w-full sm:max-w-lg sm:mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label={c.back}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">{c.title}</h1>
        </div>
      </header>
      <div className="w-full sm:max-w-lg sm:mx-auto p-6 space-y-6">
        {analyzing ? (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="relative w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-primary animate-pulse" />
              <span className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
            <p className="text-sm font-medium">{c.analyzing}</p>
            <p className="text-xs text-muted-foreground">{c.analyzingSub}</p>
          </div>
        ) : error ? (
          <div className="py-12 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{error}</p>
            <label className="inline-flex">
              <Button asChild className="h-12 rounded-2xl px-6">
                <span className="cursor-pointer">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {c.retry}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={onPick}
                  />
                </span>
              </Button>
            </label>
          </div>
        ) : (
          <>
            <div className="aspect-square rounded-3xl bg-secondary/50 border-2 border-dashed border-primary/40 flex items-center justify-center">
              <Camera className="w-16 h-16 text-primary/60" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-muted-foreground text-center">{c.hint}</p>
            <label className="w-full h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center gap-2 font-medium cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-5 h-5" />
              {c.cta}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={onPick}
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
};

export default PhotoCapturePage;
