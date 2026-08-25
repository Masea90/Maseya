import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';

const CANONICAL = 'https://maseya.es/como-funciona';

type Copy = {
  meta: { title: string; description: string };
  back: string;
  h1: string;
  subtitle: string;
  ideaTitle: string;
  idea: string;
  scoreTitle: string;
  blocks: { title: string; body: string }[];
  personalTitle: string;
  personalIntro: string;
  personalItems: string[];
  personalClose: string;
  missingTitle: string;
  missing: string;
  missingQuote: string;
  notTitle: string;
  notItems: string[];
  whoTitle: string;
  who: string;
  whoContact: string;
  whoContactEnd: string;
  cta: string;
  ctaSub: string;
};

const COPY: Record<'es' | 'en' | 'fr', Copy> = {
  es: {
    meta: {
      title: 'Cómo funciona Maseya — Escáner de productos personalizado',
      description:
        'Maseya analiza alimentos y cosmética con el Nutri-Score oficial y evaluaciones de la EFSA, y te dice si son aptos para ti según tus alergias, dieta y piel. Gratis y sin descargas.',
    },
    back: 'Volver',
    h1: 'Cómo funciona Maseya',
    subtitle:
      'Escanea un producto y descubre qué lleva, cómo puntúa y si es apto para ti. Te explicamos exactamente de dónde sale cada dato.',
    ideaTitle: 'La idea',
    idea:
      'La mayoría de las apps de escaneo dan una nota para todo el mundo. Pero tú no eres todo el mundo: tienes tus alergias, tu dieta, tu tipo de piel. Maseya da una nota general (criterios científicos oficiales) y una nota personal (el mismo producto según tu perfil). El mismo queso puede ser un «regular» para una persona y un «No apto» para alguien con intolerancia a la lactosa. Esa diferencia es Maseya.',
    scoreTitle: 'De dónde sale la nota',
    blocks: [
      {
        title: 'Nutri-Score oficial (versión 2023)',
        body:
          'Usamos el algoritmo del comité científico europeo, el mismo que aparece en los envases. Cuando un producto no trae la nota calculada, la calculamos desde sus valores nutricionales. Cómo lo hemos comprobado: validamos nuestro cálculo contra 132 productos reales que ya tenían la nota oficial, en 11 categorías (bebidas, quesos, aceites, carnes, cereales...). Cuando Maseya se desvía, siempre lo hace siendo más prudente, nunca más generosa.',
      },
      {
        title: 'Evaluaciones de la EFSA para aditivos',
        body:
          'Solo penalizamos un aditivo cuando la Autoridad Europea de Seguridad Alimentaria ha documentado riesgo real por sobreexposición. Si no hay esa evidencia, no restamos puntos: lo mostramos con transparencia, sin alarmismo. Es una decisión consciente: preferimos decir menos y que sea cierto.',
      },
      {
        title: 'Confianza en los datos',
        body:
          'Si a un producto le falta información, te lo decimos. Verás un indicador de confianza (alta, media o baja) junto a la nota, y una nota provisional en vez de un número que parezca definitivo. Ninguna otra app de escaneo muestra esto. Creemos que deberían.',
      },
    ],
    personalTitle: 'Tu nota personal',
    personalIntro:
      'Cuando creas tu cuenta gratuita y completas tu perfil, Maseya analiza cada producto también desde tu punto de vista.',
    personalItems: [
      'Alergias e intolerancias: si el fabricante declara un alérgeno que tienes, el producto sale como «No apto para ti», sin medias tintas.',
      'Dieta halal: detectamos cerdo y derivados, alcohol y gelatinas de origen no especificado. Y cuando no podemos saberlo con certeza (por ejemplo si una carne tiene sacrificio halal), te lo decimos claramente en vez de suponerlo.',
      'Piel sensible o atópica: analizamos la lista INCI y avisamos de irritantes y alérgenos de contacto, teniendo en cuenta su posición en la lista (que por ley indica la concentración).',
      'Otras dietas y objetivos: vegetariana, sin azúcar, y más.',
    ],
    personalClose:
      'Tu nota personal nunca es más alta que la general: sirve para avisarte de lo que te perjudica a ti, no para maquillar un producto.',
    missingTitle: 'Y si el producto no está',
    missing:
      'Maseya consulta Open Food Facts y Open Beauty Facts, las bases de datos abiertas de productos más grandes del mundo. Pero no lo tienen todo. Cuando un producto no aparece, puedes fotografiar la etiqueta: nuestra IA lee la lista de ingredientes y la tabla nutricional, valida que los datos tengan sentido y genera el análisis completo. Ese producto queda disponible para todos los demás usuarios.',
    missingQuote: 'Cada persona que escanea hace la herramienta mejor para la siguiente.',
    notTitle: 'Qué NO hacemos',
    notItems: [
      'No aceptamos dinero de marcas. Ninguna empresa puede pagar por mejorar su nota ni por aparecer en las alternativas.',
      'No inventamos alarmas. Si no hay evidencia oficial de que algo sea un problema, no lo pintamos de rojo.',
      'No vendemos tus datos. Tus alergias y tu perfil de salud son tuyos. Puedes borrarlos cuando quieras.',
      'No sustituimos a un profesional. Maseya es una herramienta de información. Si tienes una alergia grave o una condición médica, verifica siempre el etiquetado oficial y consulta a tu médico o nutricionista.',
    ],
    whoTitle: 'Quién está detrás',
    who:
      'Maseya es un proyecto independiente, desarrollado en España. No pertenecemos a ninguna marca ni cadena de supermercados, y no aceptamos dinero de fabricantes. Eso nos permite decir lo que dicen los datos, sin más. Maseya es gratis y no hay que descargar nada.',
    whoContact: 'Si la usas y algo falla o falta, escríbenos: ',
    whoContactEnd: '. Leemos todos los mensajes.',
    cta: 'Escanear un producto',
    ctaSub: 'Gratis · Sin descargas · Alimentación y cosmética',
  },
  en: {
    meta: {
      title: 'How Maseya works — Personalized product scanner',
      description:
        'Maseya analyses food and cosmetics with the official Nutri-Score and EFSA assessments, and tells you whether they suit you based on your allergies, diet and skin. Free, no downloads.',
    },
    back: 'Back',
    h1: 'How Maseya works',
    subtitle:
      'Scan a product and find out what it contains, how it scores and whether it suits you. We explain exactly where every data point comes from.',
    ideaTitle: 'The idea',
    idea:
      'Most scanning apps give one score for everyone. But you are not everyone: you have your allergies, your diet, your skin type. Maseya gives a general score (official scientific criteria) and a personal score (the same product seen through your profile). The same cheese can be “average” for one person and “Not suitable” for someone who is lactose intolerant. That difference is Maseya.',
    scoreTitle: 'Where the score comes from',
    blocks: [
      {
        title: 'Official Nutri-Score (2023 version)',
        body:
          'We use the European scientific committee algorithm, the same one printed on packaging. When a product does not come with a calculated score, we compute it from its nutritional values. How we checked it: we validated our calculation against 132 real products that already had the official score, across 11 categories (drinks, cheeses, oils, meats, cereals...). When Maseya deviates, it always errs on the cautious side, never the generous one.',
      },
      {
        title: 'EFSA assessments for additives',
        body:
          'We only penalise an additive when the European Food Safety Authority has documented a real risk from overexposure. Without that evidence we do not subtract points: we show it transparently, without alarmism. It is a conscious choice: we would rather say less and be right.',
      },
      {
        title: 'Confidence in the data',
        body:
          'If a product is missing information, we tell you. You will see a confidence indicator (high, medium or low) next to the score, and a provisional score instead of a number that looks final. No other scanning app shows this. We think they should.',
      },
    ],
    personalTitle: 'Your personal score',
    personalIntro:
      'When you create your free account and complete your profile, Maseya also analyses every product from your point of view.',
    personalItems: [
      'Allergies and intolerances: if the manufacturer declares an allergen you have, the product comes out as “Not suitable for you”, no half measures.',
      'Halal diet: we detect pork and derivatives, alcohol and gelatines of unspecified origin. And when we cannot know for certain (for example whether a meat was halal slaughtered), we say so clearly instead of assuming.',
      'Sensitive or atopic skin: we analyse the INCI list and flag irritants and contact allergens, taking into account their position in the list (which by law indicates concentration).',
      'Other diets and goals: vegetarian, sugar-free, and more.',
    ],
    personalClose:
      'Your personal score is never higher than the general one: it exists to warn you about what harms you, not to flatter a product.',
    missingTitle: 'And if the product is missing',
    missing:
      'Maseya queries Open Food Facts and Open Beauty Facts, the largest open product databases in the world. But they do not have everything. When a product is missing, you can photograph the label: our AI reads the ingredient list and the nutrition table, validates that the data makes sense and generates the full analysis. That product then becomes available to everyone else.',
    missingQuote: 'Every person who scans makes the tool better for the next one.',
    notTitle: 'What we do NOT do',
    notItems: [
      'We do not take money from brands. No company can pay to improve its score or to appear in the alternatives.',
      'We do not invent alarms. If there is no official evidence that something is a problem, we do not paint it red.',
      'We do not sell your data. Your allergies and your health profile are yours. You can delete them whenever you want.',
      'We do not replace a professional. Maseya is an information tool. If you have a severe allergy or a medical condition, always check the official labelling and consult your doctor or nutritionist.',
    ],
    whoTitle: 'Who is behind it',
    who:
      'Maseya is an independent project, developed in Spain. We do not belong to any brand or supermarket chain, and we take no money from manufacturers. That lets us say what the data says, nothing more. Maseya is free and there is nothing to download.',
    whoContact: 'If you use it and something breaks or is missing, write to us: ',
    whoContactEnd: '. We read every message.',
    cta: 'Scan a product',
    ctaSub: 'Free · No downloads · Food and cosmetics',
  },
  fr: {
    meta: {
      title: 'Comment fonctionne Maseya — Scanner de produits personnalisé',
      description:
        'Maseya analyse l’alimentation et la cosmétique avec le Nutri-Score officiel et les évaluations de l’EFSA, et te dit si les produits te conviennent selon tes allergies, ton régime et ta peau. Gratuit, sans téléchargement.',
    },
    back: 'Retour',
    h1: 'Comment fonctionne Maseya',
    subtitle:
      'Scanne un produit et découvre ce qu’il contient, sa note et s’il te convient. On t’explique exactement d’où vient chaque donnée.',
    ideaTitle: 'L’idée',
    idea:
      'La plupart des applis de scan donnent une note valable pour tout le monde. Mais tu n’es pas tout le monde : tu as tes allergies, ton alimentation, ton type de peau. Maseya donne une note générale (critères scientifiques officiels) et une note personnelle (le même produit selon ton profil). Le même fromage peut être « moyen » pour une personne et « Non adapté » pour quelqu’un d’intolérant au lactose. Cette différence, c’est Maseya.',
    scoreTitle: 'D’où vient la note',
    blocks: [
      {
        title: 'Nutri-Score officiel (version 2023)',
        body:
          'Nous utilisons l’algorithme du comité scientifique européen, celui qui figure sur les emballages. Quand un produit n’a pas de note calculée, nous la calculons à partir de ses valeurs nutritionnelles. Comment nous l’avons vérifié : nous avons validé notre calcul sur 132 produits réels qui avaient déjà la note officielle, dans 11 catégories (boissons, fromages, huiles, viandes, céréales...). Quand Maseya s’écarte, c’est toujours dans le sens de la prudence, jamais de la générosité.',
      },
      {
        title: 'Évaluations de l’EFSA pour les additifs',
        body:
          'Nous ne pénalisons un additif que lorsque l’Autorité européenne de sécurité des aliments a documenté un risque réel de surexposition. Sans cette preuve, nous ne retirons pas de points : nous l’affichons en toute transparence, sans alarmisme. C’est un choix assumé : mieux vaut en dire moins et dire vrai.',
      },
      {
        title: 'Confiance dans les données',
        body:
          'S’il manque des informations sur un produit, nous te le disons. Tu verras un indicateur de confiance (élevée, moyenne ou faible) à côté de la note, et une note provisoire plutôt qu’un chiffre qui semblerait définitif. Aucune autre appli de scan ne l’affiche. Nous pensons qu’elles devraient.',
      },
    ],
    personalTitle: 'Ta note personnelle',
    personalIntro:
      'Quand tu crées ton compte gratuit et complètes ton profil, Maseya analyse aussi chaque produit de ton point de vue.',
    personalItems: [
      'Allergies et intolérances : si le fabricant déclare un allergène que tu as, le produit ressort « Non adapté pour toi », sans demi-mesure.',
      'Régime halal : nous détectons le porc et ses dérivés, l’alcool et les gélatines d’origine non précisée. Et quand nous ne pouvons pas le savoir avec certitude (par exemple si une viande est abattue halal), nous te le disons clairement au lieu de le supposer.',
      'Peau sensible ou atopique : nous analysons la liste INCI et signalons les irritants et allergènes de contact, en tenant compte de leur position dans la liste (qui indique légalement la concentration).',
      'Autres régimes et objectifs : végétarien, sans sucre, et plus encore.',
    ],
    personalClose:
      'Ta note personnelle n’est jamais plus élevée que la note générale : elle sert à t’alerter sur ce qui te nuit, pas à embellir un produit.',
    missingTitle: 'Et si le produit n’y est pas',
    missing:
      'Maseya interroge Open Food Facts et Open Beauty Facts, les plus grandes bases de données ouvertes de produits au monde. Mais elles n’ont pas tout. Quand un produit n’apparaît pas, tu peux photographier l’étiquette : notre IA lit la liste d’ingrédients et le tableau nutritionnel, vérifie la cohérence des données et génère l’analyse complète. Ce produit devient ensuite disponible pour tous les autres utilisateurs.',
    missingQuote: 'Chaque personne qui scanne améliore l’outil pour la suivante.',
    notTitle: 'Ce que nous NE faisons PAS',
    notItems: [
      'Nous n’acceptons pas d’argent des marques. Aucune entreprise ne peut payer pour améliorer sa note ni pour apparaître dans les alternatives.',
      'Nous n’inventons pas d’alarmes. S’il n’y a pas de preuve officielle qu’une chose pose problème, nous ne la peignons pas en rouge.',
      'Nous ne vendons pas tes données. Tes allergies et ton profil de santé t’appartiennent. Tu peux les supprimer quand tu veux.',
      'Nous ne remplaçons pas un professionnel. Maseya est un outil d’information. Si tu as une allergie grave ou une condition médicale, vérifie toujours l’étiquetage officiel et consulte ton médecin ou ta nutritionniste.',
    ],
    whoTitle: 'Qui est derrière',
    who:
      'Maseya est un projet indépendant, développé en Espagne. Nous n’appartenons à aucune marque ni chaîne de supermarchés, et nous n’acceptons pas d’argent des fabricants. Cela nous permet de dire ce que disent les données, rien de plus. Maseya est gratuit et il n’y a rien à télécharger.',
    whoContact: 'Si tu l’utilises et que quelque chose ne va pas ou manque, écris-nous : ',
    whoContactEnd: '. Nous lisons tous les messages.',
    cta: 'Scanner un produit',
    ctaSub: 'Gratuit · Sans téléchargement · Alimentation et cosmétique',
  },
};

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
