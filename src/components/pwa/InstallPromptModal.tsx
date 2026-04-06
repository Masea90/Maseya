import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share, Smartphone, Zap, Home, CalendarCheck } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface InstallPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export const InstallPromptModal = ({ open, onClose }: InstallPromptModalProps) => {
  const { t } = useUser();
  const { isIOS, canInstallNatively, triggerInstall, markPromptShown } = usePWAInstall();

  const handleInstall = async () => {
    if (canInstallNatively) {
      await triggerInstall();
    }
    markPromptShown();
    onClose();
  };

  const handleDismiss = () => {
    markPromptShown();
    onClose();
  };

  const benefits = [
    { icon: Zap, label: t('installBenefit1') },
    { icon: Home, label: t('installBenefit2') },
    { icon: CalendarCheck, label: t('installBenefit3') },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto border-primary/20 p-0 overflow-hidden">
        {/* Header visual */}
        <div className="bg-gradient-olive p-6 pb-4 text-center">
          <div className="w-16 h-16 bg-background/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🌿</span>
          </div>
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-primary-foreground text-xl font-display">
              {t('installTitle')}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-sm">
              {t('installSubtitle')}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-5">
          {/* Benefits */}
          <ul className="space-y-3">
            {benefits.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-foreground">{label}</span>
              </li>
            ))}
          </ul>

          {/* iOS instructions */}
          {isIOS && (
            <div className="bg-muted/50 rounded-2xl p-4 space-y-2 text-sm">
              <p className="font-medium text-foreground">{t('installIOSTitle')}</p>
              <ol className="space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Share className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('installIOSStep1')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('installIOSStep2')}</span>
                </li>
              </ol>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-2">
            {!isIOS && (
              <Button
                onClick={handleInstall}
                className="w-full h-12 rounded-2xl font-medium bg-gradient-olive"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('installNow')}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full h-10 text-muted-foreground"
            >
              {t('maybeLater')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
