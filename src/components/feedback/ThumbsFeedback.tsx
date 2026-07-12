import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { FeedbackDialog } from './FeedbackDialog';

type Lang = 'es' | 'en' | 'fr';

const COPY: Record<Lang, {
  question: string;
  thanks: string;
  tellUsWhy: string;
}> = {
  es: {
    question: '¿Te ha sido útil este análisis?',
    thanks: '¡Gracias!',
    tellUsWhy: 'Cuéntanos por qué',
  },
  en: {
    question: 'Was this analysis helpful?',
    thanks: 'Thanks!',
    tellUsWhy: 'Tell us why',
  },
  fr: {
    question: 'Cette analyse t\'a-t-elle été utile ?',
    thanks: 'Merci !',
    tellUsWhy: 'Dis-nous pourquoi',
  },
};

interface ThumbsFeedbackProps {
  barcode: string;
  productName: string;
  scoreGeneral: number;
  scorePersonal: number;
}

const storageKey = (barcode: string) => `maseya_thumbs::${barcode}`;

export const ThumbsFeedback = ({ barcode, productName, scoreGeneral, scorePersonal }: ThumbsFeedbackProps) => {
  const { currentUser } = useAuth();
  const { user } = useUser();
  const lang = (user.language as Lang) || 'es';
  const c = COPY[lang] ?? COPY.es;

  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey(barcode));
      if (v === 'up' || v === 'down') setVoted(v);
      else setVoted(null);
    } catch {
      setVoted(null);
    }
  }, [barcode]);

  const vote = async (rating: 'up' | 'down') => {
    if (voted) return;
    setVoted(rating);
    try { localStorage.setItem(storageKey(barcode), rating); } catch {}
    const context = {
      barcode,
      product_name: productName,
      score_general: scoreGeneral,
      score_personal: scorePersonal,
    };
    const { error } = await supabase.from('feedback').insert([{
      type: 'thumbs',
      rating,
      user_id: currentUser?.id ?? null,
      context,
    }]);
    if (error) console.error('[thumbs] insert', error);
  };

  return (
    <>
      <div className="bg-card rounded-2xl border border-border p-3 flex items-center justify-between gap-3">
        {voted ? (
          <>
            <span className="text-sm text-muted-foreground">{c.thanks}</span>
            {voted === 'down' && (
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="text-xs text-primary underline underline-offset-2 hover:opacity-80"
              >
                {c.tellUsWhy}
              </button>
            )}
          </>
        ) : (
          <>
            <span className="text-sm text-foreground/90">{c.question}</span>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="thumbs up"
                onClick={() => vote('up')}
                className="w-9 h-9 rounded-full border border-border hover:bg-primary/10 hover:border-primary/40 flex items-center justify-center transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="thumbs down"
                onClick={() => vote('down')}
                className="w-9 h-9 rounded-full border border-border hover:bg-destructive/10 hover:border-destructive/40 flex items-center justify-center transition-colors"
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
      <FeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        extraContext={{
          barcode,
          product_name: productName,
          score_general: scoreGeneral,
          score_personal: scorePersonal,
          from: 'thumbs_down',
        }}
      />
    </>
  );
};
