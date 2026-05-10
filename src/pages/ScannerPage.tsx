import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { ScanLine, Camera } from 'lucide-react';

const COPY = {
  es: { title: 'Escanear', aim: 'Apunta al código de barras', photo: 'Fotografiar ingredientes', recent: 'Escaneos recientes', empty: 'Aún no has escaneado ningún producto.' },
  en: { title: 'Scan', aim: 'Point at the barcode', photo: 'Photograph ingredients', recent: 'Recent scans', empty: 'You haven’t scanned any products yet.' },
  fr: { title: 'Scanner', aim: 'Vise le code-barres', photo: 'Photographier les ingrédients', recent: 'Scans récents', empty: 'Tu n’as encore rien scanné.' },
};

const ScannerPage = () => {
  const { user } = useUser();
  const c = COPY[user.language] ?? COPY.es;

  return (
    <AppLayout title={c.title}>
      <div className="px-4 py-6 space-y-6">
        {/* Camera viewfinder placeholder */}
        <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-primary/90 to-primary overflow-hidden shadow-warm-lg flex items-center justify-center">
          <div className="absolute inset-8 border-2 border-white/70 rounded-2xl" />
          <div className="absolute inset-x-12 top-1/2 h-0.5 bg-white/80 animate-pulse" />
          <ScanLine className="w-16 h-16 text-white/90" strokeWidth={1.5} />
        </div>

        <p className="text-center text-muted-foreground">{c.aim}</p>

        <button className="w-full h-14 rounded-2xl bg-card border border-border flex items-center justify-center gap-3 font-medium hover:bg-muted transition-colors">
          <Camera className="w-5 h-5 text-primary" />
          {c.photo}
        </button>

        <div>
          <h2 className="font-display text-base font-semibold mb-3">{c.recent}</h2>
          <div className="bg-card rounded-2xl p-6 text-center text-sm text-muted-foreground border border-border">
            {c.empty}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ScannerPage;
