import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { History as HistoryIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ScanRow {
  id: string;
  barcode: string | null;
  product_name: string | null;
  product_image: string | null;
  category: string | null;
  scanned_at: string;
  scores: { global?: number } | null;
}

interface HistoryItem extends ScanRow {
  scanCount: number;
}

const COPY = {
  es: {
    title: 'Historial',
    empty: 'Tu historial de escaneos aparecerá aquí.',
    times: 'veces',
    once: '1 vez',
  },
  en: {
    title: 'History',
    empty: 'Your scan history will appear here.',
    times: 'times',
    once: '1 time',
  },
  fr: {
    title: 'Historique',
    empty: 'Ton historique de scans apparaîtra ici.',
    times: 'fois',
    once: '1 fois',
  },
};

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    // Full history available for all users — Maseya is 100% free.
    const q = supabase
      .from('scan_history')
      .select('id,barcode,product_name,product_image,category,scanned_at,scores')
      .eq('user_id', currentUser.id)
      .order('scanned_at', { ascending: false })
      .limit(500);

    q
      .then(({ data, error }) => {
        if (error) {
          console.error('[history] load', error);
          setItems([]);
          setLoading(false);
          return;
        }
        const rows = (data as ScanRow[] | null) ?? [];

        // Group by barcode: keep most recent, count total scans
        const seen = new Map<string, { scan: ScanRow; count: number }>();
        for (const scan of rows) {
          const key = scan.barcode ?? scan.id;
          const existing = seen.get(key);
          if (existing) {
            existing.count++;
          } else {
            seen.set(key, { scan, count: 1 });
          }
        }

        const deduped: HistoryItem[] = Array.from(seen.values()).map(
          ({ scan, count }) => ({ ...scan, scanCount: count }),
        );
        setItems(deduped);
        setLoading(false);
      });
  }, [currentUser?.id]);

  return (
    <AppLayout title={c.title}>
      <div className="px-4 py-6 space-y-3">
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
            <Link
              key={s.id}
              to={s.barcode ? `/result/${encodeURIComponent(s.barcode)}` : '#'}
              className="bg-card border border-border rounded-2xl p-3 flex gap-3 items-center hover:bg-muted/50 transition-colors"
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
              {typeof s.scores?.global === 'number' && (
                <div className="text-sm font-bold text-primary shrink-0">
                  {s.scores.global}
                </div>
              )}
            </Link>
          ))
        )}
      </div>
    </AppLayout>
  );
};

export default HistoryPage;
