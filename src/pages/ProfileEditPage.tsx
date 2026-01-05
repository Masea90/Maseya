import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronDown, ChevronUp, ChevronLeft, Info, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProfileBadge } from '@/components/profile/ProfileBadge';
import { ProfilePhotoUpload } from '@/components/profile/ProfilePhotoUpload';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

const skinConcernOptions = [
  { id: 'acne', labelKey: 'acne', emoji: '🔴' },
  { id: 'dryness', labelKey: 'dryness', emoji: '🏜️' },
  { id: 'oiliness', labelKey: 'oiliness', emoji: '💧' },
  { id: 'aging', labelKey: 'aging', emoji: '⏳' },
  { id: 'sensitivity', labelKey: 'sensitivity', emoji: '🌸' },
  { id: 'hyperpigmentation', labelKey: 'hyperpigmentation', emoji: '🎯' },
] as const;

const hairTypeOptions = [
  { id: 'straight', labelKey: 'straight', emoji: '➖' },
  { id: 'wavy', labelKey: 'wavy', emoji: '〰️' },
  { id: 'curly', labelKey: 'curly', emoji: '🌀' },
  { id: 'coily', labelKey: 'coily', emoji: '➰' },
] as const;

const hairConcernOptions = [
  { id: 'dryness', labelKey: 'dryness', emoji: '🏜️' },
  { id: 'frizz', labelKey: 'frizz', emoji: '💨' },
  { id: 'thinning', labelKey: 'thinning', emoji: '📉' },
  { id: 'dandruff', labelKey: 'dandruff', emoji: '🏔️' },
  { id: 'damage', labelKey: 'damage', emoji: '⚡' },
] as const;

const goalOptions = [
  { id: 'clear-skin', labelKey: 'clearSkin', emoji: '✨' },
  { id: 'hydration', labelKey: 'hydration', emoji: '💦' },
  { id: 'anti-aging', labelKey: 'antiAging', emoji: '🌟' },
  { id: 'hair-growth', labelKey: 'hairGrowth', emoji: '🌱' },
  { id: 'natural-products', labelKey: 'natural', emoji: '🌿' },
  { id: 'routine', labelKey: 'routine', emoji: '📅' },
] as const;

const ageRangeOptions = [
  { id: '18-24', labelKey: 'age1824', emoji: '🌱' },
  { id: '25-34', labelKey: 'age2534', emoji: '🌿' },
  { id: '35-44', labelKey: 'age3544', emoji: '🌳' },
  { id: '45-54', labelKey: 'age4554', emoji: '🍂' },
  { id: '55+', labelKey: 'age55plus', emoji: '🌺' },
] as const;

const sensitivityOptions = [
  { id: 'fragrance-free', labelKey: 'fragranceFree', emoji: '🚫' },
  { id: 'sulfate-free', labelKey: 'sulfateFree', emoji: '💧' },
  { id: 'paraben-free', labelKey: 'parabenFree', emoji: '🧪' },
  { id: 'vegan', labelKey: 'vegan', emoji: '🌱' },
  { id: 'cruelty-free', labelKey: 'crueltyFree', emoji: '🐰' },
  { id: 'alcohol-free', labelKey: 'alcoholFree', emoji: '🍷' },
  { id: 'silicone-free', labelKey: 'siliconeFree', emoji: '✨' },
] as const;

const climateOptions = [
  { id: 'tropical', labelKey: 'climateTropical', emoji: '🌴' },
  { id: 'dry', labelKey: 'climateDry', emoji: '🏜️' },
  { id: 'temperate', labelKey: 'climateTemperate', emoji: '🌤️' },
  { id: 'continental', labelKey: 'climateContinental', emoji: '❄️' },
  { id: 'mediterranean', labelKey: 'climateMediterranean', emoji: '🌊' },
] as const;

interface SectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hint?: string;
}

const Section = ({ title, isOpen, onToggle, children, hint }: SectionProps) => (
  <div className="bg-card rounded-2xl shadow-warm overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">{title}</span>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-xs">
              {hint}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {isOpen ? (
        <ChevronUp className="w-5 h-5 text-muted-foreground" />
      ) : (
        <ChevronDown className="w-5 h-5 text-muted-foreground" />
      )}
    </button>
    {isOpen && <div className="px-4 pb-4">{children}</div>}
  </div>
);

interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}

const OptionButton = ({ selected, onClick, emoji, label }: OptionButtonProps) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all',
      selected
        ? 'border-primary bg-primary/10'
        : 'border-border bg-background hover:border-primary/40'
    )}
  >
    <span className="text-lg">{emoji}</span>
    <span className="font-medium text-sm">{label}</span>
    {selected && <Check className="w-4 h-4 text-primary ml-auto" />}
  </button>
);

const ProfileEditPage = () => {
  const navigate = useNavigate();
  const { user, updateUser, t } = useUser();
  const { currentUser } = useAuth();
  const { percentage, tier, tierLabel } = useProfileCompleteness(user);
  const { detectLocation, isLoading: isDetectingLocation } = useGeolocation();
  
  const [nickname, setNickname] = useState(user.nickname || '');
  const [skinConcerns, setSkinConcerns] = useState<string[]>(user.skinConcerns);
  const [hairType, setHairType] = useState(user.hairType);
  const [hairConcerns, setHairConcerns] = useState<string[]>(user.hairConcerns);
  const [goals, setGoals] = useState<string[]>(user.goals);
  const [ageRange, setAgeRange] = useState(user.ageRange || '');
  const [sensitivities, setSensitivities] = useState<string[]>(user.sensitivities || []);
  const [country, setCountry] = useState(user.country || '');
  const [climateType, setClimateType] = useState(user.climateType || '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [hasProfilePhoto, setHasProfilePhoto] = useState(user.hasProfilePhoto || false);
  
  const [openSection, setOpenSection] = useState<string | null>('photo');

  // Load existing photo URL on mount
  useEffect(() => {
    const loadPhotoUrl = async () => {
      if (!currentUser?.id) return;
      
      try {
        const { data: files } = await supabase.storage
          .from('avatars')
          .list(currentUser.id);
        
        if (files && files.length > 0) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(`${currentUser.id}/${files[0].name}`);
          setPhotoUrl(`${publicUrl}?t=${Date.now()}`);
        }
      } catch (error) {
        console.error('Error loading photo:', error);
      }
    };
    
    loadPhotoUrl();
  }, [currentUser?.id]);

  const handleDetectLocation = async () => {
    const result = await detectLocation();
    if (result) {
      if (result.country) setCountry(result.country);
      if (result.climateType) setClimateType(result.climateType);
      toast.success(t('locationDetected'));
    } else {
      toast.error(t('locationFailed'));
    }
  };

  const handlePhotoChange = (url: string | null, hasPhoto: boolean) => {
    setPhotoUrl(url);
    setHasProfilePhoto(hasPhoto);
  };

  const toggleSkinConcern = (id: string) => {
    setSkinConcerns(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleHairConcern = (id: string) => {
    setHairConcerns(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleGoal = (id: string) => {
    setGoals(prev => {
      if (prev.includes(id)) {
        return prev.filter(g => g !== id);
      }
      // Max 3 goals
      if (prev.length >= 3) {
        toast.info(t('maxGoalsAllowed'));
        return prev;
      }
      return [...prev, id];
    });
  };

  const toggleSensitivity = (id: string) => {
    setSensitivities(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    updateUser({
      nickname: nickname.trim(),
      skinConcerns,
      hairType,
      hairConcerns,
      goals,
      ageRange,
      sensitivities,
      country,
      climateType,
      hasProfilePhoto,
    });
    toast.success(t('save') + ' ✓');
    navigate('/profile');
  };

  const hasChanges =
    nickname.trim() !== (user.nickname || '') ||
    JSON.stringify(skinConcerns) !== JSON.stringify(user.skinConcerns) ||
    hairType !== user.hairType ||
    JSON.stringify(hairConcerns) !== JSON.stringify(user.hairConcerns) ||
    JSON.stringify(goals) !== JSON.stringify(user.goals) ||
    ageRange !== (user.ageRange || '') ||
    JSON.stringify(sensitivities) !== JSON.stringify(user.sensitivities || []) ||
    country !== (user.country || '') ||
    climateType !== (user.climateType || '') ||
    hasProfilePhoto !== (user.hasProfilePhoto || false);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header with back button */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">{t('mySkinHairProfile')}</h1>
        </div>
      </header>

      {/* Profile Completeness Banner */}
      <div className="px-4 pt-4">
        <div className="bg-card rounded-2xl p-4 shadow-warm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ProfileBadge
                percentage={percentage}
                tier={tier}
                tierLabel={tierLabel}
                size="md"
                showPercentage={false}
              />
              <span className="text-sm font-medium">{percentage}% {t('profileComplete')}</span>
            </div>
          </div>
          <Progress value={percentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {t('completeProfileForRecommendations')}
          </p>
        </div>
      </div>

      <main className="flex-1 pb-36 overflow-y-auto">
        <div className="px-4 py-6 space-y-4 animate-fade-in">
          {/* Profile Photo */}
          <Section
            title={`📷 ${t('profilePhoto')}`}
            isOpen={openSection === 'photo'}
            onToggle={() => setOpenSection(openSection === 'photo' ? null : 'photo')}
            hint={t('addPhotoHint')}
          >
            <ProfilePhotoUpload
              currentPhotoUrl={photoUrl}
              onPhotoChange={handlePhotoChange}
              nickname={nickname || user.name}
            />
          </Section>

          {/* Nickname */}
          <Section
            title={`👤 ${t('nickname')}`}
            isOpen={openSection === 'nickname'}
            onToggle={() => setOpenSection(openSection === 'nickname' ? null : 'nickname')}
          >
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('enterNickname')}
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </Section>

          {/* Age Range */}
          <Section
            title={`🎂 ${t('ageRange')}`}
            isOpen={openSection === 'age'}
            onToggle={() => setOpenSection(openSection === 'age' ? null : 'age')}
            hint={t('ageRangeHint')}
          >
            <div className="grid grid-cols-3 gap-2">
              {ageRangeOptions.map(option => (
                <OptionButton
                  key={option.id}
                  selected={ageRange === option.id}
                  onClick={() => setAgeRange(option.id)}
                  emoji={option.emoji}
                  label={option.id}
                />
              ))}
            </div>
          </Section>

          {/* Skin Concerns */}
          <Section
            title={`🧴 ${t('skinConcernsTitle')}`}
            isOpen={openSection === 'skin'}
            onToggle={() => setOpenSection(openSection === 'skin' ? null : 'skin')}
          >
            <div className="grid grid-cols-2 gap-2">
              {skinConcernOptions.map(option => (
                <OptionButton
                  key={option.id}
                  selected={skinConcerns.includes(option.id)}
                  onClick={() => toggleSkinConcern(option.id)}
                  emoji={option.emoji}
                  label={t(option.labelKey)}
                />
              ))}
            </div>
          </Section>

          {/* Hair Type */}
          <Section
            title={`💇 ${t('hairTypeTitle')}`}
            isOpen={openSection === 'hairType'}
            onToggle={() => setOpenSection(openSection === 'hairType' ? null : 'hairType')}
          >
            <div className="grid grid-cols-2 gap-2">
              {hairTypeOptions.map(option => (
                <OptionButton
                  key={option.id}
                  selected={hairType === option.id}
                  onClick={() => setHairType(option.id)}
                  emoji={option.emoji}
                  label={t(option.labelKey)}
                />
              ))}
            </div>
          </Section>

          {/* Hair Concerns */}
          <Section
            title={`✨ ${t('hairConcernsTitle')}`}
            isOpen={openSection === 'hairConcerns'}
            onToggle={() => setOpenSection(openSection === 'hairConcerns' ? null : 'hairConcerns')}
          >
            <div className="grid grid-cols-2 gap-2">
              {hairConcernOptions.map(option => (
                <OptionButton
                  key={option.id}
                  selected={hairConcerns.includes(option.id)}
                  onClick={() => toggleHairConcern(option.id)}
                  emoji={option.emoji}
                  label={t(option.labelKey)}
                />
              ))}
            </div>
          </Section>

          {/* Goals */}
          <Section
            title={`🎯 ${t('goalsTitle')}`}
            isOpen={openSection === 'goals'}
            onToggle={() => setOpenSection(openSection === 'goals' ? null : 'goals')}
            hint="Select up to 3 main goals"
          >
            <div className="grid grid-cols-2 gap-2">
              {goalOptions.map(option => (
                <OptionButton
                  key={option.id}
                  selected={goals.includes(option.id)}
                  onClick={() => toggleGoal(option.id)}
                  emoji={option.emoji}
                  label={t(option.labelKey)}
                />
              ))}
            </div>
          </Section>

          {/* Sensitivities */}
          <Section
            title={`🚫 ${t('sensitivitiesExclusions')}`}
            isOpen={openSection === 'sensitivities'}
            onToggle={() => setOpenSection(openSection === 'sensitivities' ? null : 'sensitivities')}
            hint={t('sensitivitiesHint')}
          >
            <div className="grid grid-cols-2 gap-2">
              {sensitivityOptions.map(option => (
                <OptionButton
                  key={option.id}
                  selected={sensitivities.includes(option.id)}
                  onClick={() => toggleSensitivity(option.id)}
                  emoji={option.emoji}
                  label={t(option.labelKey)}
                />
              ))}
            </div>
          </Section>

          {/* Location & Climate */}
          <Section
            title={`🌍 ${t('locationClimate')}`}
            isOpen={openSection === 'climate'}
            onToggle={() => setOpenSection(openSection === 'climate' ? null : 'climate')}
            hint={t('climateHint')}
          >
            <div className="space-y-4">
              {/* Auto-detect button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="w-full gap-2"
              >
                {isDetectingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('detecting')}
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    {t('detectMyLocation')}
                  </>
                )}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t('orSelectManually')}</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">{t('countryLabel')}</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder={t('countryPlaceholder')}
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">{t('climateTypeLabel')}</label>
                <div className="grid grid-cols-1 gap-2">
                  {climateOptions.map(option => (
                    <OptionButton
                      key={option.id}
                      selected={climateType === option.id}
                      onClick={() => setClimateType(option.id)}
                      emoji={option.emoji}
                      label={t(option.labelKey)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Section>
        </div>
      </main>

      {/* Save Button - Fixed above bottom nav */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent max-w-lg mx-auto">
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className={cn(
            'w-full h-14 text-lg font-medium rounded-2xl transition-all',
            hasChanges ? 'bg-gradient-olive shadow-warm-lg' : 'bg-muted text-muted-foreground'
          )}
        >
          {t('save')} {hasChanges && '✓'}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfileEditPage;
