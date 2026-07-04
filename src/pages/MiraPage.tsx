import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Sparkles } from 'lucide-react';

const COPY = {
  es: { title: 'Mira AI', greeting: 'Hola, soy Mira.', body: 'Pronto podrás preguntarme cualquier cosa sobre tus escaneos, ingredientes y rutinas personalizadas.' },
  en: { title: 'Mira AI', greeting: 'Hi, I’m Mira.', body: 'Soon you’ll be able to ask me anything about your scans, ingredients and personalized routines.' },
  fr: { title: 'Mira AI', greeting: 'Salut, je suis Mira.', body: 'Bientôt tu pourras me poser toutes tes questions sur tes scans, ingrédients et routines personnalisées.' },
};

const MiraPage = () => {
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;
  return (
    <AppLayout title={c.title}>
      <div className="px-4 pt-4">
        <p className="text-[11px] text-center text-muted-foreground italic">
          Mira es una IA informativa, no un profesional sanitario.
        </p>
      </div>
      <div className="px-4 py-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-hero flex items-center justify-center mb-4 shadow-warm">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">{c.greeting}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">{c.body}</p>
      </div>
    </AppLayout>
  );
};

export default MiraPage;
