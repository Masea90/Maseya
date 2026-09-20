import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics';
import { dismissPrompt, shouldShowOptIn, subscribeToPush } from '@/lib/push';

const COPY = {
  es: {
    title: '¿Te avisamos una vez por semana con un consejo útil sobre etiquetas?',
    body: 'Un solo aviso a la semana. Puedes desactivarlo cuando quieras desde tu perfil.',
    yes: 'Sí, avísame',
    no: 'Ahora no',
    done: 'Listo, te avisaremos una vez por semana.',
    denied: 'Tu navegador ha bloqueado los avisos. Puedes permitirlos en sus ajustes.',
    close: 'Cerrar',
  },
  en: {
    title: 'Want one useful label tip a week?',
    body: 'One notification per week. You can turn it off any time in your profile.',
    yes: 'Yes, notify me',
    no: 'Not now',
    done: "Done — you'll get one tip a week.",
    denied: 'Your browser blocked notifications. You can allow them in its settings.',
    close: 'Close',
  },
  fr: {
    title: 'On t’envoie un conseil utile sur les étiquettes une fois par semaine ?',
    body: 'Une seule notification par semaine. Désactivable à tout moment depuis ton profil.',
    yes: 'Oui, préviens-moi',
    no: 'Pas maintenant',
    done: 'C’est fait — un conseil par semaine.',
    denied: 'Ton navigateur a bloqué les notifications. Tu peux les autoriser dans ses réglages.',
    close: 'Fermer',
  },
};

// One prompt per browser session, even across several product pages.
const SESSION_KEY = 'maseya_push_prompt_session';

// The InstallPrompt card renders a container with this distinctive class.
// We avoid overlapping two prompts on the same screen.
const INSTALL_PROMPT_SELECTOR = 'div[class*="bg-primary/5"]';

export const PushOptInCard = () => {
  const { user } = useUser();
  const { isAuthenticated, currentUser } = useAuth();
  const c = COPY[user.language as keyof typeof COPY] ?? COPY.es;

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'denied'>('idle');
  // Distinguishes a programmatic close (after accept) from a user dismissal.
  const autoClosingRef = useRef(false);
  const shownTracked = useRef(false);

  useEffect(() => {
    if (!shouldShowOptIn(isAuthenticated)) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch { /* ignore */ }

    // Let the result render first (the score), then slide in.
    const t = setTimeout(() => {
      // Don't compete with the install prompt on the same screen.
      if (document.querySelector(INSTALL_PROMPT_SELECTOR)) return;
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch { /* ignore */ }
      setOpen(true);
    }, 3000);

    return () => clearTimeout(t);
  }, [isAuthenticated]);

  // Register the event only when the sheet truly opens.
  useEffect(() => {
    if (open && !shownTracked.current) {
      shownTracked.current = true;
      track('push_prompt_shown', {});
    }
  }, [open]);

  const decline = () => {
    dismissPrompt();
    track('push_prompt_dismissed', {});
  };

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setOpen(true);
      return;
    }
    if (autoClosingRef.current) {
      // Programmatic close after a successful accept — not a dismissal.
      autoClosingRef.current = false;
      setOpen(false);
      return;
    }
    // Closed via X, tap-outside, or swipe-down → treat as "Ahora no".
    decline();
    setOpen(false);
  };

  const accept = async () => {
    if (!currentUser?.id) return;
    setStatus('working');
    track('push_prompt_accepted', {});
    const result = await subscribeToPush(currentUser.id);
    if (result === 'subscribed') {
      setStatus('done');
      autoClosingRef.current = true;
      setTimeout(() => setOpen(false), 2000);
      return;
    }
    if (result === 'denied') {
      track('push_permission_denied', {});
      setStatus('denied');
      return;
    }
    setStatus('denied');
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
        <div className="relative mx-auto w-full max-w-md">
          <button
            onClick={() => handleOpenChange(false)}
            aria-label={c.close}
            className="absolute -top-1 right-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 pt-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug">{c.title}</p>
              {status === 'idle' && (
                <p className="text-xs text-muted-foreground mt-1">{c.body}</p>
              )}
              {status === 'done' && (
                <p className="text-xs text-primary mt-1">{c.done}</p>
              )}
              {status === 'denied' && (
                <p className="text-xs text-muted-foreground mt-1">{c.denied}</p>
              )}
              {status === 'idle' && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="rounded-xl" onClick={accept}>
                    {c.yes}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => handleOpenChange(false)}
                  >
                    {c.no}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
