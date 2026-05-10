import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePremium } from '@/lib/premium';

interface HeaderProps {
  title?: string;
  className?: string;
}

export const Header = ({ title, className }: HeaderProps) => {
  const location = useLocation();
  const isScan = location.pathname === '/scan' || location.pathname === '/';
  const premium = usePremium();

  return (
    <header className={cn('sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60', className)}>
      <div className="flex items-center justify-between h-14 px-4 w-full sm:max-w-lg sm:mx-auto">
        {isScan ? (
          <Link to="/scan" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary tracking-tight">MASEYA</span>
            {premium && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold tracking-wider">
                PRO
              </span>
            )}
          </Link>
        ) : (
          <h1 className="font-display text-lg font-semibold flex items-center gap-2">
            {title}
            {premium && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[9px] font-bold tracking-wider">
                PRO
              </span>
            )}
          </h1>
        )}
      </div>
    </header>
  );
};
