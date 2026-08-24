import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { registerPwaServiceWorker } from '@/lib/registerPwa';
import { useUser } from '@/contexts/UserContext';

const COPY = {
  es: {
    message: 'Hay una versión nueva de Maseya',
    update: 'Actualizar',
  },
  en: {
    message: 'A new version of Maseya is available',
    update: 'Update',
  },
  fr: {
    message: "Une nouvelle version de Maseya est disponible",
    update: 'Mettre à jour',
  },
};

/**
 * Prompts installed-app users before activating a waiting build, avoiding
 * surprise reloads in the middle of a scan or profile edit.
 */
export const UpdateBanner = () => {
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    return registerPwaServiceWorker((update) => {
      setApplyUpdate(() => update);
      setVisible(true);
    });
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 pb-safe pointer-events-none">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-3 shadow-lg pointer-events-auto flex items-center gap-3">
        <p className="flex-1 text-sm font-medium">{c.message}</p>
        <Button
          size="sm"
          className="shrink-0"
          disabled={updating}
          onClick={() => {
            if (!applyUpdate) return;
            setUpdating(true);
            applyUpdate().catch(() => setUpdating(false));
          }}
        >
          <RefreshCw className={updating ? 'animate-spin' : ''} />
          {c.update}
        </Button>
      </div>
    </div>
  );
};
