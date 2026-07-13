import { ScanLine, History, User, Sparkles } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

export const BottomNav = () => {
  const location = useLocation();
  const { user } = useUser();

  const labels = user.language === 'fr'
    ? { scan: 'Scanner', history: 'Historique', profile: 'Profil', mira: 'Mira' }
    : user.language === 'en'
    ? { scan: 'Scan', history: 'History', profile: 'Profile', mira: 'Mira' }
    : { scan: 'Escanear', history: 'Historial', profile: 'Perfil', mira: 'Mira' };

  const navItems = [
    { icon: ScanLine, label: labels.scan, path: '/scan' },
    { icon: History, label: labels.history, path: '/history' },
    { icon: Sparkles, label: labels.mira, path: '/mira' },
    { icon: User, label: labels.profile, path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-warm-lg pb-safe">
      <div className="w-full sm:max-w-lg sm:mx-auto flex items-center justify-around h-16">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path === '/scan' && location.pathname === '/');
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
