import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { HOW_IT_WORKS_COPY as COPY } from '@/content/howItWorks';

const CANONICAL = 'https://maseya.es/como-funciona';


/** Per-route head metadata for this SPA: set on mount, restore on unmount. */
function useRouteMeta(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      let created = false;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        created = true;
      }
      const prev = el.getAttribute('content');
      el.setAttribute('content', value);
      return () => {
        if (created) el?.remove();
        else if (prev !== null) el?.setAttribute('content', prev);
      };
    };

    const restores = [
      setMeta('meta[name="description"]', 'name', 'description', description),
      setMeta('meta[property="og:title"]', 'property', 'og:title', title),
      setMeta('meta[property="og:description"]', 'property', 'og:description', description),
      setMeta('meta[property="og:url"]', 'property', 'og:url', CANONICAL),
      setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title),
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description),
    ];

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonicalCreated = !canonical;
    const prevHref = canonical?.getAttribute('href') ?? null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', CANONICAL);

    return () => {
      document.title = prevTitle;
      restores.forEach((r) => r());
      if (canonicalCreated) canonical?.remove();
      else if (prevHref) canonical?.setAttribute('href', prevHref);
    };
  }, [title, description]);
}

const HowItWorksPage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;

  useRouteMeta(c.meta.title, c.meta.description);

  return (
    <div className="min-h-[100dvh] bg-background pb-16">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border pt-safe">
        <div className="w-full sm:max-w-2xl sm:mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/scan'))}
            aria-label={c.back}
            className="p-1 -ml-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display text-lg font-semibold text-primary">MASEYA</span>
        </div>
      </header>

      <main className="w-full sm:max-w-2xl sm:mx-auto px-5 py-8 space-y-10 text-[15px] leading-relaxed text-foreground/90">
        <div className="space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight text-foreground">
            {c.h1}
          </h1>
          <p className="text-muted-foreground">{c.subtitle}</p>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-foreground">{c.ideaTitle}</h2>
          <p>{c.idea}</p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-foreground">{c.scoreTitle}</h2>
          {c.blocks.map((b) => (
            <article key={b.title} className="rounded-2xl border border-border/70 bg-muted/30 p-5 space-y-2">
              <h3 className="font-display text-base font-semibold text-primary">{b.title}</h3>
              <p>{b.body}</p>
            </article>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-foreground">{c.personalTitle}</h2>
          <p>{c.personalIntro}</p>
          <ul className="list-disc pl-5 space-y-2">
            {c.personalItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="rounded-2xl bg-secondary/40 p-4 text-sm">{c.personalClose}</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-foreground">{c.missingTitle}</h2>
          <p>{c.missing}</p>
          <p className="font-display text-base italic text-primary">{c.missingQuote}</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-foreground">{c.notTitle}</h2>
          <ul className="list-disc pl-5 space-y-2">
            {c.notItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-foreground">{c.whoTitle}</h2>
          <p>{c.who}</p>
          <p>
            {c.whoContact}
            <a className="underline underline-offset-2" href="mailto:team@maseya.es">
              team@maseya.es
            </a>
            {c.whoContactEnd}
          </p>
        </section>

        <div className="space-y-3 pt-2">
          <Button
            onClick={() => navigate('/scan')}
            className="w-full h-14 text-base font-semibold rounded-2xl"
          >
            {c.cta}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{c.ctaSub}</p>
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/privacy" className="underline underline-offset-2">
              {user.language === 'en'
                ? 'Privacy policy'
                : user.language === 'fr'
                  ? 'Politique de confidentialité'
                  : 'Política de privacidad'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default HowItWorksPage;
