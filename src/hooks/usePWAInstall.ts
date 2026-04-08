import { useState, useEffect, useCallback } from 'react';
import { getDeviceInfo } from '@/utils/deviceDetection';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'maseya_install_prompt_shown';
const INSTALLED_KEY = 'maseya_installed';

// Global deferred prompt so any component can access it
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(p: BeforeInstallPromptEvent | null) => void>();

function setGlobalPrompt(p: BeforeInstallPromptEvent | null) {
  globalDeferredPrompt = p;
  listeners.forEach((fn) => fn(p));
}

// Capture the event as early as possible (module level)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    setGlobalPrompt(e as BeforeInstallPromptEvent);
  });
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [promptShown, setPromptShown] = useState(false);
  const device = getDeviceInfo();

  useEffect(() => {
    // Check if already installed
    if (device.isStandalone || localStorage.getItem(INSTALLED_KEY) === 'true') {
      setIsInstalled(true);
    }

    setPromptShown(localStorage.getItem(STORAGE_KEY) === 'true');

    // Subscribe to global prompt changes
    const handler = (p: BeforeInstallPromptEvent | null) => setDeferredPrompt(p);
    listeners.add(handler);

    const installedHandler = () => {
      setIsInstalled(true);
      localStorage.setItem(INSTALLED_KEY, 'true');
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      listeners.delete(handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [device.isStandalone]);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setGlobalPrompt(null);
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
