import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { History as HistoryIcon, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { productFromHistoryRow } from '@/lib/slimProduct';
import {
  flagIngredients,
  calculateScoreBreakdown,
  calculatePersonalScoreBreakdown,
  isSupplement,
  isAlcoholicFood,
  loadOnboarding,
} from '@/lib/scoring';
import { hasHealthDataConsent } from '@/components/consent/ConsentModal';
import { buildActiveProfile } from '@/lib/activeProfile';

interface ScanRow {
  id: string;
  barcode: string | null;
  product_name: string | null;
  product_image: string | null;
  category: string | null;
  source?: string | null;
  scanned_at: string;
  scores: { global?: number } | null;
  product_data?: unknown;
}

interface HistoryItem extends ScanRow {
  scanCount: number;
  groupIds: string[];
}


const COPY = {
  es: {
    title: 'Historial',
    empty: 'Tu historial de escaneos aparecerá aquí.',
    times: 'veces',
    once: '1 vez',
    clear: 'Vaciar historial',
    clearTitle: '¿Vaciar todo el historial?',
    clearDesc: 'Esta acción no se puede deshacer. Se eliminarán todos tus escaneos.',
    cancel: 'Cancelar',
    confirm: 'Vaciar',
    delete: 'Eliminar',
    deleted: 'Escaneo eliminado',
    clearedAll: 'Historial vaciado',
    stale: 'nota guardada',
    tabHistory: 'Historial',
    tabFavorites: 'Favoritos',
    favEmpty: 'Aún no tienes favoritos. Pulsa el corazón en cualquier producto para guardarlo aquí.',
    favRemove: 'Quitar de favoritos',
    favRemoved: 'Quitado de favoritos',
    favError: 'No se ha podido quitar. Inténtalo de nuevo.',
    favAnon: 'Crea tu cuenta para guardar tus productos favoritos.',
  },
  en: {
    title: 'History',
    empty: 'Your scan history will appear here.',
    times: 'times',
    once: '1 time',
    clear: 'Clear history',
    clearTitle: 'Clear all history?',
    clearDesc: 'This cannot be undone. All your scans will be removed.',
    cancel: 'Cancel',
    confirm: 'Clear',
    delete: 'Delete',
    deleted: 'Scan deleted',
    clearedAll: 'History cleared',
    stale: 'saved score',
    tabHistory: 'History',
    tabFavorites: 'Favorites',
    favEmpty: 'No favorites yet. Tap the heart on any product to save it here.',
    favRemove: 'Remove from favorites',
    favRemoved: 'Removed from favorites',
    favError: "Couldn't remove it. Please try again.",
    favAnon: 'Create your account to save your favorite products.',
  },
  fr: {
    title: 'Historique',
    empty: 'Ton historique de scans apparaîtra ici.',
    times: 'fois',
    once: '1 fois',
    clear: 'Vider l’historique',
    clearTitle: 'Vider tout l’historique ?',
    clearDesc: 'Action irréversible. Tous tes scans seront supprimés.',
    cancel: 'Annuler',
    confirm: 'Vider',
    delete: 'Supprimer',
    deleted: 'Scan supprimé',
    clearedAll: 'Historique vidé',
    stale: 'note enregistrée',
    tabHistory: 'Historique',
    tabFavorites: 'Favoris',
    favEmpty: "Pas encore de favoris. Appuie sur le cœur d'un produit pour l'enregistrer ici.",
    favRemove: 'Retirer des favoris',
    favRemoved: 'Retiré des favoris',
    favError: "Impossible de le retirer. Réessaie.",
    favAnon: 'Crée ton compte pour enregistrer tes produits favoris.',
  },
};


const ANON_KEY = 'maseya_anon_history';

function readAnonHistory(): ScanRow[] {
  try {
    const raw = localStorage.getItem(ANON_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAnonHistory(rows: ScanRow[]) {
  try {
    localStorage.setItem(ANON_KEY, JSON.stringify(rows));
  } catch {}
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-2xl p-3 flex gap-3 items-center"
        >
          <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
          <Skeleton className="h-5 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

const HistoryPage = () => {
  const { user } = useUser();
  const { currentUser } = useAuth();
  const c = COPY[user.language] ?? COPY.es;
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [favItems, setFavItems] = useState<HistoryItem[]>([]);
  const [favLoading, setFavLoading] = useState(true);
  const [tab, setTab] = useState<'history' | 'favorites'>('history');
  const [loading, setLoading] = useState(true);
  const [healthProfile, setHealthProfile] = useState<Record<string, unknown> | null>(null);
  const [healthConsent, setHealthConsent] = useState<boolean>(() => hasHealthDataConsent());


  // Consent is hydrated DB→localStorage asynchronously after sign-in, so read
  // it reactively instead of once at mount.
  useEffect(() => {
    const refresh = () => setHealthConsent(hasHealthDataConsent());
    refresh();
    window.addEventListener('maseya:consent-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('maseya:consent-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [currentUser?.id]);

  // One profile fetch for the whole page (never per row).
  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setHealthProfile(data as Record<string, unknown>); });
  }, [currentUser?.id]);

  // Recompute each card's score locally with the CURRENT engine and profile
  // (no network per item). Falls back to the stored score when the row has no
  // scorable payload.
  const scores = useMemo(() => {
    const profile = buildActiveProfile(
      healthProfile,
      loadOnboarding() as unknown as Record<string, unknown>,
    );
    const map = new Map<string, { value: number | undefined; stale: boolean }>();
    for (const s of items) {
      const saved = typeof s.scores?.global === 'number' ? s.scores.global : undefined;
      let entry = { value: saved, stale: saved !== undefined };
      try {
        const product = productFromHistoryRow({
          barcode: s.barcode,
          product_name: s.product_name,
          product_image: s.product_image,
          category: s.category,
          source: s.source,
          product_data: s.product_data,
        });
        if (product) {
          const nonScorable = product.category === 'food'
            && (isSupplement(product) || isAlcoholicFood(product));
          if (nonScorable) {
            entry = { value: undefined, stale: false };
          } else {
            const flagged = flagIngredients(product);
            const base = calculateScoreBreakdown(product, flagged).score;
            const value = healthConsent
              ? calculatePersonalScoreBreakdown(product, flagged, profile, base).score
              : base;
            entry = { value, stale: false };
          }
        }
      } catch (e) {
        console.warn('[history] score recompute failed', e);
      }
      map.set(s.id, entry);
    }
    return map;
  }, [items, healthProfile, healthConsent]);


  const scoreFor = (s: HistoryItem) =>
    scores.get(s.id) ?? { value: s.scores?.global, stale: true };



  const groupRows = (rows: ScanRow[]): HistoryItem[] => {
    const seen = new Map<string, { scan: ScanRow; count: number; ids: string[] }>();
    for (const scan of rows) {
      const key = scan.barcode ?? scan.id;
      const existing = seen.get(key);
      if (existing) {
        existing.count++;
        existing.ids.push(scan.id);
      } else {
        seen.set(key, { scan, count: 1, ids: [scan.id] });
      }
    }
    return Array.from(seen.values()).map(({ scan, count, ids }) => ({
      ...scan,
      scanCount: count,
      groupIds: ids,
    }));
  };

  useEffect(() => {
    if (!currentUser?.id) {
      setItems(groupRows(readAnonHistory()));
      setLoading(false);
      return;
    }
    supabase
      .from('scan_history')
      .select('id,barcode,product_name,product_image,category,source,scanned_at,scores,product_data')
      .eq('user_id', currentUser.id)
      .order('scanned_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
          console.error('[history] load', error);
          setItems([]);
        } else {
          setItems(groupRows((data as ScanRow[] | null) ?? []));
        }
        setLoading(false);
      });
  }, [currentUser?.id]);

  const deleteGroup = async (item: HistoryItem) => {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== item.id));
    if (currentUser?.id) {
      const { error } = await supabase
        .from('scan_history')
        .delete()
        .in('id', item.groupIds)
        .eq('user_id', currentUser.id);
      if (error) {
        console.error('[history] delete', error);
        setItems(prev);
        toast({ title: 'Error', variant: 'destructive' });
        return;
      }
    } else {
      const rows = readAnonHistory().filter((r) => !item.groupIds.includes(r.id));
      writeAnonHistory(rows);
    }
    toast({ title: c.deleted });
  };

  const clearAll = async () => {
    const prev = items;
    setItems([]);
    if (currentUser?.id) {
      const { error } = await supabase
        .from('scan_history')
        .delete()
        .eq('user_id', currentUser.id);
      if (error) {
        console.error('[history] clear', error);
        setItems(prev);
        toast({ title: 'Error', variant: 'destructive' });
        return;
      }
    } else {
      writeAnonHistory([]);
    }
    toast({ title: c.clearedAll });
  };

  return (
    <AppLayout title={c.title}>
      <div className="px-4 py-6 space-y-3">
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5">
                  <Trash2 className="w-4 h-4" />
                  {c.clear}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{c.clearTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{c.clearDesc}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {c.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {loading ? (
          <HistorySkeleton />
        ) : items.length === 0 ? (
          <div className="px-4 py-12 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <HistoryIcon className="w-10 h-10 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">{c.empty}</p>
          </div>
        ) : (
          items.map((s) => (
            <div
              key={s.id}
              className="bg-card border border-border rounded-2xl p-3 flex gap-3 items-center hover:bg-muted/50 transition-colors"
            >
              <Link
                to={s.barcode ? `/result/${encodeURIComponent(s.barcode)}` : '#'}
                state={{ skipHistory: true }}
                className="flex-1 flex gap-3 items-center min-w-0"
              >
                {s.product_image ? (
                  <img
                    src={s.product_image}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {s.product_name || s.barcode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.scanned_at).toLocaleDateString()}
                    {s.scanCount > 1 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                        {s.scanCount} {c.times}
                      </span>
                    )}
                  </p>
                </div>
                {typeof scoreFor(s).value === 'number' && (
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-primary">
                      {scoreFor(s).value}
                    </div>
                    {scoreFor(s).stale && (
                      <div className="text-[9px] text-muted-foreground">{c.stale}</div>
                    )}
                  </div>
                )}
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    aria-label={c.delete}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{c.delete}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {s.product_name || s.barcode}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{c.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteGroup(s)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {c.delete}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
};

export default HistoryPage;
