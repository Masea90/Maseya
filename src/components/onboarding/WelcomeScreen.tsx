import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export const ONBOARDING_SKIP_KEY = 'maseya_onboarding_skipped';

const COPY = {
  es: {
    brand: 'MASEYA',
    titleTop: 'Tus alergias, tu dieta, tu piel.',
    titleAccent: 'Escanea y descubre.',
    subtitle: 'Alimentación y cosmética · Gratis · Sin descargar nada',
    cta: 'Escanear un producto',
    haveAccount: 'Ya tengo cuenta',
    howItWorks: 'Cómo funciona',
  },
  en: {
    brand: 'MASEYA',
    titleTop: 'Your allergies, your diet, your skin.',
    titleAccent: 'Scan and discover.',
    subtitle: 'Food and cosmetics · Free · No download needed',
    cta: 'Scan a product',
    haveAccount: 'I already have an account',
    howItWorks: 'How it works',
  },
  fr: {
    brand: 'MASEYA',
    titleTop: 'Tes allergies, ton alimentation, ta peau.',
    titleAccent: 'Scanne et découvre.',
    subtitle: 'Alimentation et cosmétique · Gratuit · Sans rien télécharger',
    cta: 'Scanner un produit',
    haveAccount: 'J’ai déjà un compte',
    howItWorks: 'Comment ça marche',
  },
};

export const WelcomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;

  const viewTracked = useRef(false);
  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    track('welcome_view', { language: user.language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = () => {
    // Same effect the old "continue without signing up" had: let anonymous users
    // through the onboarding gate. We flag the skip locally (no quiz answers).
    try {
      localStorage.setItem(ONBOARDING_SKIP_KEY, '1');
    } catch {
      /* ignore storage errors (private mode) */
    }
    track('welcome_cta', { language: user.language });
    navigate('/scan');
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-hero flex flex-col items-center justify-between p-8 pt-safe text-center text-white">
      <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center pt-2">
        <div />
        <div className="flex items-center justify-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <span className="text-lg">🌿</span>
          </div>
          <span className="font-display font-bold tracking-wide">{c.brand}</span>
        </div>
        <div className="flex justify-end">
          <LanguageSwitcher variant="light" />
        </div>
      </div>


      <div className="flex-1 flex flex-col items-center justify-center max-w-sm">
        <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-4">
          {c.titleTop}
          <span className="block text-secondary mt-2">{c.titleAccent}</span>
        </h1>
        <p className="text-white/85 text-base leading-relaxed">
          {c.subtitle}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Button
          onClick={handleScan}
          className="w-full h-16 text-lg font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-warm-lg leading-tight"
        >
          {c.cta}
        </Button>
        <button
          onClick={() => navigate('/login')}
          className="block mx-auto text-sm text-white/80 underline-offset-4 hover:underline"
        >
          {c.haveAccount}
        </button>
        <button
          onClick={() => navigate('/como-funciona')}
          className="block mx-auto text-xs text-white/70 underline-offset-4 hover:underline"
        >
          {c.howItWorks}
        </button>
      </div>
    </div>
  );
};
