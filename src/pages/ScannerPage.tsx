import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarcodeFormat, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { InstallPrompt } from '@/components/InstallPrompt';

const COPY = {
  es: {
    title: 'Escanear', photo: 'Fotografiar ingredientes',
    analyzing: 'Analizando producto...', notFound: 'Producto no encontrado',
    photoCta: 'Fotografiar ingredientes', cameraError: 'No se pudo acceder a la cámara. Revisa los permisos.',
    cancel: 'Cancelar', retry: 'Reintentar', tooltip: 'Apunta al código de barras de cualquier producto',
    gotIt: 'Entendido', center: 'Alinea el código dentro del marco',
  },
  en: {
    title: 'Scan', photo: 'Photograph ingredients',
    analyzing: 'Analyzing product...', notFound: 'Product not found',
    photoCta: 'Photograph ingredients', cameraError: 'Camera access blocked. Check permissions.',
    cancel: 'Cancel', retry: 'Retry', tooltip: 'Point at the barcode of any product',
    gotIt: 'Got it', center: 'Keep the barcode centered and still',
  },
  fr: {
    title: 'Scanner', photo: 'Photographier les ingrédients',
    analyzing: 'Analyse du produit...', notFound: 'Produit non trouvé',
    photoCta: 'Photographier les ingrédients', cameraError: 'Accès caméra bloqué. Vérifie les permissions.',
    cancel: 'Annuler', retry: 'Réessayer', tooltip: 'Vise le code-barres de n’importe quel produit',
    gotIt: 'Compris', center: 'Garde le code-barres centré et immobile',
  },
};

type Phase = 'scanning' | 'analyzing' | 'error';

const POSSIBLE_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
];

type ExtendedMediaTrackCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: { min?: number; max?: number; step?: number } | number;
};

type ExtendedMediaTrackConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string;
  zoom?: number;
};

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
const NativeBarcodeDetector: BarcodeDetectorCtor | undefined =
  typeof window !== 'undefined'
    ? (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    : undefined;


const getCameraConstraints = (): MediaStreamConstraints => ({
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: false,
});

const getScanHints = () => {
  const hints = new Map<DecodeHintType, boolean | BarcodeFormat[]>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, POSSIBLE_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
};

const buildAdvancedConstraints = (capabilities: ExtendedMediaTrackCapabilities) => {
  const advanced: ExtendedMediaTrackConstraintSet[] = [];

  if (capabilities.focusMode?.includes('continuous')) {
    advanced.push({ focusMode: 'continuous' });
  }

  if (typeof capabilities.zoom === 'object') {
    const min = capabilities.zoom.min ?? 1;
    const max = capabilities.zoom.max ?? min;
    const targetZoom = Math.min(Math.max(2, min), max);
    if (targetZoom > min) advanced.push({ zoom: targetZoom });
  }

  return advanced.length ? { advanced } : null;
};

const ScannerPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const c = COPY[user.language] ?? COPY.es;

  const controlsRef = useRef<IScannerControls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    try { controlsRef.current?.stop(); } catch {}
    controlsRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (zxingRotateTimerRef.current !== null) {
      clearInterval(zxingRotateTimerRef.current);
      zxingRotateTimerRef.current = null;
    }
    nativeStreamRef.current?.getTracks().forEach((t) => t.stop());
    nativeStreamRef.current = null;
  };

  const improveVideoTrack = async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks()[0];
    if (!track?.getCapabilities) return;

    try {
      const constraints = buildAdvancedConstraints(track.getCapabilities() as ExtendedMediaTrackCapabilities);
      if (constraints) await track.applyConstraints(constraints);
    } catch (e) {
      console.warn('[scanner] advanced camera constraints not supported', e);
    }
  };

  const rafRef = useRef<number | null>(null);
  const nativeStreamRef = useRef<MediaStream | null>(null);
  const zxingRotateTimerRef = useRef<number | null>(null);

  const onDecoded = (decodedText: string) => {
    if (!decodedText || stoppedRef.current) return;
    stoppedRef.current = true;
    try { controlsRef.current?.stop(); } catch {}
    controlsRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    nativeStreamRef.current?.getTracks().forEach((t) => t.stop());
    nativeStreamRef.current = null;
    // Out-of-scope prefixes: 978/979 = books (ISBN), 977 = press (ISSN).
    // ResultPage also handles this, but short-circuiting here avoids the
    // network round-trip and a jarring "not found" flash.
    setPhase('analyzing');
    navigate(`/result/${encodeURIComponent(decodedText)}`);
  };

  const startNative = async (detector: BarcodeDetectorLike) => {
    const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints());
    nativeStreamRef.current = stream;
    const video = videoRef.current;
    if (!video) throw new Error('video element missing');
    video.srcObject = stream;
    await video.play().catch(() => {});
    await improveVideoTrack();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d unsupported');

    let lastTick = 0;
    const tick = async (now: number) => {
      if (stoppedRef.current) return;
      if (now - lastTick >= 120 && video.videoWidth > 0) {
        lastTick = now;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        try {
          const codes = await detector.detect(canvas);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            onDecoded(codes[0].rawValue);
            return;
          }
        } catch {
          // ignore transient detection errors
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const startZxingWithRotation = async () => {
    const codeReader = new BrowserMultiFormatReader(getScanHints(), {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 250,
    });

    const controls = await codeReader.decodeFromConstraints(
      getCameraConstraints(),
      videoRef.current ?? undefined,
      (result) => {
        if (!result) return;
        const decodedText = result.getText();
        onDecoded(decodedText);
      }
    );
    controlsRef.current = controls;
    await improveVideoTrack();

    // Rotation fallback: after ~2s without success, try decoding rotated frames
    // so vertical/skewed barcodes can be caught on iOS Safari (no BarcodeDetector).
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tryRotated = async () => {
      if (stoppedRef.current || !video || !ctx || video.videoWidth === 0) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      // Rotate 90°: swap width/height
      canvas.width = h;
      canvas.height = w;
      ctx.save();
      ctx.translate(h / 2, w / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(video, -w / 2, -h / 2, w, h);
      ctx.restore();
      try {
        const result = await codeReader.decodeFromCanvas(canvas);
        if (result?.getText()) {
          onDecoded(result.getText());
        }
      } catch {
        // no code in rotated frame — keep trying
      }
    };
    zxingRotateTimerRef.current = window.setInterval(() => {
      if (stoppedRef.current) return;
      void tryRotated();
    }, 700) as unknown as number;
    // Delay the first rotated attempt ~2s to let the horizontal path try first.
    window.setTimeout(() => { void tryRotated(); }, 2000);
  };

  const startScanning = async () => {
    setErrorMsg('');
    setPhase('scanning');
    stoppedRef.current = false;
    try {
      if (NativeBarcodeDetector) {
        try {
          const detector = new NativeBarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
          });
          await startNative(detector);
          return;
        } catch (e) {
          console.warn('[scanner] native BarcodeDetector failed, falling back to zxing', e);
        }
      }
      await startZxingWithRotation();
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
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${phase === 'scanning' ? 'block' : 'hidden'}`}
            playsInline
            muted
            autoPlay
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

        

        <button
          onClick={handlePhoto}
          className="w-full h-14 rounded-2xl bg-card border border-border flex items-center justify-center gap-3 font-medium hover:bg-muted transition-colors"
        >
          <ImageIcon className="w-5 h-5 text-primary" />
          {c.photo}
        </button>

        <InstallPrompt />
      </div>
    </AppLayout>
  );
};

export default ScannerPage;
