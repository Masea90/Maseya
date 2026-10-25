import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import { track } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { WELCOME_COPY as COPY } from '@/content/welcome';

export const ONBOARDING_SKIP_KEY = 'maseya_onboarding_skipped';

/** Each clip falls back independently; the shared pause state controls both. */
const WelcomeDemo = ({ src, poster, label, paused }: {
  src: string;
  poster: string;
  label: string;
  paused: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduced || failed) return;
    if (paused) video.pause();
    else void video.play().catch(() => setFailed(true));
  }, [paused, reduced, failed]);

  return (
    <div className="relative min-w-0 h-[330px] overflow-hidden">
      {reduced || failed ? (
        <img src={poster} alt="" className="h-full w-full object-cover" />
      ) : (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          onError={() => setFailed(true)}
        />
      )}
      <span className="absolute left-2 top-2 rounded-full bg-foreground/70 px-2 py-1 text-xs font-semibold text-primary-foreground">
        {label}
      </span>
    </div>
  );
};

export const WelcomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;
  const [paused, setPaused] = useState(false);

  const viewTracked = useRef(false);
  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    track('welcome_view', { language: user.language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignup = () => {
    track('welcome_signup_cta', { language: user.language });
    navigate('/login?mode=signup');
  };

  const handleScan = () => {
    try {
      localStorage.setItem(ONBOARDING_SKIP_KEY, '1');
    } catch {
      /* ignore storage errors (private mode) */
    }
    track('welcome_cta', { language: user.language });
    navigate('/scan');
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-hero text-center text-primary-foreground pt-safe pb-safe">
      <div className="mx-auto w-full max-w-lg">
        <header className="px-4 pt-2 pb-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-1.5">
            <div />
            <div className="flex items-center justify-center gap-2">
              <span aria-hidden className="text-lg">🌿</span>
              <span className="font-display font-bold tracking-normal">{c.brand}</span>
            </div>
            <div className="flex justify-end"><LanguageSwitcher variant="light" /></div>
          </div>
          <h1 className="font-display text-[22px] font-bold leading-[26px] tracking-normal mb-1">
            {c.titleTop}
          </h1>
          <p className="text-xs leading-4 text-primary-foreground/80">{c.personalIntro}</p>
        </header>

        <div className="relative grid grid-cols-2 gap-[2px]">
          <WelcomeDemo
            src="/maseya_bienvenida_cosmetica.mp4"
            poster="/maseya_bienvenida_cosmetica_poster.jpg"
            label={c.cosmeticsLabel}
            paused={paused}
          />
          <WelcomeDemo
            src="/maseya_bienvenida_alimentacion.mp4"
            poster="/maseya_bienvenida_alimentacion_poster.jpg"
            label={c.foodLabel}
            paused={paused}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-2 top-2 h-[30px] w-[30px] rounded-full bg-foreground/70 p-0 text-primary-foreground hover:bg-foreground/90 hover:text-primary-foreground"
            aria-label={paused ? c.resumeVideos : c.pauseVideos}
            title={paused ? c.resumeVideos : c.pauseVideos}
            onClick={() => setPaused(value => !value)}
          >
            {paused ? <Play /> : <Pause />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-[2px] py-1.5 text-xs leading-4 text-primary-foreground/80">
          <p className="px-3">{c.cosmeticsExplanation}</p>
          <p className="px-3">{c.foodExplanation}</p>
        </div>

        <div className="px-4">
          <div className="space-y-1.5">
            <Button onClick={handleSignup} className="w-full h-11 text-base font-semibold rounded-2xl bg-primary-foreground text-primary hover:bg-primary-foreground/95 shadow-warm-lg leading-tight">
              {c.signup}
            </Button>
            <Button onClick={handleScan} variant="outline" className="w-full h-11 text-base font-semibold rounded-2xl border-primary-foreground/80 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground leading-tight">
              {c.scanNoAccount}
            </Button>
          </div>
          <Button onClick={() => navigate('/login')} variant="link" className="h-11 text-sm text-primary-foreground/80">
            {c.haveAccount}
          </Button>

          <section className="text-left">
            <h2 className="text-xs leading-4 font-semibold tracking-normal mb-1">{c.stepsTitle}</h2>
            <ol className="list-decimal pl-4 text-[12.5px] leading-4 text-primary-foreground/80">
              <li>{c.step1}</li>
              <li>{c.step2}</li>
              <li>{c.step3}</li>
            </ol>
          </section>

          <p className="pt-1.5 pb-2 text-[10.5px] leading-[13px] text-primary-foreground/75">
            {c.sources} ·{' '}
            <a href="/aviso-legal" className="underline underline-offset-2">{c.legalNotice}</a>
          </p>
        </div>
      </div>
    </div>
  );
};
