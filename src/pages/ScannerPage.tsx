import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Camera, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';

const COPY = {
  es: {
    title: 'Escanear',
    aim: 'Apunta al código de barras',
    photo: 'Fotografiar ingredientes',
    analyzing: 'Analizando producto...',
    notFound: 'Producto no encontrado',
    photoCta: 'Fotografiar ingredientes',
    cameraError: 'No se pudo acceder a la cámara. Revisa los permisos.',
    cancel: 'Cancelar',
    retry: 'Reintentar',
  },
  en: {
    title: 'Scan',
    aim: 'Point at the barcode',
    photo: 'Photograph ingredients',
    analyzing: 'Analyzing product...',
    notFound: 'Product not found',
    photoCta: 'Photograph ingredients',
    cameraError: 'Camera access blocked. Check permissions.',
    cancel: 'Cancel',
    retry: 'Retry',
  },
  fr: {
    title: 'Scanner',
    aim: 'Vise le code-barres',
    photo: 'Photographier les ingrédients',
    analyzing: 'Analyse du produit...',
    notFound: 'Produit non trouvé',
    photoCta: 'Photographier les ingrédients',
    cameraError: 'Accès caméra bloqué. Vérifie les permissions.',
    cancel: 'Annuler',
    retry: 'Réessayer',
  },
};

type Phase = 'idle' | 'scanning' | 'analyzing' | 'notfound' | 'error';

const ScannerPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const c = COPY[user.language] ?? COPY.es;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  };

  const startScanning = async () => {
    setErrorMsg('');
    setPhase('scanning');
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, _err, ctrl) => {
          if (result) {
            const code = result.getText();
            ctrl.stop();
            controlsRef.current = null;
            setPhase('analyzing');
            navigate(`/result/${encodeURIComponent(code)}`);
          }
        }
      );
      controlsRef.current = controls;
    } catch (e) {
      console.error('[scanner] camera error', e);
      setErrorMsg(c.cameraError);
      setPhase('error');
    }
  };

  useEffect(() => {
    return () => stop();
  }, []);

  const handlePhoto = () => {
    stop();
    navigate('/scan/photo');
  };

  return (
    <AppLayout title={c.title}>
      <div className="px-4 py-6 space-y-6">
        <div className="relative aspect-square rounded-3xl overflow-hidden shadow-warm-lg bg-black">
          {phase === 'idle' && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center">
              <button
                onClick={startScanning}
                className="bg-white/15 backdrop-blur rounded-2xl px-6 py-4 text-white flex items-center gap-2 font-medium hover:bg-white/25 transition-colors"
              >
                <Camera className="w-5 h-5" /> Activar cámara
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${phase === 'scanning' ? 'block' : 'hidden'}`}
            playsInline
            muted
          />
          {phase === 'scanning' && (
            <>
              <div className="pointer-events-none absolute inset-8 border-2 border-white/80 rounded-2xl" />
              <div className="pointer-events-none absolute inset-x-12 top-1/2 h-0.5 bg-primary animate-pulse" />
              <button
                onClick={() => { stop(); setPhase('idle'); }}
                className="absolute top-3 right-3 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white"
                aria-label={c.cancel}
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}

          {phase === 'analyzing' && (
            <div className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-medium">{c.analyzing}</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="absolute inset-0 bg-background flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-destructive">{errorMsg}</p>
              <Button onClick={startScanning}>{c.retry}</Button>
            </div>
          )}
        </div>

        <p className="text-center text-muted-foreground text-sm">{c.aim}</p>

        <button
          onClick={handlePhoto}
          className="w-full h-14 rounded-2xl bg-card border border-border flex items-center justify-center gap-3 font-medium hover:bg-muted transition-colors"
        >
          <ImageIcon className="w-5 h-5 text-primary" />
          {c.photo}
        </button>
      </div>
    </AppLayout>
  );
};

export default ScannerPage;
