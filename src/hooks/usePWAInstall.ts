import { useState, useEffect, useCallback } from 'react';
import { getDeviceInfo } from '@/utils/deviceDetection';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'maseya_install_prompt_shown';
const INSTALLED_KEY = 'maseya_installed';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [promptShown, setPromptShown] = useState(false);
  const device = getDeviceInfo();

  useEffect(() => {
    // Check if already installed
    if (device.isStandalone || localStorage.getItem(INSTALLED_KEY) === 'true') {
      setIsInstalled(true);
    }

    setPromptShown(localStorage.getItem(STORAGE_KEY) === 'true');

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      localStorage.setItem(INSTALLED_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [device.isStandalone]);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      localStorage.setItem(INSTALLED_KEY, 'true');
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const markPromptShown = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setPromptShown(true);
  }, []);

  const canShowModal = !isInstalled && !promptShown;
  const canShowBanner = !isInstalled && promptShown;
  const canInstallNatively = !!deferredPrompt;

  return {
    isInstalled,
    isIOS: device.isIOS,
    isAndroid: device.isAndroid,
    isMobile: device.isMobile,
    canInstallNatively,
    canShowModal,
    canShowBanner,
    triggerInstall,
    markPromptShown,
  };
};
