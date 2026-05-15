import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const FREE_LIMIT = 5;

const COPY = {
  es: {
    title: 'Guarda tu análisis',
    desc: 'Crea una cuenta para guardar tu historial y mejorar tu perfil.',
    google: 'Continuar con Google',
    email: 'Usar email',
    skip: 'Ahora no',
    remaining: (n: number) =>
      n === 1 ? 'Te queda 1 escaneo gratis' : `Te quedan ${n} escaneos gratis`,
    paywallTitle: 'Has alcanzado el límite gratuito',
    paywallDesc: 'Crea una cuenta para continuar escaneando.',
    create: 'Crear cuenta',
  },
  en: {
    title: 'Save your scan',
    desc: 'Create an account to save your history and improve your profile.',
    google: 'Continue with Google',
    email: 'Use email',
    skip: 'Not now',
    remaining: (n: number) =>
      n === 1 ? '1 free scan left' : `${n} free scans left`,
    paywallTitle: 'You hit the free limit',
    paywallDesc: 'Create an account to keep scanning.',
    create: 'Create account',
  },
  fr: {
    title: 'Enregistre ton analyse',
    desc: 'Crée un compte pour sauvegarder ton historique et améliorer ton profil.',
    google: 'Continuer avec Google',
    email: 'Utiliser email',
    skip: 'Pas maintenant',
    remaining: (n: number) =>
      n === 1 ? 'Il te reste 1 scan gratuit' : `Il te reste ${n} scans gratuits`,
    paywallTitle: 'Tu as atteint la limite gratuite',
    paywallDesc: 'Crée un compte pour continuer.',
    create: 'Créer un compte',
  },
};

interface RegistrationSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  variant?: 'soft' | 'paywall';
}

export const RegistrationSheet = ({ open, onOpenChange, variant = 'soft' }: RegistrationSheetProps) => {
  const { user } = useUser();
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const c = COPY[user.language] ?? COPY.es;
  const [loading, setLoading] = useState(false);

  // Read scan count from localStorage so we can show remaining scans.
  const scanCount = (() => {
    try { return Number(localStorage.getItem('maseya_anon_scans') || '0'); } catch { return 0; }
  })();
  const remaining = Math.max(FREE_LIMIT - scanCount, 0);

  const handleGoogle = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  const handleEmail = () => {
    onOpenChange(false);
    navigate('/login');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-border">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl">
            {variant === 'paywall' ? c.paywallTitle : c.title}
          </SheetTitle>
          <SheetDescription>
            {variant === 'paywall' ? c.paywallDesc : c.desc}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 mt-6 pb-4">
          <Button onClick={handleGoogle} disabled={loading} className="w-full h-12 rounded-2xl">
            {c.google}
          </Button>
          <Button onClick={handleEmail} variant="outline" className="w-full h-12 rounded-2xl">
            {variant === 'paywall' ? c.create : c.email}
          </Button>
          {variant === 'soft' && (
            <button
              onClick={() => onOpenChange(false)}
              className="w-full text-sm text-muted-foreground py-2"
            >
              {c.skip}
              {remaining > 0 && (
                <span className="block text-xs text-muted-foreground/80 mt-0.5">
                  {c.remaining(remaining)}
                </span>
              )}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
