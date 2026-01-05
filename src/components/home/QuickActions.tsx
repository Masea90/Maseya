import { Camera, PlayCircle, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

export const QuickActions = () => {
  const { user } = useUser();

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/routine"
          className="bg-gradient-olive text-primary-foreground rounded-2xl p-4 shadow-warm transition-all hover:opacity-90"
        >
          <PlayCircle className="w-6 h-6 mb-2" />
          <p className="font-medium">Start Routine</p>
          <p className="text-sm opacity-80">Morning care</p>
        </Link>

        <Link
          to={user.isPremium ? '/scan' : '/premium'}
          className={cn(
            'rounded-2xl p-4 shadow-warm transition-all relative overflow-hidden',
            user.isPremium
              ? 'bg-zwina-gold/20 border border-zwina-gold/30'
              : 'bg-muted border border-border'
          )}
        >
          {!user.isPremium && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-muted-foreground/20 rounded-full flex items-center justify-center">
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
          <Camera className={cn('w-6 h-6 mb-2', user.isPremium ? 'text-zwina-gold' : 'text-muted-foreground')} />
          <p className={cn('font-medium', !user.isPremium && 'text-muted-foreground')}>
            Skin Scan
          </p>
          <p className={cn('text-sm', user.isPremium ? 'text-foreground/70' : 'text-muted-foreground')}>
            {user.isPremium ? 'AI Analysis' : 'Premium'}
          </p>
        </Link>
      </div>
    </div>
  );
};
