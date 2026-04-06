import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { Check, X, Sparkles } from 'lucide-react';
import { InstallPromptModal } from '@/components/pwa/InstallPromptModal';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const PremiumScreen = () => {
  const navigate = useNavigate();
  const { completeOnboarding, t } = useUser();
  const { canShowModal } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleContinue = () => {
    completeOnboarding();
    if (canShowModal) {
      setShowInstallModal(true);
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
        >
          <X className="w-6 h-6 text-muted-foreground" />
        </button>
        <span className="font-display text-lg font-semibold">MASEYA</span>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 space-y-6 animate-fade-in flex flex-col items-center justify-center">
        {/* Early Access Card */}
        <div className="bg-card border border-primary/30 rounded-3xl p-6 shadow-warm text-center space-y-4 w-full">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {t('earlyAccessTitle')}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t('earlyAccessDescription')}
            </p>
          </div>

          <ul className="space-y-3 text-left">
            {freeFeatures.map(feature => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={handleContinue}
            className="w-full h-12 rounded-2xl font-medium bg-gradient-olive"
          >
            {t('continueToApp')}
          </Button>
        </div>
      </div>
      <InstallPromptModal
        open={showInstallModal}
        onClose={() => {
          setShowInstallModal(false);
          navigate('/home');
        }}
      />
    </div>
  );
};
