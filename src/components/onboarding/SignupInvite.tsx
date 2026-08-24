import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { HeartPulse } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

const COPY = {
  es: {
    heading: 'Crea tu cuenta gratis para personalizar tu análisis',
    body: 'Te diremos si cada producto es apto para TI según tus alergias, tu dieta y tu piel',
    create: 'Crear cuenta',
    notNow: 'Ahora no',
  },
  en: {
    heading: 'Create your free account to personalize your analysis',
    body: "We'll tell you if each product is right for YOU based on your allergies, diet and skin",
    create: 'Create account',
    notNow: 'Not now',
  },
  fr: {
    heading: 'Crée ton compte gratuit pour personnaliser ton analyse',
    body: "Nous te dirons si chaque produit te convient selon tes allergies, ton régime et ta peau",
    create: 'Créer un compte',
    notNow: 'Pas maintenant',
  },
};

/**
 * Shown to ANONYMOUS users where the personal layer would normally appear
 * (health quiz / health profile editing). The personal layer is a
 * registered-user feature; scanning and the general score stay open.
 */
export const SignupInvite = ({ compact = false }: { compact?: boolean }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;

  const promptTracked = useRef(false);
  useEffect(() => {
    if (promptTracked.current) return;
    promptTracked.current = true;
    track('register_prompt_shown');
    track('signup_invite_view', { language: user.language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skipToScan = () => {
    track('signup_invite_dismissed');
    try { localStorage.setItem('maseya_onboarding_skipped', '1'); } catch { /* ignore */ }
    navigate('/scan', { replace: true });
  };

  const body = (
    <div className="space-y-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
        <HeartPulse className="w-6 h-6 text-primary" />
      </div>
      <h2 className={compact ? 'font-display text-lg font-bold' : 'font-display text-2xl font-bold leading-tight'}>
        {c.heading}
      </h2>
      <p className="text-sm text-muted-foreground">
        {c.body}
      </p>
      <div className="space-y-2 pt-1">
        <Button
          className="w-full rounded-2xl h-12 font-semibold"
          onClick={() => navigate('/login?mode=signup')}
        >
          {c.create}
        </Button>
        <Button variant="ghost" className="w-full rounded-2xl" onClick={skipToScan}>
          {c.notNow}
        </Button>
      </div>
    </div>
  );

  if (compact) {
    return <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">{body}</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
      <div className="w-full sm:max-w-sm">{body}</div>
    </div>
  );
};
