import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { toast } from 'sonner';
import { registerPwaServiceWorker } from '@/lib/registerPwa';
import { useUser } from '@/contexts/UserContext';

const UPDATED_FLAG = 'maseya_sw_updated';

const UPDATED_COPY = {
  es: 'Maseya se ha actualizado',
  en: 'Maseya has been updated',
  fr: 'Maseya a été mis à jour',
};

/** Routes where an automatic reload would destroy work in progress. */
const UNSAFE_PATH_PREFIXES = [
  '/scan/photo',
  '/onboarding',
  '/login',
  '/reset-password',
  '/update-password',
  '/.lovable/oauth',
];

const isUnsafePath = (pathname: string) =>
  UNSAFE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const hasOpenOverlay = () => {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.querySelector('[role="dialog"],[role="alertdialog"]') ||
      document.body.hasAttribute('data-scroll-locked')
  );
};

/**
 * Applies service worker updates silently at safe moments. There is no
 * "update now" prompt: web visitors expect to always see the current build.
 */
export const AutoUpdater = () => {
  const { user } = useUser();
  const location = useLocation();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [applyUpdate, setApplyUpdate] = useState<(() => Promise<void>) | null>(null);
  const appliedRef = useRef(false);

  // Confirm a completed update once, after the reload.
  useEffect(() => {
    if (sessionStorage.getItem(UPDATED_FLAG) !== '1') return;
    sessionStorage.removeItem(UPDATED_FLAG);
    toast.success(UPDATED_COPY[user.language] ?? UPDATED_COPY.es, { duration: 3000 });
  }, [user.language]);

  useEffect(() => {
    return registerPwaServiceWorker((update) => {
      setApplyUpdate(() => update);
    });
  }, []);

  const tryApply = useCallback(() => {
    if (!applyUpdate || appliedRef.current) return;
    if (isUnsafePath(window.location.pathname)) return;
    if (hasOpenOverlay()) return;
    if (isFetching > 0 || isMutating > 0) return;
    appliedRef.current = true;
    try {
      sessionStorage.setItem(UPDATED_FLAG, '1');
    } catch {
      /* storage unavailable */
    }
    applyUpdate().catch(() => {
      appliedRef.current = false;
      try {
        sessionStorage.removeItem(UPDATED_FLAG);
      } catch {
        /* noop */
      }
    });
  }, [applyUpdate, isFetching, isMutating]);

  // Safe moments: route changes, settled requests, and returning to the tab.
  useEffect(() => {
    tryApply();
  }, [tryApply, location.pathname]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryApply();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [tryApply]);

  return null;
};
