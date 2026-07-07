import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  className?: string;
}

export const Header = ({ title, className }: HeaderProps) => {
  const location = useLocation();
  const isScan = location.pathname === '/scan' || location.pathname === '/';

  return (
    <header className={cn('sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60', className)}>
      <div className="flex items-center justify-between h-14 px-4 w-full sm:max-w-lg sm:mx-auto">
        {isScan ? (
          <Link to="/scan" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary tracking-tight">KHARM</span>
          </Link>
        ) : (
          <h1 className="font-display text-lg font-semibold">{title}</h1>
        )}
      </div>
    </header>
  );
};
