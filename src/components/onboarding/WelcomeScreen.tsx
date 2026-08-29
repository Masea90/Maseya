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

      {/* Visual proof block: two compact examples showing the personal-vs-general contrast */}
      <div className="w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-sm px-3.5 py-3 space-y-2.5">
        {/* Example 1 — food */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🧀</span>
            <span className="text-[13px] text-white/85 font-medium text-left">{c.ex1Label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">
              {c.ex1a}
            </span>
            <span className="inline-flex items-center rounded-full bg-[hsl(var(--score-bad)/0.9)] px-2.5 py-1 text-[11px] font-semibold text-white">
              {c.ex1b}
            </span>
          </div>
        </div>
        <div className="h-px bg-white/15" />
        {/* Example 2 — cosmetic */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🧴</span>
            <span className="text-[13px] text-white/85 font-medium text-left">{c.ex2Label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">
              {c.ex2a}
            </span>
            <span className="inline-flex items-center rounded-full bg-[hsl(var(--score-fair)/0.9)] px-2.5 py-1 text-[11px] font-semibold text-white">
              {c.ex2b}
            </span>
          </div>
        </div>
      </div>

      {/* Scope + trust lines */}
      <div className="w-full max-w-sm space-y-1">
        <p className="text-[12px] text-white/75 font-medium">{c.reach}</p>
        <p className="text-[11px] text-white/60">{c.trust}</p>
      </div>

      {/* CTA + secondary links */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          onClick={handleScan}
          className="w-full h-14 text-base font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-warm-lg leading-tight"
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
