import { useEffect, useState } from 'react';

export const PREMIUM_KEY = 'maseya_premium_test';
export const DEV_KEY = 'maseya_dev_mode';

const safeRead = (k: string) => {
  try { return localStorage.getItem(k); } catch { return null; }
};

export const isPremium = (): boolean => safeRead(PREMIUM_KEY) === 'true';
export const isDevMode = (): boolean => safeRead(DEV_KEY) === 'true';

export const setPremium = (v: boolean) => {
  try {
    localStorage.setItem(PREMIUM_KEY, v ? 'true' : 'false');
    window.dispatchEvent(new Event('maseya:premium-change'));
  } catch {}
};

export const usePremium = (): boolean => {
  const [v, setV] = useState<boolean>(isPremium());
  useEffect(() => {
    const f = () => setV(isPremium());
    window.addEventListener('storage', f);
    window.addEventListener('maseya:premium-change', f);
    return () => {
      window.removeEventListener('storage', f);
      window.removeEventListener('maseya:premium-change', f);
    };
  }, []);
  return v;
};

export const useDevMode = (): boolean => {
  const [v, setV] = useState<boolean>(isDevMode());
  useEffect(() => {
    const f = () => setV(isDevMode());
    window.addEventListener('storage', f);
    window.addEventListener('maseya:dev-change', f);
    return () => {
      window.removeEventListener('storage', f);
      window.removeEventListener('maseya:dev-change', f);
    };
  }, []);
  return v;
};
