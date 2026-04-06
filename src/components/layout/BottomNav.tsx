import { Home, Compass, CheckSquare, Users, User } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

export const BottomNav = () => {
  const location = useLocation();
  const { t } = useUser();

  const navItems = [
    { icon: Home, label: t('home'), path: '/home' },
    { icon: Compass, label: t('discover'), path: '/discover' },
    { icon: CheckSquare, label: t('routineNav'), path: '/routine' },
    { icon: Users, label: t('communityNav'), path: '/community' },
    { icon: User, label: t('profile'), path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-t border-border/50 shadow-warm-lg">
      <div className="w-full sm:max-w-lg sm:mx-auto flex items-center justify-around h-16">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 transition-all duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive && 'scale-110')} />
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
