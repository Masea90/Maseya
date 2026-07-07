import { useEffect, useState } from 'react';
import { X, Share, Plus, Download, Compass } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

const DISMISS_KEY = 'maseya_install_dismissed_at';
const DISMISS_DAYS = 14;

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const COPY = {
  es: {
    title: 'Instala Maseya en tu pantalla de inicio',
    subtitle: 'Accede a tus escaneos con un solo toque, como una app.',
    install: 'Instalar',
    iosStep1: 'Pulsa el botón',
    iosStep2: 'Compartir',
    iosStep3: 'y elige “Añadir a pantalla de inicio”.',
    inAppTitle: 'Abre Maseya en Safari para instalarla',
    inAppBody: 'Estás viendo la web dentro de otra app. Pulsa el menú (•••) y elige “Abrir en Safari” para poder añadirla a tu pantalla de inicio.',
    inAppCta: 'Copiar enlace',
    inAppCopied: 'Enlace copiado',
    dismiss: 'Cerrar',
  },
  en: {
    title: 'Install Maseya on your home screen',
    subtitle: 'One-tap access to your scans, just like an app.',
    install: 'Install',
    iosStep1: 'Tap the',
    iosStep2: 'Share',
    iosStep3: 'button and choose “Add to Home Screen”.',
    inAppTitle: 'Open Maseya in Safari to install it',
    inAppBody: "You're viewing the site inside another app. Tap the menu (•••) and choose “Open in Safari” to add it to your home screen.",
    inAppCta: 'Copy link',
    inAppCopied: 'Link copied',
    dismiss: 'Close',
  },
  fr: {
    title: "Installe Maseya sur ton écran d'accueil",
    subtitle: 'Accès à tes scans en un clic, comme une app.',
    install: 'Installer',
    iosStep1: 'Appuie sur',
    iosStep2: 'Partager',
    iosStep3: 'puis choisis « Sur l\'écran d\'accueil ».',
    inAppTitle: 'Ouvre Maseya dans Safari pour l’installer',
    inAppBody: 'Tu vois le site dans une autre app. Appuie sur le menu (•••) et choisis « Ouvrir dans Safari » pour l’ajouter à ton écran d’accueil.',
    inAppCta: 'Copier le lien',
    inAppCopied: 'Lien copié',
    dismiss: 'Fermer',
  },
};

const isDismissedRecently = (): boolean => {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const then = Number(raw);
    if (!Number.isFinite(then)) return false;
    return Date.now() - then < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosSA = (window.navigator as any).standalone === true;
  return !!mm || iosSA;
};

const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1;
  return iOSDevice || iPadOS;
};

// In-app browsers can't install PWAs. Detect the common ones.
const isInAppBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Instagram|FBAN|FBAV|FB_IAB|Messenger|Line|MicroMessenger|Twitter|TikTok|Snapchat|LinkedInApp|Pinterest|GSA/i.test(ua);
};

// iOS Safari (the only iOS browser that can Add to Home Screen from the share sheet).
const isIOSSafari = (): boolean => {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !isInAppBrowser();
};

export const InstallPrompt = () => {
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    const t = setTimeout(() => {
      if (isStandalone() || isDismissedRecently()) return;
      // iOS in-app browser (Instagram, WhatsApp, etc.) — can't install here.
      if (isIOS() && isInAppBrowser()) {
        setInApp(true);
        setVisible(true);
        return;
      }
      // Any iOS browser: show the Add-to-Home-Screen hint. Only Safari can complete
      // it, but Chrome/Firefox users need to know to switch to Safari.
      if (isIOSSafari() || isIOS()) {
        setIosHint(true);
        setVisible(true);
      }
    }, 600);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setVisible(false);
      } else {
        dismiss();
      }
    } catch (e) {
      console.warn('[install] prompt failed', e);
      dismiss();
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!visible) return null;

  return (
    <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          {inApp ? <Compass className="w-5 h-5 text-primary" /> : <Download className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm">
            {inApp ? c.inAppTitle : c.title}
          </p>
          {inApp ? (
            <>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.inAppBody}</p>
              <button
                onClick={copyLink}
                className="mt-3 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                {copied ? c.inAppCopied : c.inAppCta}
              </button>
            </>
          ) : iosHint ? (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {c.iosStep1}{' '}
              <Share className="w-3.5 h-3.5 inline align-[-2px] mx-0.5 text-primary" />
              <span className="font-medium text-foreground/80">{c.iosStep2}</span>{' '}
              {c.iosStep3}
              <Plus className="w-3.5 h-3.5 inline align-[-2px] ml-1 text-primary" />
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.subtitle}</p>
          )}
          {!iosHint && !inApp && deferred && (
            <button
              onClick={install}
              className="mt-3 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              {c.install}
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label={c.dismiss}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground -mt-1 -mr-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
