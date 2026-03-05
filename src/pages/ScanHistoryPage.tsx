import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Camera, Clock } from 'lucide-react';

const ScanHistoryPage = () => {
  const { t } = useUser();

  return (
    <AppLayout title={t('scanHistory')}>
      <div className="px-4 py-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h2 className="font-display text-lg font-semibold mb-2">Scan History</h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            Your AI skin and hair scan results will appear here once you've completed your first scan.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-full px-4 py-2">
            <Clock className="w-3 h-3" />
            Coming soon with Premium
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ScanHistoryPage;
