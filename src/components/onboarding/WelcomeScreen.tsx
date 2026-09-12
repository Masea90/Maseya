import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { track } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { WELCOME_COPY as COPY } from '@/content/welcome';

export const ONBOARDING_SKIP_KEY = 'maseya_onboarding_skipped';


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
    <div className="min-h-[100dvh] bg-gradient-hero flex flex-col items-center justify-between p-6 pt-safe text-center text-white">
      {/* Top bar: brand + language */}
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

      {/* Headline + subtitle */}
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight mb-2">
          {c.titleTop}
        </h1>
        <p className="text-secondary text-lg font-medium leading-snug">
          {c.subtitle}
          <span className="font-semibold">{c.subtitleAccent}</span>
        </p>
      </div>

      {/* Visual proof block: same product, two verdicts depending on who you are */}
      <div className="w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-3.5 space-y-4 text-left">
        {/* Example 1 — food */}
        <div className="space-y-1">
          <p className="text-[13px] font-semibold text-white">
            <span className="mr-1.5" aria-hidden>🧀</span>
            {c.ex1Label}
          </p>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11.5px] text-white/70">{c.ex1aCond}</span>
            <span className="text-base font-bold text-white/95 tabular-nums">{c.ex1aVerdict}</span>
          </div>
          <div className="h-px bg-white/15" aria-hidden />
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11.5px] text-white/70">{c.ex1bCond}</span>
            <span className="text-base font-bold text-[hsl(var(--score-bad))]">{c.ex1bVerdict}</span>
          </div>
        </div>
        {/* Example 2 — cosmetic */}
        <div className="space-y-1">
          <p className="text-[13px] font-semibold text-white">
            <span className="mr-1.5" aria-hidden>🧴</span>
            {c.ex2Label}
          </p>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11.5px] text-white/70">{c.ex2aCond}</span>
            <span className="text-base font-bold text-white/95 tabular-nums">{c.ex2aVerdict}</span>
          </div>
          <div className="h-px bg-white/15" aria-hidden />
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11.5px] text-white/70">{c.ex2bCond}</span>
            <span className="text-base font-bold text-[hsl(var(--score-fair))]">{c.ex2bVerdict}</span>
          </div>
        </div>
      </div>

      {/* Scope + trust lines */}
      <div className="w-full max-w-sm space-y-1">
        <p className="text-[12px] text-white/75 font-medium">{c.reach}</p>
        <p className="text-[11px] text-white/60">{c.trust}</p>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-2.5">
        <div>
          <Button
            onClick={handleSignup}
            className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-warm-lg leading-tight"
          >
            {c.signup}
          </Button>
          <p className="mt-1.5 text-[11px] text-white/75">{c.signupHint}</p>
        </div>
        <Button
          onClick={handleScan}
          variant="outline"
          className="w-full h-14 text-base font-semibold rounded-2xl border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white leading-tight"
        >
          {c.scanNoAccount}
        </Button>
        <button
          onClick={() => navigate('/login')}
          className="block mx-auto text-sm text-white/80 underline-offset-4 hover:underline"
        >
          {c.haveAccount}
        </button>
      </div>

      {/* Discreet footer */}
      <p className="text-[10px] text-white/50 space-x-2">
        <button onClick={() => navigate('/como-funciona')} className="underline-offset-4 hover:underline">
          {c.howItWorks}
        </button>
        <span aria-hidden>·</span>
        <button onClick={() => navigate('/aviso-legal')} className="underline-offset-4 hover:underline">
          Aviso legal
        </button>
      </p>
    </div>
  );
};
