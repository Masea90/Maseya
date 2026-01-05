import { Bell, Search, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {isHome ? (
            <Link to="/home" className="flex items-center gap-2">
              <span className="text-2xl">🌿</span>
              <span className="font-display text-xl font-semibold text-primary">
                ZWINA
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
          {showNotifications && (
            <button className="p-2 rounded-full hover:bg-secondary transition-colors relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-zwina-terracotta rounded-full" />
            </button>
          )}
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
