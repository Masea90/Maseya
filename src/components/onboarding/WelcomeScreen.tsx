import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';

const COPY = {
  es: {
    brand: 'MASEYA',
    title: '¿Sabes lo que hay en tus productos?',
    subtitle: 'Escanea cualquier producto y descubre en segundos si es realmente bueno para ti.',
    cta: 'Ver si mis productos son buenos para mí',
    haveAccount: 'Ya tengo cuenta',
    skip: 'Continuar sin registrarme',
  },
  en: {
    brand: 'MASEYA',
    title: 'Do you know what’s in your products?',
    subtitle: 'Scan any product and find out in seconds if it’s really good for you.',
    cta: 'Check if my products are good for me',
    haveAccount: 'I already have an account',
    skip: 'Continue without signing up',
  },
  fr: {
    brand: 'MASEYA',
    title: 'Sais-tu ce qu’il y a dans tes produits ?',
    subtitle: 'Scanne n’importe quel produit et découvre en quelques secondes s’il est vraiment bon pour toi.',
    cta: 'Voir si mes produits sont bons pour moi',
    haveAccount: 'J’ai déjà un compte',
    skip: 'Continuer sans m’inscrire',
  },
};

export const WelcomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;

  return (
    <div className="min-h-[100dvh] bg-gradient-hero flex flex-col items-center justify-between p-8 pt-safe text-center text-white">
      <div className="w-full flex items-center justify-center gap-2 pt-2">
        <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
          <span className="text-lg">🌿</span>
        </div>
        <span className="font-display font-bold tracking-wide">{c.brand}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm">
        <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight mb-4">
          {c.title}
        </h1>
        <p className="text-white/85 text-base sm:text-lg leading-relaxed">
          {c.subtitle}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Button
          onClick={() => navigate('/onboarding/quiz')}
          className="w-full h-14 text-base sm:text-lg font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-warm-lg leading-tight"
        >
          {c.cta}
        </Button>
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            onClick={() => navigate('/login')}
            className="text-white/90 underline-offset-4 hover:underline"
          >
            {c.haveAccount}
          </button>
          <span className="text-white/40">·</span>
          <button
            onClick={() => navigate('/onboarding/quiz')}
            className="text-white/80 underline-offset-4 hover:underline"
          >
            {c.skip}
          </button>
        </div>
      </div>
    </div>
  );
};
