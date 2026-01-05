import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { languages, Language } from '@/lib/i18n';
import { Check, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const LanguageSettingsPage = () => {
  const navigate = useNavigate();
  const { user, setLanguage, t } = useUser();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-lg border-b border-border/50 shadow-warm">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">{t('languageSettings')}</h1>
          <div className="w-9" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <p className="text-muted-foreground text-sm">
          {t('selectYourLanguage')}
        </p>

        {/* Language Options */}
        <div className="space-y-3">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all',
                user.language === lang.code
                  ? 'border-primary bg-primary/10 shadow-warm'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <span className="font-medium text-foreground">{lang.label}</span>
              </div>
              {user.language === lang.code && (
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

export default LanguageSettingsPage;
