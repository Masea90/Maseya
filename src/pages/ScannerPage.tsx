import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';

const COPY = {
  es: {
    title: 'Escanear', aim: 'Apunta al código de barras', photo: 'Fotografiar ingredientes',
    analyzing: 'Analizando producto...', notFound: 'Producto no encontrado',
    photoCta: 'Fotografiar ingredientes', cameraError: 'No se pudo acceder a la cámara. Revisa los permisos.',
    cancel: 'Cancelar', retry: 'Reintentar', tooltip: 'Apunta al código de barras de cualquier producto',
    gotIt: 'Entendido', center: 'Mantén el código de barras centrado y quieto',
  },
  en: {
    title: 'Scan', aim: 'Point at the barcode', photo: 'Photograph ingredients',
    analyzing: 'Analyzing product...', notFound: 'Product not found',
    photoCta: 'Photograph ingredients', cameraError: 'Camera access blocked. Check permissions.',
    cancel: 'Cancel', retry: 'Retry', tooltip: 'Point at the barcode of any product',
    gotIt: 'Got it', center: 'Keep the barcode centered and still',
  },
  fr: {
    title: 'Scanner', aim: 'Vise le code-barres', photo: 'Photographier les ingrédients',
    analyzing: 'Analyse du produit...', notFound: 'Produit non trouvé',
    photoCta: 'Photographier les ingrédients', cameraError: 'Accès caméra bloqué. Vérifie les permissions.',
    cancel: 'Annuler', retry: 'Réessayer', tooltip: 'Vise le code-barres de n’importe quel produit',
    gotIt: 'Compris', center: 'Garde le code-barres centré et immobile',
  },
};

type Phase = 'scanning' | 'analyzing' | 'error';

const READER_ID = 'maseya-scanner-reader';

const ScannerPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const c = COPY[user.language] ?? COPY.es;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stoppedRef = useRef<boolean>(false);
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

  const stop = async () => {
    const inst = scannerRef.current;
    if (!inst || stoppedRef.current) return;
    stoppedRef.current = true;
    try {
      await inst.stop();
      await inst.clear();
    } catch {
      // ignore
    }
    scannerRef.current = null;
  };

  const startScanning = async () => {
    setErrorMsg('');
    setPhase('scanning');
    stoppedRef.current = false;
    try {
      const html5QrCode = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 30,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.777,
          disableFlip: false,
        },
        (decodedText) => {
          if (stoppedRef.current) return;
          stoppedRef.current = true;
          html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
          scannerRef.current = null;
          setPhase('analyzing');
          navigate(`/result/${encodeURIComponent(decodedText)}`);
        },
        () => {
          // scan errors are normal, ignore
        }
      );
    } catch (e) {
      console.error('[scanner] camera error', e);
      setErrorMsg(c.cameraError);
      setPhase('error');
    }
  };

  const location = useLocation();

  useEffect(() => {
    startScanning();
    return () => { void stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.pathname !== '/scan') void stop();
  }, [location.pathname]);

  const handlePhoto = () => {
    void stop();
    navigate('/scan/photo');
  };

  return (
    <AppLayout title={c.title}>
      <div className="px-4 py-6 space-y-6">
        <div className="relative aspect-square rounded-3xl overflow-hidden shadow-warm-lg bg-black">
          <div
            id={READER_ID}
            className={`w-full h-full ${phase === 'scanning' ? 'block' : 'hidden'} [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover`}
          />
          {phase === 'scanning' && (
            <>
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-primary/80 animate-pulse shadow-[0_0_24px_rgba(74,222,128,0.45)]" />
              <div className="pointer-events-none absolute inset-x-12 top-1/2 h-0.5 bg-primary animate-pulse" />
              <div className="pointer-events-none absolute left-0 right-0 bottom-4 px-6 text-center">
                <p className="inline-block text-white text-xs font-medium bg-black/45 rounded-full px-3 py-1.5 backdrop-blur-sm">
                  {c.center}
                </p>
              </div>
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
