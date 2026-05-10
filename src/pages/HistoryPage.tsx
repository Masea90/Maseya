import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { History as HistoryIcon } from 'lucide-react';

const COPY = {
  es: { title: 'Historial', empty: 'Tu historial de escaneos aparecerá aquí.' },
  en: { title: 'History', empty: 'Your scan history will appear here.' },
  fr: { title: 'Historique', empty: 'Ton historique de scans apparaîtra ici.' },
};

const HistoryPage = () => {
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;
  return (
    <AppLayout title={c.title}>
      <div className="px-4 py-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <HistoryIcon className="w-10 h-10 text-muted-foreground/60" />
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">{c.empty}</p>
      </div>
    </AppLayout>
  );
};

export default HistoryPage;
