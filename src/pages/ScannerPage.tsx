import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarcodeFormat, BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import { Loader2, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { InstallPrompt } from '@/components/InstallPrompt';
import { track } from '@/lib/analytics';

const COPY = {
  es: {
    title: 'Escanear',
    analyzing: 'Analizando producto...', notFound: 'Producto no encontrado',
    cameraError: 'No se pudo iniciar la cámara. Revisa los permisos e inténtalo de nuevo.',
    cancel: 'Cancelar', retry: 'Reintentar', tooltip: 'Apunta al código de barras de cualquier producto',
    gotIt: 'Entendido', center: 'Alinea el código dentro del marco',
    privacy: 'Usamos la cámara solo para leer el código de barras. No guardamos ninguna imagen.',
    flip: 'Girar cámara',
  },
  en: {
    title: 'Scan',
    analyzing: 'Analyzing product...', notFound: 'Product not found',
    cameraError: 'The camera could not start. Check permissions and try again.',
    cancel: 'Cancel', retry: 'Retry', tooltip: 'Point at the barcode of any product',
    gotIt: 'Got it', center: 'Keep the barcode centered and still',
    privacy: 'We use the camera only to read the barcode. We never store any image.',
    flip: 'Flip camera',
  },
  fr: {
    title: 'Scanner',
    analyzing: 'Analyse du produit...', notFound: 'Produit non trouvé',
    cameraError: "La caméra n'a pas pu démarrer. Vérifie les permissions et réessaie.",
    cancel: 'Annuler', retry: 'Réessayer', tooltip: 'Vise le code-barres de n’importe quel produit',
    gotIt: 'Compris', center: 'Garde le code-barres centré et immobile',
    privacy: "Nous utilisons la caméra uniquement pour lire le code-barres. Aucune image n'est conservée.",
    flip: 'Changer de caméra',
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

const REAR_LABEL = /back|rear|trasera|posterior|environment|arrière|arriere/i;
const FRONT_LABEL = /front|user|frontal|selfie|avant/i;

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

/**
 * What camera did we actually get?
 *   'environment' → rear, 'user' → front, 'unknown' → cannot tell (desktop).
 * Android Chrome labels look like "camera2 0, facing back"; iOS Safari
 * reports facingMode but sometimes only after the track goes live.
 */
const streamFacing = (stream: MediaStream): 'environment' | 'user' | 'unknown' => {
  const track = stream.getVideoTracks()[0];
  if (!track) return 'unknown';
  const settings = (track.getSettings?.() ?? {}) as MediaTrackSettings & { facingMode?: string };
  if (settings.facingMode === 'environment' || settings.facingMode === 'user') return settings.facingMode;
  const label = track.label || '';
  if (label) {
    if (FRONT_LABEL.test(label)) return 'user';
    if (REAR_LABEL.test(label)) return 'environment';
  }
  return 'unknown';
};

const describeStream = (stream: MediaStream | null) => {
  const track = stream?.getVideoTracks()[0];
  if (!track) return { label: '(no track)', facing: 'unknown', deviceId: '' };
  const settings = (track.getSettings?.() ?? {}) as MediaTrackSettings & { facingMode?: string };
  return {
    label: track.label || '(unlabelled)',
    facing: streamFacing(stream),
    reported: settings.facingMode ?? '(none)',
    deviceId: settings.deviceId ?? '',
  };
};

/** Unknown (desktop webcams don't report facingMode) counts as acceptable. */
const isRearStream = (stream: MediaStream) => streamFacing(stream) !== 'user';

/**
 * First REAR camera reported by the device.
 * Android phones expose several rear lenses (wide, tele, macro); the first
 * "back" entry is the main one, which is what a barcode scanner wants.
 */
const findRearDeviceId = async (currentDeviceId?: string): Promise<string | null> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === 'videoinput');
    console.info('[scanner] cameras', cams.map((d) => ({ id: d.deviceId.slice(0, 8), label: d.label })));
    const rears = cams.filter((d) => REAR_LABEL.test(d.label) && !FRONT_LABEL.test(d.label));
    const pick = rears.find((d) => d.deviceId !== currentDeviceId) ?? rears[0];
    if (pick) return pick.deviceId;
    // No labels (permission granted but labels hidden) → last entry is the
    // rear camera on most Android devices when more than one is present.
    const other = cams.filter((d) => d.deviceId !== currentDeviceId);
    if (cams.length > 1 && other.length) return other[other.length - 1].deviceId;
    return null;
  } catch (e) {
    console.warn('[scanner] enumerateDevices failed', e);
    return null;
  }
};


/** Same barcode re-detected within this window right after returning: ignore. */
const RESCAN_COOLDOWN_MS = 4000;
const LAST_DECODE_KEY = 'maseya_last_decode';

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((t) => t.stop());
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
  const facingRef = useRef<'environment' | 'user'>('environment');
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

  const rafRef = useRef<number | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const zxingRotateTimerRef = useRef<number | null>(null);
  // Last barcode opened from this scanner (survives the round-trip to /result).
  const lastDecodedRef = useRef<string | null>(null);
  const lastDecodedAtRef = useRef<number>(0);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_DECODE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { code?: string; at?: number };
      lastDecodedRef.current = parsed.code ?? null;
      lastDecodedAtRef.current = parsed.at ?? 0;
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    stopStream(activeStreamRef.current);
    activeStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const improveVideoTrack = async () => {
    const stream = activeStreamRef.current;
    const track = stream?.getVideoTracks()[0];
    if (!track?.getCapabilities) return;

    try {
      const constraints = buildAdvancedConstraints(track.getCapabilities() as ExtendedMediaTrackCapabilities);
      if (constraints) await track.applyConstraints(constraints);
    } catch (e) {
      console.warn('[scanner] advanced camera constraints not supported', e);
    }
  };

  /**
   * Attach a stream to the <video> and wait until it actually renders frames.
   * iOS Safari can hand back a "live" stream that never paints (black screen),
   * so a stream alone is not proof the camera works — we wait for real
   * dimensions before declaring success.
   */
  const attachAndWaitForFrames = async (stream: MediaStream, timeoutMs = 2500): Promise<boolean> => {
    const video = videoRef.current;
    if (!video) return false;
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    video.muted = true;
    try { await video.play(); } catch (e) { console.warn('[scanner] video.play() rejected', e); }

    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      if (stoppedRef.current) return false;
      if (video.videoWidth > 0 && video.readyState >= 2) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return video.videoWidth > 0;
  };

  /**
   * Robust camera acquisition chain (iOS Safari + Android Chrome):
   *   1. facingMode preference (NEVER `exact` — Safari throws OverconstrainedError)
   *   2. verify what actually opened; if it is the front camera, reopen by the
   *      deviceId of the first REAR camera (Android labels: "camera2 0, facing back")
   *   3. plain `video: true` as last resort — and verify that one too, because
   *      the default camera on many Android phones is the front one.
   * Each candidate stream must paint frames within ~2.5s or we move on.
   */
  const acquireWorkingStream = async (want: 'environment' | 'user'): Promise<MediaStream> => {
    const base: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    const tried: MediaStream[] = [];

    const tryStream = async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn('[scanner] getUserMedia rejected', constraints, e);
        return null;
      }
      const ok = await attachAndWaitForFrames(stream);
      if (!ok) {
        console.warn('[scanner] stream produced no frames, discarding', constraints);
        stopStream(stream);
        return null;
      }
      tried.push(stream);
      return stream;
    };

    /**
     * Runs after EVERY successful acquisition path (not only the first one):
     * that is what was missing on Android, where the plain `video: true`
     * fallback silently opened the selfie camera.
     */
    const ensureRear = async (stream: MediaStream | null): Promise<MediaStream | null> => {
      if (!stream || want !== 'environment') return stream;
      const got = describeStream(stream);
      if (got.facing !== 'user') {
        console.info('[scanner] camera ok', { requested: want, got });
        return stream;
      }
      console.warn('[scanner] front camera opened, correcting by deviceId', got);
      const rearId = await findRearDeviceId(got.deviceId || undefined);
      if (!rearId) {
        console.warn('[scanner] no rear camera found, keeping', got);
        return stream;
      }
      stopStream(stream);
      const fixed = await tryStream({ video: { ...base, deviceId: { exact: rearId } }, audio: false });
      if (!fixed) {
        console.warn('[scanner] reopen by deviceId failed, retrying default');
        return null;
      }
      console.info('[scanner] camera corrected', { requested: want, got: describeStream(fixed), corrected: true });
      return fixed;
    };

    // 1. Preference, not requirement. 2. Verify + correct.
    let stream = await ensureRear(await tryStream({ video: { ...base, facingMode: want }, audio: false }));

    // 3. Anything that works beats a black screen — but still verify it.
    if (!stream) stream = await ensureRear(await tryStream({ video: base, audio: false }));
    if (!stream) stream = await ensureRear(await tryStream({ video: true, audio: false }));


    // Release any earlier candidates we are not using.
    tried.filter((s) => s !== stream).forEach(stopStream);

    if (!stream) throw new Error('camera_unavailable');
    activeStreamRef.current = stream;
    facingRef.current = isRearStream(stream) ? 'environment' : 'user';
    return stream;
  };

  const onDecoded = (decodedText: string) => {
    if (!decodedText || stoppedRef.current) return;
    // Coming back from a product sheet with the same barcode still in front of
    // the camera used to re-open that product instantly, which felt like the
    // app navigating on its own. Ignore the last barcode for a short window.
    if (
      decodedText === lastDecodedRef.current &&
      Date.now() - lastDecodedAtRef.current < RESCAN_COOLDOWN_MS
    ) {
      return;
    }
    lastDecodedRef.current = decodedText;
    lastDecodedAtRef.current = Date.now();
    try {
      sessionStorage.setItem(LAST_DECODE_KEY, JSON.stringify({ code: decodedText, at: Date.now() }));
    } catch { /* ignore */ }
    stoppedRef.current = true;
    try { controlsRef.current?.stop(); } catch {}
    controlsRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (zxingRotateTimerRef.current !== null) {
      clearInterval(zxingRotateTimerRef.current);
      zxingRotateTimerRef.current = null;
    }
    stopStream(activeStreamRef.current);
    activeStreamRef.current = null;
    setPhase('analyzing');
    navigate(`/result/${encodeURIComponent(decodedText)}`);
  };

  const startNative = async (detector: BarcodeDetectorLike) => {
    const video = videoRef.current;
    if (!video) throw new Error('video element missing');
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
    track('scanner_active', { engine: 'native' });
  };

  const startZxingWithRotation = async (stream: MediaStream) => {
    const codeReader = new BrowserMultiFormatReader(getScanHints(), {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 250,
    });

    // Decode from the stream we already validated instead of letting zxing
    // request its own — that request is what used to die on iOS Safari.
    const controls = await codeReader.decodeFromStream(
      stream,
      videoRef.current ?? undefined,
      (result) => {
        if (!result) return;
        onDecoded(result.getText());
      }
    );
    controlsRef.current = controls;
    track('scanner_active', { engine: 'zxing' });
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
      canvas.width = h;
      canvas.height = w;
      ctx.save();
      ctx.translate(h / 2, w / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(video, -w / 2, -h / 2, w, h);
      ctx.restore();
      try {
        const result = await codeReader.decodeFromCanvas(canvas);
        if (result?.getText()) onDecoded(result.getText());
      } catch {
        // no code in rotated frame — keep trying
      }
    };
    zxingRotateTimerRef.current = window.setInterval(() => {
      if (stoppedRef.current) return;
      void tryRotated();
    }, 700) as unknown as number;
    window.setTimeout(() => { void tryRotated(); }, 2000);
  };

  const startScanning = async (want: 'environment' | 'user' = 'environment') => {
    await stop();
    setErrorMsg('');
    setPhase('scanning');
    stoppedRef.current = false;
    try {
      track('camera_permission_requested', {});
      const stream = await acquireWorkingStream(want);
      track('camera_permission_granted', { facing: facingRef.current });

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
      await startZxingWithRotation(stream);
    } catch (e) {
      const reason = e instanceof Error ? (e.name || e.message) : String(e);
      track('camera_permission_denied', { reason });
      console.error('[scanner] camera error', e);
      setErrorMsg(c.cameraError);
      setPhase('error');
    }
  };

  const flipCamera = () => {
    void startScanning(facingRef.current === 'environment' ? 'user' : 'environment');
  };

  const location = useLocation();

  const viewTracked = useRef(false);
  useEffect(() => {
    if (!viewTracked.current) {
      viewTracked.current = true;
      track('scanner_view');
    }
    void startScanning('environment');
    return () => { void stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (location.pathname !== '/scan') void stop();
  }, [location.pathname]);

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
              <button
                type="button"
                onClick={flipCamera}
                aria-label={c.flip}
                className="absolute top-3 right-3 min-w-[44px] min-h-[44px] rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-sm"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
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
              <Button onClick={() => void startScanning('environment')}>{c.retry}</Button>
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

        <p className="text-xs text-muted-foreground text-center leading-relaxed px-2">
          {c.privacy}
        </p>

        <InstallPrompt />
      </div>
    </AppLayout>
  );
};

export default ScannerPage;
