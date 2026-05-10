import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Loader2, Image as ImageIcon } from 'lucide-react';
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
    tooltip: 'Apunta al código de barras de cualquier producto',
    gotIt: 'Entendido',
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
    tooltip: 'Point at the barcode of any product',
    gotIt: 'Got it',
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
    tooltip: 'Vise le code-barres de n’importe quel produit',
    gotIt: 'Compris',
  },
};

type Phase = 'scanning' | 'analyzing' | 'error';

const ScannerPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const c = COPY[user.language] ?? COPY.es;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [phase, setPhase] = useState<Phase>('scanning');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(() => {
    try { return !localStorage.getItem('maseya_scan_tip_seen'); } catch { return false; }
  });

  useEffect(() => {
    if (!showTooltip) return;
    const t = setTimeout(() => dismissTooltip(), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTooltip]);

  const dismissTooltip = () => {
    try { localStorage.setItem('maseya_scan_tip_seen', '1'); } catch {}
    setShowTooltip(false);
  };

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

  const location = useLocation();

  useEffect(() => {
    startScanning();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.pathname !== '/scan') stop();
  }, [location.pathname]);

  const handlePhoto = () => {
    stop();
    navigate('/scan/photo');
  };

  return (
    <AppLayout title={c.title}>
      <div className="px-4 py-6 space-y-6">
        <div className="relative aspect-square rounded-3xl overflow-hidden shadow-warm-lg bg-black">
          <video
            ref={videoRef}
            className={`pointer-events-none w-full h-full object-cover ${phase === 'scanning' ? 'block' : 'hidden'}`}
            playsInline
            muted
          />
          {phase === 'scanning' && (
            <>
              <div className="pointer-events-none absolute inset-8 border-2 border-white/80 rounded-2xl" />
              <div className="pointer-events-none absolute inset-x-12 top-1/2 h-0.5 bg-primary animate-pulse" />
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

          {showTooltip && phase === 'scanning' && (
            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-4 p-6 text-center animate-in fade-in">
              <div className="text-white text-3xl animate-bounce">⬇️</div>
              <p className="text-white font-medium leading-snug max-w-xs">{c.tooltip}</p>
              <Button
                onClick={dismissTooltip}
                size="sm"
                className="rounded-full bg-white text-primary hover:bg-white/90"
              >
                {c.gotIt}
              </Button>
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
