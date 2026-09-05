import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { track } from '@/lib/analytics';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignupInvite } from '@/components/onboarding/SignupInvite';
import { cn } from '@/lib/utils';

const COPY = {
  es: { add: 'Guardar en favoritos', remove: 'Quitar de favoritos', added: 'Guardado en favoritos', removed: 'Quitado de favoritos', error: 'No se ha podido guardar. Inténtalo de nuevo.' },
  en: { add: 'Save to favorites', remove: 'Remove from favorites', added: 'Saved to favorites', removed: 'Removed from favorites', error: "Couldn't save. Please try again." },
  fr: { add: 'Ajouter aux favoris', remove: 'Retirer des favoris', added: 'Ajouté aux favoris', removed: 'Retiré des favoris', error: "Impossible d'enregistrer. Réessaie." },
};

interface Props {
  barcode: string;
  className?: string;
}

/**
 * Heart toggle shown on a product page. Anonymous users get the SAME signup
 * invitation already used by the locked personal score — no new screen.
 */
export const FavoriteButton = ({ barcode, className }: Props) => {
  const { currentUser } = useAuth();
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;
  const [isFav, setIsFav] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.id || !barcode) { setIsFav(false); return; }
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('barcode', barcode)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setIsFav(!!data); });
    return () => { cancelled = true; };
  }, [currentUser?.id, barcode]);

  const toggle = async () => {
    if (!currentUser?.id) { setShowInvite(true); return; }
    if (busy || !barcode) return;
    const next = !isFav;
    setBusy(true);
    setIsFav(next); // optimistic
    const { error } = next
      ? await supabase.from('favorites').insert({ user_id: currentUser.id, barcode })
      : await supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('barcode', barcode);
    setBusy(false);
    if (error) {
      console.error('[favorites] toggle failed', error);
      setIsFav(!next); // revert
      toast({ title: c.error, variant: 'destructive' });
      return;
    }
    track(next ? 'favorite_added' : 'favorite_removed', { barcode });
    window.dispatchEvent(new CustomEvent('maseya:favorites-updated'));
    toast({ title: next ? c.added : c.removed });
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={isFav}
        aria-label={isFav ? c.remove : c.add}
        className={cn(
          'p-2 rounded-full transition-colors shrink-0 disabled:opacity-60',
          isFav ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10',
          className,
        )}
      >
        <Heart className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} />
      </button>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{c.add}</DialogTitle>
          </DialogHeader>
          <SignupInvite compact />
        </DialogContent>
      </Dialog>
    </>
  );
};
