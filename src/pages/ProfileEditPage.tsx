import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BottomNav } from '@/components/layout/BottomNav';

const skinConcernOptions = [
  { id: 'acne', label: 'Acne', emoji: '🔴' },
  { id: 'dryness', label: 'Dryness', emoji: '🏜️' },
  { id: 'oiliness', label: 'Oiliness', emoji: '💧' },
  { id: 'aging', label: 'Aging', emoji: '⏳' },
  { id: 'sensitivity', label: 'Sensitivity', emoji: '🌸' },
  { id: 'hyperpigmentation', label: 'Dark spots', emoji: '🎯' },
];

const hairTypeOptions = [
  { id: 'straight', label: 'Straight', emoji: '➖' },
  { id: 'wavy', label: 'Wavy', emoji: '〰️' },
  { id: 'curly', label: 'Curly', emoji: '🌀' },
  { id: 'coily', label: 'Coily', emoji: '➰' },
];

const hairConcernOptions = [
  { id: 'dryness', label: 'Dryness', emoji: '🏜️' },
  { id: 'frizz', label: 'Frizz', emoji: '💨' },
  { id: 'thinning', label: 'Thinning', emoji: '📉' },
  { id: 'dandruff', label: 'Dandruff', emoji: '❄️' },
  { id: 'damage', label: 'Damage', emoji: '⚡' },
];

const goalOptions = [
  { id: 'clear-skin', label: 'Clear skin', emoji: '✨' },
  { id: 'hydration', label: 'Deep hydration', emoji: '💦' },
  { id: 'anti-aging', label: 'Anti-aging', emoji: '🌟' },
  { id: 'hair-growth', label: 'Hair growth', emoji: '🌱' },
  { id: 'natural-products', label: 'Go natural', emoji: '🌿' },
  { id: 'routine', label: 'Build a routine', emoji: '📅' },
];

interface SectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Section = ({ title, isOpen, onToggle, children }: SectionProps) => (
  <div className="bg-card rounded-2xl shadow-warm overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
    >
      <span className="font-semibold text-foreground">{title}</span>
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
  
  const [skinConcerns, setSkinConcerns] = useState<string[]>(user.skinConcerns);
  const [hairType, setHairType] = useState(user.hairType);
  const [hairConcerns, setHairConcerns] = useState<string[]>(user.hairConcerns);
  const [goals, setGoals] = useState<string[]>(user.goals);
  
  const [openSection, setOpenSection] = useState<string | null>('skin');

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
    setGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    updateUser({
      skinConcerns,
      hairType,
      hairConcerns,
      goals,
    });
    toast.success('Profile updated!');
    navigate('/profile');
  };

  const hasChanges =
    JSON.stringify(skinConcerns) !== JSON.stringify(user.skinConcerns) ||
    hairType !== user.hairType ||
    JSON.stringify(hairConcerns) !== JSON.stringify(user.hairConcerns) ||
    JSON.stringify(goals) !== JSON.stringify(user.goals);

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

      <main className="flex-1 pb-36 overflow-y-auto">
        <div className="px-4 py-6 space-y-4 animate-fade-in">
          {/* Skin Concerns */}
          <Section
            title="🧴 Skin Concerns"
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
                  label={option.label}
                />
              ))}
            </div>
          </Section>

          {/* Hair Type */}
          <Section
            title="💇 Hair Type"
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
                  label={option.label}
                />
              ))}
            </div>
          </Section>

          {/* Hair Concerns */}
          <Section
            title="✨ Hair Concerns"
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
                  label={option.label}
                />
              ))}
            </div>
          </Section>

          {/* Goals */}
          <Section
            title="🎯 Your Goals"
            isOpen={openSection === 'goals'}
            onToggle={() => setOpenSection(openSection === 'goals' ? null : 'goals')}
          >
            <div className="grid grid-cols-2 gap-2">
              {goalOptions.map(option => (
                <OptionButton
                  key={option.id}
                  selected={goals.includes(option.id)}
                  onClick={() => toggleGoal(option.id)}
                  emoji={option.emoji}
                  label={option.label}
                />
              ))}
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
