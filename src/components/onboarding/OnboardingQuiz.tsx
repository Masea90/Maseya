import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const COPY = {
  es: {
    intro: 'Cuéntanos sobre ti para personalizar tus resultados',
    context: 'Esto nos permite personalizar tu análisis. Solo tarda 20 segundos.',
    step: 'Paso 1 de 2',
    q1: '¿Cómo es tu piel?',
    q2: '¿Tienes alguna intolerancia o alergia alimentaria?',
    cta: 'Ver mi primer análisis →',
    skinRequired: 'Selecciona cómo es tu piel para continuar',
    skin: [
      { id: 'atopic', emoji: '🌿', label: 'Atópica o muy sensible' },
      { id: 'dry', emoji: '💧', label: 'Seca' },
      { id: 'oily', emoji: '✨', label: 'Grasa o con tendencia al acné' },
      { id: 'normal', emoji: '🌸', label: 'Normal o mixta' },
    ],
    allergies: [
      { id: 'gluten', emoji: '🌾', label: 'Gluten' },
      { id: 'lactose', emoji: '🥛', label: 'Lactosa' },
      { id: 'nuts', emoji: '🥜', label: 'Frutos secos' },
      { id: 'fish', emoji: '🐟', label: 'Pescado o marisco' },
      { id: 'none', emoji: '❌', label: 'Ninguna por ahora' },
    ],
  },
  en: {
    intro: 'Tell us about you to personalize your results',
    context: 'This helps us personalize your analysis. Takes only 20 seconds.',
    step: 'Step 1 of 2',
    q1: 'What’s your skin like?',
    q2: 'Any food intolerance or allergy?',
    cta: 'See my first analysis →',
    skin: [
      { id: 'atopic', emoji: '🌿', label: 'Atopic or very sensitive' },
      { id: 'dry', emoji: '💧', label: 'Dry' },
      { id: 'oily', emoji: '✨', label: 'Oily or acne-prone' },
      { id: 'normal', emoji: '🌸', label: 'Normal or combination' },
    ],
    allergies: [
      { id: 'gluten', emoji: '🌾', label: 'Gluten' },
      { id: 'lactose', emoji: '🥛', label: 'Lactose' },
      { id: 'nuts', emoji: '🥜', label: 'Nuts' },
      { id: 'fish', emoji: '🐟', label: 'Fish or shellfish' },
      { id: 'none', emoji: '❌', label: 'None for now' },
    ],
  },
  fr: {
    intro: 'Parle-nous de toi pour personnaliser tes résultats',
    context: 'Cela nous aide à personnaliser ton analyse. Ça ne prend que 20 secondes.',
    step: 'Étape 1 sur 2',
    q1: 'Comment est ta peau ?',
    q2: 'As-tu une intolérance ou allergie alimentaire ?',
    cta: 'Voir ma première analyse →',
    skin: [
      { id: 'atopic', emoji: '🌿', label: 'Atopique ou très sensible' },
      { id: 'dry', emoji: '💧', label: 'Sèche' },
      { id: 'oily', emoji: '✨', label: 'Grasse ou à tendance acnéique' },
      { id: 'normal', emoji: '🌸', label: 'Normale ou mixte' },
    ],
    allergies: [
      { id: 'gluten', emoji: '🌾', label: 'Gluten' },
      { id: 'lactose', emoji: '🥛', label: 'Lactose' },
      { id: 'nuts', emoji: '🥜', label: 'Fruits à coque' },
      { id: 'fish', emoji: '🐟', label: 'Poisson ou crustacés' },
      { id: 'none', emoji: '❌', label: 'Aucune pour l’instant' },
    ],
  },
};

export const OnboardingQuiz = () => {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useUser();
  const { currentUser } = useAuth();
  const c = COPY[user.language] ?? COPY.es;

  const [skin, setSkin] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (val: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);
  };

  const handleSubmit = async () => {
    if (skin.length === 0 || saving) return;
    setSaving(true);
    try {
      localStorage.setItem('maseya_onboarding', JSON.stringify({ skin, allergies }));
    } catch (e) {
      console.error('localStorage setItem failed:', e);
    }

    if (currentUser?.id) {
      const cleanAllergies = allergies.filter(a => a !== 'none');
      const { error } = await supabase
        .from('health_profiles')
        .upsert(
          {
            user_id: currentUser.id,
            skin_type: skin,
            allergies: cleanAllergies,
            completion_pct: 25,
          },
          { onConflict: 'user_id' }
        );
      if (error) console.error('health_profiles upsert error:', error);
      completeOnboarding();
    }

    navigate('/scan', { replace: true });
  };



  const progress = ((skin.length > 0 ? 1 : 0) + (allergies.length > 0 ? 1 : 0)) * 50;

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="w-full sm:max-w-lg sm:mx-auto p-6 pb-32">
        <div className="flex items-center justify-between mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span>{c.step}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-6">
          <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(progress, 30)}%` }} />
        </div>

        <h1 className="font-display text-2xl font-bold mb-2 leading-tight">{c.intro}</h1>
        <p className="text-sm text-muted-foreground mb-8">{c.context}</p>

        <section className="mb-8">
          <h2 className="font-semibold mb-4">{c.q1}</h2>
          <div className="grid grid-cols-2 gap-3">
            {c.skin.map(opt => (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id, skin, setSkin)}
                className={cn(
                  'p-4 rounded-2xl border-2 text-left transition-all',
                  skin.includes(opt.id) ? 'border-primary bg-primary/5' : 'border-border bg-card'
                )}
              >
                <div className="text-2xl mb-2">{opt.emoji}</div>
                <div className="text-sm font-medium leading-tight">{opt.label}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-semibold mb-4">{c.q2}</h2>
          <div className="space-y-2">
            {c.allergies.map(opt => (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id, allergies, setAllergies)}
                className={cn(
                  'w-full p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition-all',
                  allergies.includes(opt.id) ? 'border-primary bg-primary/5' : 'border-border bg-card'
                )}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border">
        <div className="w-full sm:max-w-lg sm:mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={skin.length === 0 || saving}
            className="w-full h-14 text-lg font-semibold rounded-2xl"
          >
            {saving ? '...' : c.cta}
          </Button>
        </div>
      </div>
    </div>
  );
};
