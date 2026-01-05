import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { 
  ChevronRight, 
  Crown, 
  Settings, 
  Edit3, 
  Star, 
  Gift,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Camera
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tierInfo = {
  bronze: { min: 0, max: 200, color: 'text-amber-600', next: 'Silver' },
  silver: { min: 200, max: 500, color: 'text-gray-400', next: 'Gold' },
  gold: { min: 500, max: Infinity, color: 'text-yellow-500', next: null },
};

const getTier = (points: number) => {
  if (points >= 500) return 'gold';
  if (points >= 200) return 'silver';
  return 'bronze';
};

const ProfilePage = () => {
  const { user } = useUser();
  const tier = getTier(user.points);
  const tierData = tierInfo[tier];
  const progress = tier === 'gold' 
    ? 100 
    : ((user.points - tierData.min) / (tierData.max - tierData.min)) * 100;

  const menuItems = [
    { icon: Edit3, label: 'My Skin & Hair Profile', to: '/profile/edit' },
    { icon: Gift, label: 'Rewards Store', to: '/rewards' },
    { icon: Camera, label: 'Scan History', to: '/scan/history', premium: true },
    { icon: Bell, label: 'Notifications', to: '/settings/notifications' },
    { icon: Shield, label: 'Privacy', to: '/settings/privacy' },
    { icon: HelpCircle, label: 'Help & Support', to: '/help' },
  ];

  return (
    <AppLayout title="Profile" showSettings>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Profile Header */}
        <div className="bg-card rounded-3xl p-6 shadow-warm text-center relative overflow-hidden">
          {user.isPremium && (
            <div className="absolute top-0 right-0 bg-zwina-gold text-white text-xs font-medium px-3 py-1 rounded-bl-2xl flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Premium
            </div>
          )}
          
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center text-4xl mx-auto mb-3">
            👩🏻
          </div>
          <h1 className="font-display text-xl font-semibold">{user.name}</h1>
          <p className="text-sm text-muted-foreground">Member since 2024</p>
          
          <Link
            to="/profile/edit"
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </Link>
        </div>

        {/* Points & Tier */}
        <div className="bg-card rounded-2xl p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zwina-gold/20 rounded-full flex items-center justify-center">
                <Star className={cn('w-6 h-6', tierData.color)} />
              </div>
              <div>
                <p className="font-semibold text-foreground capitalize">{tier} Tier</p>
                <p className="text-sm text-muted-foreground">{user.points} points</p>
              </div>
            </div>
            <Link
              to="/rewards"
              className="text-sm text-primary font-medium flex items-center gap-1"
            >
              Rewards
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {tier !== 'gold' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{user.points} pts</span>
                <span>{tierData.max} pts to {tierData.next}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-zwina-gold rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Premium Upgrade */}
        {!user.isPremium && (
          <Link
            to="/premium"
            className="block bg-gradient-to-r from-zwina-gold/20 to-zwina-terracotta/20 border-2 border-zwina-gold/40 rounded-2xl p-4 shadow-warm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zwina-gold/30 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-zwina-gold" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Upgrade to Premium</p>
                <p className="text-sm text-muted-foreground">Unlock AI scans & more</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>
        )}

        {/* Menu */}
        <div className="bg-card rounded-2xl shadow-warm overflow-hidden divide-y divide-border">
          {menuItems.map(item => (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{item.label}</span>
                {item.premium && !user.isPremium && (
                  <span className="text-[10px] bg-zwina-gold/20 text-zwina-gold px-2 py-0.5 rounded-full font-medium">
                    Premium
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button className="w-full flex items-center justify-center gap-2 p-4 text-destructive hover:bg-destructive/10 rounded-2xl transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
