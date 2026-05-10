import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export const UpdateBanner = () => {
  const [worker, setWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { worker?: ServiceWorker } | undefined;
      if (detail?.worker) setWorker(detail.worker);
      setDismissed(false);
    };
    window.addEventListener('maseya:update-available', handler);
    return () => window.removeEventListener('maseya:update-available', handler);
  }, []);

  if (!worker || dismissed) return null;

  const handleUpdate = () => {
    try {
      worker.postMessage({ type: 'SKIP_WAITING' });
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-primary text-primary-foreground shadow-md">
      <div className="w-full sm:max-w-lg sm:mx-auto px-4 py-2.5 flex items-center gap-3">
        <p className="flex-1 text-sm font-medium">Nueva versión disponible 🌿</p>
        <button
          onClick={handleUpdate}
          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-primary-foreground text-primary hover:opacity-90 transition-opacity"
        >
          Actualizar
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          className="p-1 hover:opacity-80 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
