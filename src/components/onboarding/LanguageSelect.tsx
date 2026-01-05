import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { languages, Language } from '@/lib/i18n';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LanguageSelect = () => {
  const navigate = useNavigate();
  const { user, setLanguage } = useUser();
  const [selected, setSelected] = useState<Language | null>(user.language || null);

  const handleSelect = (lang: Language) => {
    setSelected(lang);
    setLanguage(lang);
    // Small delay to let the selection feel intentional
    setTimeout(() => {
      // Show guide only for first-time users (guideCompleted is false)
      if (!user.guideCompleted) {
        navigate('/onboarding/guide');
      } else {
        navigate('/onboarding/welcome');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="animate-fade-in space-y-10 max-w-sm w-full text-center">
        {/* Logo */}
        <div className="space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">🌿</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-primary tracking-tight">
            MASEYA
          </h1>
        </div>

        {/* Language Options - Minimal */}
        <div className="space-y-3">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={cn(
                'w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-200',
                selected === lang.code
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-secondary/50'
              )}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{lang.flag}</span>
                <span className="font-medium text-foreground text-lg">{lang.label}</span>
              </div>
              {selected === lang.code && (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
