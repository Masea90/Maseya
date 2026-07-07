import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ScoreFactor } from '@/lib/scoring';

interface Props {
  factors: ScoreFactor[];
  title?: string;
}

const toneClasses = (tone: ScoreFactor['tone']) => {
  switch (tone) {
    case 'positive': return { dot: 'bg-[#2D6A4F]', text: 'text-[#2D6A4F]' };
    case 'negative': return { dot: 'bg-[#E63946]', text: 'text-[#E63946]' };
    default: return { dot: 'bg-muted-foreground/60', text: 'text-muted-foreground' };
  }
};

const fmtDelta = (d: number | null) => {
  if (d === null || d === 0) return null;
  return d > 0 ? `+${d}` : `${d}`;
};

export const ScoreBreakdown = ({ factors, title = '¿Por qué esta nota?' }: Props) => {
  const [open, setOpen] = useState(false);
  if (!factors || factors.length === 0) return null;
  return (
    <div className="w-full max-w-xs">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <span className="underline underline-offset-2">{title}</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 text-left bg-muted/40 rounded-xl p-3 border border-border/60">
          {factors.map((f, i) => {
            const c = toneClasses(f.tone);
            const delta = fmtDelta(f.delta);
            return (
              <li key={i} className="flex items-start gap-2 text-[12px] leading-snug">
                <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                <span className="flex-1 text-foreground/85">{f.label}</span>
                {delta && (
                  <span className={`font-semibold tabular-nums ${c.text}`}>{delta}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
