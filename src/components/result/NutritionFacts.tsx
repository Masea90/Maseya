import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ProductData } from '@/lib/productLookup';
import { useUser } from '@/contexts/UserContext';
import type { Language } from '@/lib/i18n';

const COPY: Record<Language, Record<string, string>> = {
  es: {
    title: 'Valores nutricionales', per100: '(por 100 g)',
    salt: 'Sal', lowSalt: 'Bajo en sal', highSalt: 'Alto en sal',
    sugars: 'Azúcares', lowSugar: 'Bajo en azúcar', highSugar: 'Alto en azúcar',
    satFat: 'Grasas saturadas', lowSat: 'Bajo en grasas sat.', highSat: 'Alto en grasas sat.',
    kcal: 'Calorías', lowKcal: 'Poco calórico', highKcal: 'Muy calórico',
    proteins: 'Proteínas', fiber: 'Fibra', moderate: 'Moderado', goodAmount: L.goodAmount,
  },
  en: {
    title: 'Nutrition facts', per100: '(per 100 g)',
    salt: 'Salt', lowSalt: 'Low in salt', highSalt: 'High in salt',
    sugars: 'Sugars', lowSugar: 'Low in sugar', highSugar: 'High in sugar',
    satFat: 'Saturated fat', lowSat: 'Low in sat. fat', highSat: 'High in sat. fat',
    kcal: 'Calories', lowKcal: 'Low calorie', highKcal: 'Very calorific',
    proteins: 'Protein', fiber: 'Fibre', moderate: 'Moderate', goodAmount: 'Good amount',
  },
  fr: {
    title: 'Valeurs nutritionnelles', per100: '(pour 100 g)',
    salt: 'Sel', lowSalt: 'Peu salé', highSalt: 'Riche en sel',
    sugars: 'Sucres', lowSugar: 'Peu sucré', highSugar: 'Riche en sucre',
    satFat: 'Graisses saturées', lowSat: 'Peu de graisses sat.', highSat: 'Riche en graisses sat.',
    kcal: 'Calories', lowKcal: 'Peu calorique', highKcal: 'Très calorique',
    proteins: 'Protéines', fiber: 'Fibres', moderate: 'Modéré', goodAmount: 'Bonne quantité',
  },
};

interface Props {
  product: ProductData;
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

interface Row {
  label: string;
  value: number;
  unit: string;
  tone: Tone;
  sublabel?: string;
}

const readNum = (nutriments: Record<string, unknown>, key: string): number | null => {
  const v = nutriments[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

// Spanish number formatting: 1 decimal, comma decimal separator.
const fmt = (n: number): string => {
  const rounded = Math.round(n * 10) / 10;
  return rounded.toString().replace('.', ',');
};

const toneStyles = (tone: Tone): { dot: string; text: string } => {
  switch (tone) {
    case 'good': return { dot: 'bg-[#2D6A4F]', text: 'text-[#2D6A4F]' };
    case 'warn': return { dot: 'bg-[#F4A261]', text: 'text-[#8a4a1e]' };
    case 'bad':  return { dot: 'bg-[#E63946]', text: 'text-[#E63946]' };
    default:     return { dot: 'bg-muted-foreground/60', text: 'text-muted-foreground' };
  }
};

export const NutritionFacts = ({ product }: Props) => {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const L = COPY[user.language] ?? COPY.es;

  if (product.category !== 'food') return null;
  const raw = (product.raw || {}) as Record<string, unknown>;
  const nutriments = (raw.nutriments && typeof raw.nutriments === 'object')
    ? raw.nutriments as Record<string, unknown>
    : null;
  if (!nutriments) return null;

  const rows: Row[] = [];

  const salt = readNum(nutriments, 'salt_100g');
  if (salt !== null) {
    const tone: Tone = salt < 0.3 ? 'good' : salt <= 1.5 ? 'warn' : 'bad';
    const sublabel = tone === 'good' ? L.lowSalt : tone === 'warn' ? L.moderate : L.highSalt;
    rows.push({ label: L.salt, value: salt, unit: 'g', tone, sublabel });
  }

  const sugars = readNum(nutriments, 'sugars_100g');
  if (sugars !== null) {
    const tone: Tone = sugars < 5 ? 'good' : sugars <= 22.5 ? 'warn' : 'bad';
    const sublabel = tone === 'good' ? L.lowSugar : tone === 'warn' ? L.moderate : L.highSugar;
    rows.push({ label: L.sugars, value: sugars, unit: 'g', tone, sublabel });
  }

  const satFat = readNum(nutriments, 'saturated-fat_100g');
  if (satFat !== null) {
    const tone: Tone = satFat < 1.5 ? 'good' : satFat <= 5 ? 'warn' : 'bad';
    const sublabel = tone === 'good' ? L.lowSat : tone === 'warn' ? L.moderate : L.highSat;
    rows.push({ label: L.satFat, value: satFat, unit: 'g', tone, sublabel });
  }

  const kcal = readNum(nutriments, 'energy-kcal_100g');
  if (kcal !== null) {
    const tone: Tone = kcal < 160 ? 'good' : kcal <= 360 ? 'warn' : 'bad';
    const sublabel = tone === 'good' ? L.lowKcal : tone === 'warn' ? L.moderate : L.highKcal;
    rows.push({ label: L.kcal, value: kcal, unit: 'kcal', tone, sublabel });
  }

  const proteins = readNum(nutriments, 'proteins_100g');
  if (proteins !== null) {
    const tone: Tone = proteins >= 8 ? 'good' : 'neutral';
    const sublabel = tone === 'good' ? L.goodAmount : undefined;
    rows.push({ label: L.proteins, value: proteins, unit: 'g', tone, sublabel });
  }

  const fiber = readNum(nutriments, 'fiber_100g');
  if (fiber !== null) {
    const tone: Tone = fiber >= 3 ? 'good' : 'neutral';
    const sublabel = tone === 'good' ? L.goodAmount : undefined;
    rows.push({ label: L.fiber, value: fiber, unit: 'g', tone, sublabel });
  }

  if (rows.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full p-4 flex items-center justify-between"
        aria-expanded={open}
      >
        <span className="font-semibold flex items-center gap-2">
          📊 {L.title} <span className="text-xs font-normal text-muted-foreground">{L.per100}</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <ul className="divide-y divide-border/60">
            {rows.map((r, i) => {
              const c = toneStyles(r.tone);
              return (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground/90">{r.label}</div>
                    {r.sublabel && (
                      <div className={`text-[11px] leading-tight ${c.text}`}>{r.sublabel}</div>
                    )}
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">
                    {fmt(r.value)} {r.unit}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
