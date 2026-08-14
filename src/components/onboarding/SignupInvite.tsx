import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HeartPulse } from 'lucide-react';

/**
 * Shown to ANONYMOUS users where the personal layer would normally appear
 * (health quiz / health profile editing). The personal layer is a
 * registered-user feature; scanning and the general score stay open.
 */
export const SignupInvite = ({ compact = false }: { compact?: boolean }) => {
  const navigate = useNavigate();

  const skipToScan = () => {
    try { localStorage.setItem('maseya_onboarding_skipped', '1'); } catch { /* ignore */ }
    navigate('/scan', { replace: true });
  };

  const body = (
    <div className="space-y-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
        <HeartPulse className="w-6 h-6 text-primary" />
      </div>
      <h2 className={compact ? 'font-display text-lg font-bold' : 'font-display text-2xl font-bold leading-tight'}>
        Crea tu cuenta gratis para personalizar tu análisis
      </h2>
      <p className="text-sm text-muted-foreground">
        Te diremos si cada producto es apto para TI según tus alergias, tu dieta y tu piel
      </p>
      <div className="space-y-2 pt-1">
        <Button
          className="w-full rounded-2xl h-12 font-semibold"
          onClick={() => navigate('/login?mode=signup')}
        >
          Crear cuenta
        </Button>
        <Button variant="ghost" className="w-full rounded-2xl" onClick={skipToScan}>
          Ahora no
        </Button>
      </div>
    </div>
  );

  if (compact) {
    return <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">{body}</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
      <div className="w-full sm:max-w-sm">{body}</div>
    </div>
  );
};
