import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';

const COPY = {
  es: { title: 'Fotografiar ingredientes', cta: 'Tomar foto', analyzing: 'Mira está analizando los ingredientes...', back: 'Volver' },
  en: { title: 'Photograph ingredients', cta: 'Take photo', analyzing: 'Mira is analyzing the ingredients...', back: 'Back' },
  fr: { title: 'Photographier les ingrédients', cta: 'Prendre la photo', analyzing: 'Mira analyse les ingrédients...', back: 'Retour' },
};

const PhotoCapturePage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;
  const inputRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setAnalyzing(true);
    // Phase 3: send to Mira AI. For now show placeholder and send to result-photo route.
    setTimeout(() => navigate('/result/photo'), 1200);
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
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-medium">{c.analyzing}</p>
          </div>
        ) : (
          <>
            <div className="aspect-square rounded-3xl bg-secondary/50 border-2 border-dashed border-primary/40 flex items-center justify-center">
              <Camera className="w-16 h-16 text-primary/60" strokeWidth={1.5} />
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPick}
            />
            <Button onClick={() => inputRef.current?.click()} className="w-full h-14 rounded-2xl">
              <Camera className="w-5 h-5 mr-2" /> {c.cta}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PhotoCapturePage;
