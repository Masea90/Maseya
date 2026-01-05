import { AppLayout } from '@/components/layout/AppLayout';
import { GlowScore } from '@/components/home/GlowScore';
import { TodayCards } from '@/components/home/TodayCards';
import { IngredientAlerts } from '@/components/home/IngredientAlerts';
import { QuickActions } from '@/components/home/QuickActions';
import { useUser } from '@/contexts/UserContext';

const dailyQuotes = [
  "Glow from within, the rest will follow 🌸",
  "Your skin is a reflection of your inner health ✨",
  "Nature knows best — trust the process 🌿",
  "Small steps today, radiant tomorrow 💫",
];

const todayCards = [
  {
    icon: '💧',
    title: 'Skin Today',
    subtitle: 'Hydration focus',
    description: 'Your skin looks a bit dehydrated. Try adding hyaluronic acid to your routine today.',
    color: 'skin' as const,
    linkTo: '/discover?category=hydration',
  },
  {
    icon: '✨',
    title: 'Hair Today',
    subtitle: 'Scalp care day',
    description: "It's been 7 days since your last scalp treatment. Consider a gentle exfoliation!",
    color: 'hair' as const,
    linkTo: '/remedies?category=hair',
  },
  {
    icon: '🥗',
    title: 'Nutrition Tip',
    subtitle: 'Boost your glow',
    description: 'Vitamin C boosts collagen production. Add some citrus or bell peppers to your meals.',
    color: 'nutrition' as const,
    linkTo: '/discover?category=nutrition',
  },
];

const HomePage = () => {
  const { user } = useUser();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const randomQuote = dailyQuotes[Math.floor(Math.random() * dailyQuotes.length)];

  return (
    <AppLayout showSearch showNotifications>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">
            {greeting}, {user.name} ☀️
          </h1>
          <p className="text-muted-foreground text-sm italic">{randomQuote}</p>
        </div>

        {/* Streak & Points */}
        <div className="flex items-center gap-4 bg-card rounded-2xl p-4 shadow-warm">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <div>
              <p className="font-semibold text-foreground">{user.streak}-day streak</p>
              <p className="text-xs text-muted-foreground">Keep it up!</p>
            </div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <div>
              <p className="font-semibold text-foreground">{user.points} points</p>
              <p className="text-xs text-muted-foreground">Silver tier</p>
            </div>
          </div>
        </div>

        {/* Glow Score */}
        <GlowScore
          skin={user.glowScore.skin}
          hair={user.glowScore.hair}
          nutrition={user.glowScore.nutrition}
        />

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
