import { Search, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  showSettings?: boolean;
  className?: string;
}

export const Header = ({
  title,
  showSearch = false,
  showNotifications = false,
  showSettings = false,
  className,
}: HeaderProps) => {
  const location = useLocation();
  const isHome = location.pathname === '/home';

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50',
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 w-full sm:max-w-lg sm:mx-auto">
        <div className="flex items-center gap-3">
          {isHome ? (
            <Link to="/home" className="flex items-center gap-2">
              <img src="/favicon.png" alt="MASEYA" className="w-7 h-7 rounded" />
              <span className="font-display text-xl font-semibold text-primary">
                MASEYA
              </span>
            </Link>
          ) : (
            <h1 className="font-display text-lg font-semibold">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showSearch && (
            <Link
              to="/search"
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </Link>
          )}
          {showNotifications && <NotificationBell />}
          {showSettings && (
            <Link
              to="/settings"
              className="p-2 rounded-full hover:bg-secondary transition-colors"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
