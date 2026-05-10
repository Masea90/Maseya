import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';

const COPY = {
  es: {
    title: 'Tu piel, tu cuerpo, tus reglas.',
    subtitle: 'Escanea cualquier producto y descubre si es realmente bueno para ti.',
    cta: 'Empezar',
  },
  en: {
    title: 'Your skin, your body, your rules.',
    subtitle: 'Scan any product and discover if it’s really good for you.',
    cta: 'Get started',
  },
  fr: {
    title: 'Ta peau, ton corps, tes règles.',
    subtitle: 'Scanne n’importe quel produit et découvre s’il est vraiment bon pour toi.',
    cta: 'Commencer',
  },
};

export const WelcomeScreen = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const copy = COPY[user.language] ?? COPY.es;

  return (
    <div className="min-h-[100dvh] bg-gradient-hero flex flex-col items-center justify-between p-8 text-center text-white">
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm">
        <div className="mb-8 w-20 h-20 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center">
          <span className="text-4xl">🌿</span>
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight mb-4">
          {copy.title}
        </h1>
        <p className="text-white/85 text-lg leading-relaxed">
          {copy.subtitle}
        </p>
      </div>

      <Button
        onClick={() => navigate('/onboarding/quiz')}
        className="w-full max-w-sm h-14 text-lg font-semibold rounded-2xl bg-white text-primary hover:bg-white/95 shadow-warm-lg"
      >
        {copy.cta}
      </Button>
    </div>
  );
};
