import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { History as HistoryIcon } from 'lucide-react';

interface ScanRow {
  id: string;
  barcode: string | null;
  product_name: string | null;
  product_image: string | null;
  category: string | null;
  scanned_at: string;
  scores: { global?: number } | null;
}

const COPY = {
  es: { title: 'Historial', empty: 'Tu historial de escaneos aparecerá aquí.' },
  en: { title: 'History', empty: 'Your scan history will appear here.' },
  fr: { title: 'Historique', empty: 'Ton historique de scans apparaîtra ici.' },
};

const HistoryPage = () => {
  const { user } = useUser();
  const { currentUser } = useAuth();
  const c = COPY[user.language] ?? COPY.es;
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) { setLoading(false); return; }
    supabase
      .from('scan_history')
      .select('id,barcode,product_name,product_image,category,scanned_at,scores')
      .eq('user_id', currentUser.id)
      .order('scanned_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) console.error('[history] load', error);
        setScans((data as ScanRow[] | null) ?? []);
        setLoading(false);
      });
  }, [currentUser?.id]);

  return (
    <AppLayout title={c.title}>
      <div className="px-4 py-6 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-12">...</div>
        ) : scans.length === 0 ? (
          <div className="px-4 py-12 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <HistoryIcon className="w-10 h-10 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">{c.empty}</p>
          </div>
        ) : (
          scans.map(s => (
            <Link
              key={s.id}
              to={s.barcode ? `/result/${encodeURIComponent(s.barcode)}` : '#'}
              className="bg-card border border-border rounded-2xl p-3 flex gap-3 items-center hover:bg-muted/50 transition-colors"
            >
              {s.product_image ? (
                <img src={s.product_image} alt="" className="w-14 h-14 rounded-xl object-cover bg-muted" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.product_name || s.barcode}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.scanned_at).toLocaleDateString()}
                </p>
              </div>
              {typeof s.scores?.global === 'number' && (
                <div className="text-sm font-bold text-primary">{s.scores.global}</div>
              )}
            </Link>
          ))
        )}
      </div>
    </AppLayout>
  );
};

export default HistoryPage;
