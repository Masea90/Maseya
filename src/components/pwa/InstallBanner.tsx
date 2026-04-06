import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const InstallBanner = () => {
  const { t } = useUser();
  const { canShowBanner, canInstallNatively, isIOS, triggerInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canShowBanner || dismissed || (!canInstallNatively && !isIOS)) return null;

  const handleInstall = async () => {
    if (canInstallNatively) {
      await triggerInstall();
    }
    setDismissed(true);
  };

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 flex items-center gap-3 animate-fade-in">
      <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
        <span className="text-lg">🌿</span>
      </div>
      <p className="text-sm text-foreground flex-1">{t('installBannerText')}</p>
      <Button
        size="sm"
        onClick={handleInstall}
        className="rounded-xl bg-gradient-olive shrink-0 h-8 px-3 text-xs"
      >
        <Download className="w-3.5 h-3.5 mr-1" />
        {t('install')}
      </Button>
      <button onClick={() => setDismissed(true)} className="text-muted-foreground p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
