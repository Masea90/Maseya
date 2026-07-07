import { useEffect, useState } from 'react';

/**
 * Silent auto-update for installed PWA users.
 *
 * Strategy:
 * - When a new SW is installed and waiting, we activate it automatically.
 * - To avoid reloading in the middle of an interaction, we wait until the
 *   tab becomes hidden (user switches app/tab) OR a short grace period,
 *   whichever comes first. The reload itself is triggered by
 *   `controllerchange` in main.tsx.
 * - A tiny non-blocking toast is shown for transparency.
 */
export const UpdateBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { worker?: ServiceWorker } | undefined;
      const worker = detail?.worker;
      if (!worker) return;

      setVisible(true);

      let applied = false;
      const apply = () => {
        if (applied) return;
        applied = true;
        try {
          worker.postMessage({ type: 'SKIP_WAITING' });
        } catch {
          window.location.reload();
        }
      };

      // Prefer applying when the user is not actively looking at the app
      const onVisibility = () => {
        if (document.visibilityState === 'hidden') apply();
      };
      document.addEventListener('visibilitychange', onVisibility);

      // Fallback: apply after 8s even if the tab stays visible
      const t = window.setTimeout(apply, 8000);

      // Hide the toast a bit before reload happens
      window.setTimeout(() => setVisible(false), 6000);

      return () => {
        document.removeEventListener('visibilitychange', onVisibility);
        window.clearTimeout(t);
      };
    };

    window.addEventListener('maseya:update-available', handler);
    return () => window.removeEventListener('maseya:update-available', handler);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] pointer-events-none flex justify-center">
      <div className="mt-3 px-4 py-2 rounded-full bg-primary/95 text-primary-foreground text-xs font-medium shadow-md backdrop-blur-sm">
        Actualizando a la última versión…
      </div>
    </div>
  );
};
