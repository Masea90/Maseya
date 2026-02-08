import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Bell, Shield } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { TranslationKey } from '@/lib/i18n';

type PermissionType = 'camera' | 'notifications';

interface PermissionRequestProps {
  type: PermissionType;
  isOpen: boolean;
  onClose: () => void;
  onRequestPermission: () => Promise<boolean>;
}

const permissionConfig: Record<PermissionType, {
  icon: typeof Camera;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  benefitKey: TranslationKey;
  privacyKey: TranslationKey;
}> = {
  camera: {
    icon: Camera,
    titleKey: 'permCameraTitle',
    descriptionKey: 'permCameraDesc',
    benefitKey: 'permCameraBenefit',
    privacyKey: 'permCameraPrivacy',
  },
  notifications: {
    icon: Bell,
    titleKey: 'permNotifTitle',
    descriptionKey: 'permNotifDesc',
    benefitKey: 'permNotifBenefit',
    privacyKey: 'permNotifPrivacy',
  },
};

export const PermissionRequest = ({
  type,
  isOpen,
  onClose,
  onRequestPermission,
}: PermissionRequestProps) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const { t } = useUser();
  const config = permissionConfig[type];
  const Icon = config.icon;

  const handleRequest = async () => {
    setIsRequesting(true);
    try {
      const granted = await onRequestPermission();
      if (granted) {
        onClose();
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl border-0 p-0 overflow-hidden bg-card">
        <DialogHeader className="p-6 pb-0">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-display">
            {t(config.titleKey)}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <p className="text-center text-muted-foreground text-sm">
            {t(config.descriptionKey)}
          </p>

          <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                ✨
              </div>
              <div>
                <p className="text-sm font-medium">{t('permWhyHelps')}</p>
                <p className="text-xs text-muted-foreground">{t(config.benefitKey)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('permYourPrivacy')}</p>
                <p className="text-xs text-muted-foreground">{t(config.privacyKey)}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <Button
              onClick={handleRequest}
              disabled={isRequesting}
              className="w-full h-12 rounded-2xl bg-gradient-olive"
            >
              {isRequesting ? t('permRequesting') : t('permAllow')}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full h-10 rounded-xl"
            >
              {t('permMaybeLater')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to manage permission requests
export const usePermissionRequest = () => {
  const [permissionState, setPermissionState] = useState<{
    type: PermissionType | null;
    isOpen: boolean;
    resolver: ((granted: boolean) => void) | null;
  }>({
    type: null,
    isOpen: false,
    resolver: null,
  });

  const requestPermission = (type: PermissionType): Promise<boolean> => {
    return new Promise((resolve) => {
      setPermissionState({ type, isOpen: true, resolver: resolve });
    });
  };

  const handleClose = () => {
    if (permissionState.resolver) {
      permissionState.resolver(false);
    }
    setPermissionState({ type: null, isOpen: false, resolver: null });
  };

  const handleRequest = async (): Promise<boolean> => {
    if (!permissionState.type) return false;
    try {
      if (permissionState.type === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        permissionState.resolver?.(true);
        return true;
      } else if (permissionState.type === 'notifications') {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        permissionState.resolver?.(granted);
        return granted;
      }
    } catch {
      permissionState.resolver?.(false);
    }
    return false;
  };

  return {
    permissionType: permissionState.type,
    isOpen: permissionState.isOpen,
    requestPermission,
    handleClose,
    handleRequest,
  };
};

export default PermissionRequest;
