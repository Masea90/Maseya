import { AppLayout } from '@/components/layout/AppLayout';
import { GlowScore } from '@/components/home/GlowScore';
import { TodayCards } from '@/components/home/TodayCards';
import { IngredientAlerts } from '@/components/home/IngredientAlerts';
import { QuickActions } from '@/components/home/QuickActions';
import { useUser } from '@/contexts/UserContext';

const HomePage = () => {
  const { user, t } = useUser();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? t('goodMorning') : currentHour < 17 ? t('goodAfternoon') : t('goodEvening');
  
  const dailyQuotes = [t('quote1'), t('quote2'), t('quote3'), t('quote4')];
  const randomQuote = dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)];

  const todayCards = [
    {
      icon: '💧',
      title: t('skinToday'),
      subtitle: t('hydrationFocus'),
      description: t('skinTodayDesc'),
      color: 'skin' as const,
      linkTo: '/discover?category=hydration',
    },
    {
      icon: '✨',
      title: t('hairToday'),
      subtitle: t('scalpCareDay'),
      description: t('hairTodayDesc'),
      color: 'hair' as const,
      linkTo: '/remedies?category=hair',
    },
    {
      icon: '🥗',
      title: t('nutritionTip'),
      subtitle: t('boostYourGlow'),
      description: t('nutritionTipDesc'),
      color: 'nutrition' as const,
      linkTo: '/remedies?category=nutrition',
    },
  ];

  return (
    <AppLayout showSearch showNotifications>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">
            {greeting}, {user.nickname || user.name} ☀️
          </h1>
          <p className="text-muted-foreground text-sm italic">{randomQuote}</p>
        </div>

        {/* Streak & Points */}
        <div className="flex items-center gap-4 bg-card rounded-2xl p-4 shadow-warm">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <div>
              <p className="font-semibold text-foreground">{user.streak}-{t('streak')}</p>
              <p className="text-xs text-muted-foreground">{t('keepItUp')}</p>
            </div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <div>
              <p className="font-semibold text-foreground">{user.points} {t('points')}</p>
              <p className="text-xs text-muted-foreground">{t('silver')} {t('tier').toLowerCase()}</p>
            </div>
          </div>
        </div>

        {/* Glow Score */}
        <GlowScore />

        {/* Quick Actions */}
        <QuickActions />

        {/* Today's Cards */}
        <TodayCards cards={todayCards} />

        {/* Ingredient Alerts */}
        <IngredientAlerts />
      </div>
    </AppLayout>
  );
};

export default HomePage;
