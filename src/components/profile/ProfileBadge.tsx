import { cn } from '@/lib/utils';
import { Shield, Star, Sparkles, Award } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ProfileBadgeProps {
  percentage: number;
  tier: 'starter' | 'rising' | 'trusted' | 'verified';
  tierLabel: string;
  size?: 'sm' | 'md';
  showPercentage?: boolean;
}

export const ProfileBadge = ({
  percentage,
  tier,
  tierLabel,
  size = 'sm',
  showPercentage = true,
}: ProfileBadgeProps) => {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';

  const getIcon = () => {
    switch (tier) {
      case 'verified':
        return <Award className={iconSize} />;
      case 'trusted':
        return <Shield className={iconSize} />;
      case 'rising':
        return <Star className={iconSize} />;
      default:
        return <Sparkles className={iconSize} />;
    }
  };

  const getTierGradient = () => {
    switch (tier) {
      case 'verified':
        return 'from-amber-400/90 to-amber-500/90 text-amber-950';
      case 'trusted':
        return 'from-emerald-400/90 to-emerald-500/90 text-emerald-950';
      case 'rising':
        return 'from-blue-400/90 to-blue-500/90 text-blue-950';
      default:
        return 'from-muted to-muted text-muted-foreground';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-medium backdrop-blur-sm',
            'bg-gradient-to-r',
            getTierGradient(),
            padding,
            textSize
          )}
        >
          {getIcon()}
          {showPercentage ? (
            <span>{percentage}%</span>
          ) : (
            <span>{tierLabel}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-medium">{tierLabel} Profile</p>
        <p className="text-muted-foreground">{percentage}% complete</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ProfileBadge;
