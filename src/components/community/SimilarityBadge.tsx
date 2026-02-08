import { cn } from '@/lib/utils';
import { Shield, Star, Sparkles, Award } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

interface SimilarityBadgeProps {
  percentage: number;
  tier: 'starter' | 'rising' | 'trusted' | 'verified';
}

export const SimilarityBadge = ({ percentage, tier }: SimilarityBadgeProps) => {
  const { t } = useUser();
  
  const getIcon = () => {
    switch (tier) {
      case 'verified': return <Award className="w-3 h-3" />;
      case 'trusted': return <Shield className="w-3 h-3" />;
      case 'rising': return <Star className="w-3 h-3" />;
      default: return <Sparkles className="w-3 h-3" />;
    }
  };

  const getStyle = () => {
    switch (tier) {
      case 'verified': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'trusted': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rising': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
      getStyle()
    )}>
      {getIcon()}
      <span>{percentage}% {t('communityProfileComplete')}</span>
    </div>
  );
};
