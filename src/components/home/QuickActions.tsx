import { PlayCircle, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';

export const QuickActions = () => {
  const { t } = useUser();

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold">{t('quickActions')}</h2>
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/routine"
          className="bg-gradient-olive text-primary-foreground rounded-2xl p-4 shadow-warm transition-all hover:opacity-90"
        >
          <PlayCircle className="w-6 h-6 mb-2" />
          <p className="font-medium">{t('startRoutine')}</p>
          <p className="text-sm opacity-80">{t('morningCare')}</p>
        </Link>

        <Link
          to="/discover"
          className="rounded-2xl p-4 shadow-warm transition-all bg-primary/10 border border-primary/30"
        >
          <Compass className="w-6 h-6 mb-2 text-primary" />
          <p className="font-medium">{t('discover')}</p>
          <p className="text-sm text-muted-foreground">{t('recommendations')}</p>
        </Link>
      </div>
    </div>
  );
};
