import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

const defaultAlerts = [
  { id: 1, ingredient: 'Fragrance', reason: 'Can irritate sensitive skin' },
  { id: 2, ingredient: 'Sulfates', reason: 'May strip natural oils' },
  { id: 3, ingredient: 'Parabens', reason: 'Potential hormone disruptor' },
];

export const IngredientAlerts = () => {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const alerts = defaultAlerts.filter(a => !dismissed.includes(a.id));

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-zwina-terracotta" />
        Ingredients to Avoid
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className="flex-shrink-0 bg-zwina-terracotta/10 border border-zwina-terracotta/30 rounded-2xl p-3 min-w-[200px]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground text-sm">{alert.ingredient}</p>
                <p className="text-xs text-muted-foreground mt-1">{alert.reason}</p>
              </div>
              <button
                onClick={() => setDismissed(prev => [...prev, alert.id])}
                className="p-1 rounded-full hover:bg-background/50 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
