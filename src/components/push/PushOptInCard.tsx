import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  },
  en: {
    title: 'Want one useful label tip a week?',
    body: 'One notification per week. You can turn it off any time in your profile.',
    yes: 'Yes, notify me',
    no: 'Not now',
    done: "Done — you'll get one tip a week.",
    denied: 'Your browser blocked notifications. You can allow them in its settings.',
  },
  fr: {
    title: 'On t’envoie un conseil utile sur les étiquettes une fois par semaine ?',
    body: 'Une seule notification par semaine. Désactivable à tout moment depuis ton profil.',
    yes: 'Oui, préviens-moi',
    no: 'Pas maintenant',
    done: 'C’est fait — un conseil par semaine.',
    denied: 'Ton navigateur a bloqué les notifications. Tu peux les autoriser dans ses réglages.',
  },
};

export const PushOptInCard = () => {
  const { user } = useUser();
  const { isAuthenticated, currentUser } = useAuth();
  const c = COPY[user.language as keyof typeof COPY] ?? COPY.es;

  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'denied'>('idle');

  useEffect(() => {
    if (shouldShowOptIn(isAuthenticated)) {
      setVisible(true);
      track('push_prompt_shown', {});
    }
  }, [isAuthenticated]);

  if (!visible) return null;

  const accept = async () => {
    if (!currentUser?.id) return;
    setStatus('working');
    track('push_prompt_accepted', {});
    const result = await subscribeToPush(currentUser.id);
    if (result === 'subscribed') {
      setStatus('done');
      return;
    }
    if (result === 'denied') {
      track('push_permission_denied', {});
      setStatus('denied');
      return;
    }
    setStatus('denied');
  };

  const decline = () => {
    dismissPrompt();
    track('push_prompt_dismissed', {});
    setVisible(false);
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
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
              <Button size="sm" variant="outline" className="rounded-xl" onClick={decline}>
                {c.no}
              </Button>
            </div>
          )}
        </div>
        {status !== 'idle' && (
          <button onClick={() => setVisible(false)} aria-label="Cerrar" className="text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
