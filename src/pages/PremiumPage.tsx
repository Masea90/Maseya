import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setPremium } from '@/lib/premium';

const FEATURES: { title: string; sub: string }[] = [
  { title: 'Tu puntuación personal', sub: 'Descubre si cada producto es realmente bueno para TI, no para todos' },
  { title: 'Análisis completo de Mira', sub: 'Mira explica exactamente por qué un producto es o no adecuado para tu perfil' },
  { title: "Capa '¿Es para ti?' completa", sub: 'Alertas personalizadas para tu piel, alergias y objetivos' },
  { title: 'Escaneos ilimitados', sub: 'Sin límite mensual' },
  { title: 'Historial completo', sub: 'Todos tus escaneos guardados sin límite' },
];

const PremiumPage = () => {
  const navigate = useNavigate();

  const startTrial = () => {
    // For now we just toggle the test premium flag — real billing comes later.
    setPremium(true);
    navigate(-1);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="w-full sm:max-w-lg sm:mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">Maseya Premium</h1>
        </div>
      </header>

      <div className="w-full sm:max-w-lg sm:mx-auto px-5 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-warm-lg">
            <Sparkles className="w-10 h-10 text-primary-foreground animate-pulse" />
          </div>
          <h2 className="font-display text-2xl font-bold">Maseya Premium</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Todo lo que necesitas para cuidarte de verdad
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {FEATURES.map(f => (
            <li key={f.title} className="flex gap-3 p-3 rounded-2xl bg-card border border-border">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{f.sub}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Trial badge */}
        <div className="text-center">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            🎁 7 días gratis · Sin tarjeta de crédito
          </span>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Mensual</p>
            <p className="font-display text-xl font-bold mt-1">3,99€<span className="text-xs font-normal">/mes</span></p>
            <p className="text-[11px] text-muted-foreground mt-1">Cancela cuando quieras</p>
          </div>
          <div className="relative rounded-2xl border-2 border-primary bg-primary/5 p-4 text-center">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
              Más popular
            </span>
            <p className="text-xs uppercase tracking-wider text-primary">Anual</p>
            <p className="font-display text-xl font-bold mt-1">29,99€<span className="text-xs font-normal">/año</span></p>
            <p className="text-[11px] text-primary mt-1 font-medium">Ahorra 37% · 2,49€/mes</p>
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={startTrial} className="w-full h-12 rounded-2xl text-base">
            Empezar prueba gratuita
          </Button>
          <button
            onClick={() => navigate(-1)}
            className="w-full h-11 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Continuar sin Premium
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Cancela en cualquier momento desde tu perfil. Sin permanencia.
        </p>
      </div>
    </div>
  );
};

export default PremiumPage;
