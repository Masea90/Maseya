import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronRight, Check, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ProfileBadge } from './ProfileBadge';

interface ProfileCompletenessCardProps {
  percentage: number;
  tier: 'starter' | 'rising' | 'trusted' | 'verified';
  tierLabel: string;
  completedItems: string[];
  missingItems: string[];
}

export const ProfileCompletenessCard = ({
  percentage,
  tier,
  tierLabel,
  completedItems,
  missingItems,
}: ProfileCompletenessCardProps) => {
  const navigate = useNavigate();

  const getProgressColor = () => {
    switch (tier) {
      case 'verified':
        return 'bg-amber-500';
      case 'trusted':
        return 'bg-emerald-500';
      case 'rising':
        return 'bg-blue-500';
      default:
        return 'bg-muted-foreground';
    }
  };

  const getEncouragementText = () => {
    if (percentage >= 90) return '🎉 Amazing! Your profile is almost perfect!';
    if (percentage >= 70) return '🌟 Great progress! Keep going!';
    if (percentage >= 40) return '💪 Nice start! Add more details for better recommendations.';
    return '✨ Complete your profile to unlock personalized beauty tips!';
  };

  return (
    <div className="bg-card rounded-2xl p-4 shadow-warm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProfileBadge
            percentage={percentage}
            tier={tier}
            tierLabel={tierLabel}
            size="md"
            showPercentage={false}
          />
          <div>
            <h3 className="font-medium text-sm">Profile Completeness</h3>
            <p className="text-xs text-muted-foreground">{percentage}% complete</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Progress
          value={percentage}
          className="h-2"
        />
        <p className="text-xs text-muted-foreground text-center">
          {getEncouragementText()}
        </p>
      </div>

      {missingItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Still missing:</p>
          <div className="flex flex-wrap gap-1.5">
            {missingItems.slice(0, 3).map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-secondary text-muted-foreground"
              >
                <Circle className="w-2 h-2" />
                {item}
              </span>
            ))}
            {missingItems.length > 3 && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                +{missingItems.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/profile/edit')}
        className="w-full rounded-xl"
      >
        Complete Your Profile
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
};

export default ProfileCompletenessCard;
