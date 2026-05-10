import { Sparkles } from 'lucide-react';
import type { ProductData } from '@/lib/productLookup';

interface Props {
  current: ProductData;
  currentScore: number;
}

export const Alternatives = ({}: Props) => {
  return (
    <div>
      <h3 className="font-display font-semibold mb-3">Mejores opciones para ti</h3>
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-2 text-center">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
          Estamos trabajando en recomendaciones personalizadas. Próximamente.
        </p>
      </div>
    </div>
  );
};
