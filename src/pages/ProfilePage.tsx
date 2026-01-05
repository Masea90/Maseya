import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { languages } from '@/lib/i18n';
import { 
  ChevronRight, 
  Crown, 
  Edit3, 
  Star, 
  Gift,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Camera,
  Globe,
  Mail,
  Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ProfileCompletenessCard } from '@/components/profile/ProfileCompletenessCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const tierInfo = {
  bronze: { min: 0, max: 200, next: 'silver' },
  silver: { min: 200, max: 500, next: 'gold' },
  gold: { min: 500, max: Infinity, next: null },
};

const getTier = (points: number) => {
  if (points >= 500) return 'gold';
  if (points >= 200) return 'silver';
  return 'bronze';
};

const ProfilePage = () => {
  const { user, t, updateUser } = useUser();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { percentage, tier: profileTier, tierLabel, completedItems, missingItems } = useProfileCompleteness(user);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const pointsTier = getTier(user.points);
  const tierData = tierInfo[pointsTier];
  const progress = pointsTier === 'gold' 
    ? 100 
    : ((user.points - tierData.min) / (tierData.max - tierData.min)) * 100;

  const currentLang = languages.find(l => l.code === user.language);

  // Load existing photo on mount
  useEffect(() => {
    const loadPhoto = async () => {
      if (!currentUser) return;
      
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(currentUser.id);
      
      if (files && files.length > 0) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(`${currentUser.id}/${files[0].name}`);
        setPhotoUrl(`${publicUrl}?t=${Date.now()}`);
      }
    };
    loadPhoto();
  }, [currentUser]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${currentUser.id}/avatar.${fileExt}`;

      // Delete existing
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(currentUser.id);
      
      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('avatars')
          .remove(existingFiles.map(f => `${currentUser.id}/${f.name}`));
      }

      // Upload new
      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newUrl = `${publicUrl}?t=${Date.now()}`;
      setPhotoUrl(newUrl);
      await updateUser({ hasProfilePhoto: true });
      toast.success('Photo updated!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = () => {
    if (user.nickname) return user.nickname.slice(0, 2).toUpperCase();
    if (user.name) return user.name.slice(0, 2).toUpperCase();
    return '👤';
  };

  const tierColors = {
    bronze: 'text-amber-600',
    silver: 'text-gray-400',
    gold: 'text-yellow-500',
  };

  const menuItems = [
    { icon: Edit3, label: t('mySkinHairProfile'), to: '/profile/edit' },
    { icon: Gift, label: t('rewardsStore'), to: '/rewards' },
    { icon: Camera, label: t('scanHistory'), to: '/scan/history', premium: true },
    { icon: Globe, label: `${t('language')}: ${currentLang?.label}`, to: '/settings/language' },
    { icon: Bell, label: t('notifications'), to: '/settings/notifications' },
    { icon: Shield, label: t('privacy'), to: '/settings/privacy' },
    { icon: HelpCircle, label: t('helpSupport'), to: '/help' },
  ];

  return (
    <AppLayout title={t('profile')} showSettings>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Profile Header */}
        <div className="bg-card rounded-3xl p-6 shadow-warm text-center relative overflow-hidden">
          {user.isPremium && (
            <div className="absolute top-0 right-0 bg-maseya-gold text-white text-xs font-medium px-3 py-1 rounded-bl-2xl flex items-center gap-1">
              <Crown className="w-3 h-3" />
              {t('premium')}
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="relative w-24 h-24 mx-auto mb-3 group"
          >
            <Avatar className="w-24 h-24 border-4 border-primary/20">
              <AvatarImage src={photoUrl || undefined} alt="Profile" />
              <AvatarFallback className="bg-secondary text-3xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </button>
          <h1 className="font-display text-xl font-semibold">
            {user.nickname || user.name}
          </h1>
          {currentUser && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <Mail className="w-3 h-3" />
              {currentUser.email}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{t('memberSince')} 2024</p>
          
          <Link
            to="/profile/edit"
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium"
          >
            <Edit3 className="w-4 h-4" />
            {t('editProfile')}
          </Link>
        </div>

        {/* Profile Completeness */}
        <ProfileCompletenessCard 
          percentage={percentage}
          tier={profileTier}
          tierLabel={tierLabel}
          completedItems={completedItems}
          missingItems={missingItems}
        />

        {/* Points & Tier */}
        <div className="bg-card rounded-2xl p-5 shadow-warm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-maseya-gold/20 rounded-full flex items-center justify-center">
                <Star className={cn('w-6 h-6', tierColors[pointsTier])} />
              </div>
              <div>
                <p className="font-semibold text-foreground capitalize">{t(pointsTier)} {t('tier')}</p>
                <p className="text-sm text-muted-foreground">{user.points} {t('points')}</p>
              </div>
            </div>
            <Link
              to="/rewards"
              className="text-sm text-primary font-medium flex items-center gap-1"
            >
              {t('rewards')}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {pointsTier !== 'gold' && tierData.next && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{user.points} pts</span>
                <span>{tierData.max} {t('ptsTo')} {t(tierData.next as 'silver' | 'gold')}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-maseya-gold rounded-full transition-all duration-500"
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
            className="block bg-gradient-to-r from-maseya-gold/20 to-maseya-terracotta/20 border-2 border-maseya-gold/40 rounded-2xl p-4 shadow-warm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-maseya-gold/30 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-maseya-gold" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{t('upgradeToPremium')}</p>
                <p className="text-sm text-muted-foreground">{t('unlockAiScans')}</p>
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
                  <span className="text-[10px] bg-maseya-gold/20 text-maseya-gold px-2 py-0.5 rounded-full font-medium">
                    {t('premium')}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button 
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full flex items-center justify-center gap-2 p-4 text-destructive hover:bg-destructive/10 rounded-2xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{t('logOut')}</span>
        </button>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
