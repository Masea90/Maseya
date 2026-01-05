import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TodayCardProps {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: 'skin' | 'hair' | 'nutrition';
  linkTo?: string;
}

const colorMap = {
  skin: 'bg-glow-skin/15 border-glow-skin/30',
  hair: 'bg-glow-hair/15 border-glow-hair/30',
  nutrition: 'bg-glow-nutrition/15 border-glow-nutrition/30',
};

export const TodayCard = ({
  icon,
  title,
  subtitle,
  description,
  color,
  linkTo = '#',
}: TodayCardProps) => {
  return (
    <Link
      to={linkTo}
      className={cn(
        'block p-4 rounded-2xl border shadow-warm transition-all hover:shadow-warm-lg',
        colorMap[color]
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-foreground">{title}</h3>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
          <p className="text-sm text-foreground/80">{description}</p>
        </div>
      </div>
    </Link>
  );
};

interface TodayCardsProps {
  cards: TodayCardProps[];
}

export const TodayCards = ({ cards }: TodayCardsProps) => {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold">Today's Insights</h2>
      <div className="space-y-3">
        {cards.map((card, index) => (
          <TodayCard key={index} {...card} />
        ))}
      </div>
    </div>
  );
};
