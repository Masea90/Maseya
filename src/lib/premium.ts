import { useEffect, useState } from 'react';

// Premium is fully deprecated — Kharm is 100% free at launch.
// These helpers are kept as no-op shims so any lingering imports keep compiling
// but grant everyone access to every feature.
export const DEV_KEY = 'maseya_dev_mode';

const safeRead = (k: string) => {
  try { return localStorage.getItem(k); } catch { return null; }
};

export const isDevMode = (): boolean => safeRead(DEV_KEY) === 'true';

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
