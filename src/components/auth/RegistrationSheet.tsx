import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const FREE_LIMIT = 5;

const COPY = {
  es: {
    title: 'Crea tu cuenta gratis',
    desc: 'Guarda tu historial de escaneos, sincroniza tu perfil en todos tus dispositivos y contribuye a que la base de datos crezca para todos.',
    google: 'Continuar con Google',
    email: 'Usar email',
    skip: 'Continuar sin cuenta',
    remaining: (n: number) =>
      n === 1 ? 'Te queda 1 escaneo antes de registrarte' : `Te quedan ${n} escaneos antes de registrarte`,
    paywallTitle: 'Crea tu cuenta gratis para seguir',
    paywallDesc: 'Guarda tu historial, sincroniza tu perfil en todos tus dispositivos y ayúdanos a mejorar la base de datos.',
    create: 'Crear cuenta gratis',
  },
  en: {
    title: 'Create your free account',
    desc: 'Save your scan history, sync your profile across devices, and help grow the database for everyone.',
    google: 'Continue with Google',
    email: 'Use email',
    skip: 'Continue without an account',
    remaining: (n: number) =>
      n === 1 ? '1 scan left before signing up' : `${n} scans left before signing up`,
    paywallTitle: 'Create your free account to continue',
    paywallDesc: 'Save your history, sync your profile across devices, and help improve the database.',
    create: 'Create free account',
  },
  fr: {
    title: 'Crée ton compte gratuit',
    desc: 'Sauvegarde ton historique de scans, synchronise ton profil sur tous tes appareils et aide à enrichir la base de données pour tous.',
    google: 'Continuer avec Google',
    email: 'Utiliser email',
    skip: 'Continuer sans compte',
    remaining: (n: number) =>
      n === 1 ? 'Il te reste 1 scan avant inscription' : `Il te reste ${n} scans avant inscription`,
    paywallTitle: 'Crée ton compte gratuit pour continuer',
    paywallDesc: "Sauvegarde ton historique, synchronise ton profil et aide à améliorer la base de données.",
    create: 'Créer un compte gratuit',
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
