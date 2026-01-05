import { useMemo } from 'react';
import { UserProfile } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileCompletenessResult {
  percentage: number;
  completedItems: string[];
  missingItems: string[];
  tier: 'starter' | 'rising' | 'trusted' | 'verified';
  tierLabel: string;
  tierColor: string;
}

export const useProfileCompleteness = (user: UserProfile): ProfileCompletenessResult => {
  const { currentUser } = useAuth();

  return useMemo(() => {
    const items: { key: string; label: string; completed: boolean }[] = [
      {
        key: 'emailConfirmed',
        label: 'Email confirmed',
        completed: user.emailConfirmed || !!currentUser?.emailConfirmedAt,
      },
      {
        key: 'ageRange',
        label: 'Age range',
        completed: !!user.ageRange,
      },
      {
        key: 'skinConcerns',
        label: 'Skin type & concerns',
        completed: user.skinConcerns.length > 0,
      },
      {
        key: 'hairType',
        label: 'Hair type',
        completed: !!user.hairType,
      },
      {
        key: 'hairConcerns',
        label: 'Hair concerns',
        completed: user.hairConcerns.length > 0,
      },
      {
        key: 'goals',
        label: 'Personal goals',
        completed: user.goals.length > 0,
      },
      {
        key: 'sensitivities',
        label: 'Sensitivities & exclusions',
        completed: (user.sensitivities?.length || 0) > 0,
      },
      {
        key: 'country',
        label: 'Location & climate',
        completed: !!user.country && !!user.climateType,
      },
      {
        key: 'firstRoutine',
        label: 'First routine completed',
        completed: user.firstRoutineCompleted || false,
      },
      {
        key: 'profilePhoto',
        label: 'Profile photo',
        completed: user.hasProfilePhoto || false,
      },
    ];

    const completedItems = items.filter(item => item.completed).map(item => item.label);
    const missingItems = items.filter(item => !item.completed).map(item => item.label);
    const percentage = Math.round((completedItems.length / items.length) * 100);

    // Determine tier based on percentage
    let tier: 'starter' | 'rising' | 'trusted' | 'verified';
    let tierLabel: string;
    let tierColor: string;

    if (percentage >= 90) {
      tier = 'verified';
      tierLabel = 'Verified';
      tierColor = 'bg-gradient-to-r from-amber-400 to-amber-500';
    } else if (percentage >= 70) {
      tier = 'trusted';
      tierLabel = 'Trusted';
      tierColor = 'bg-gradient-to-r from-emerald-400 to-emerald-500';
    } else if (percentage >= 40) {
      tier = 'rising';
      tierLabel = 'Rising';
      tierColor = 'bg-gradient-to-r from-blue-400 to-blue-500';
    } else {
      tier = 'starter';
      tierLabel = 'Starter';
      tierColor = 'bg-muted';
    }

    return {
      percentage,
      completedItems,
      missingItems,
      tier,
      tierLabel,
      tierColor,
    };
  }, [user, currentUser?.emailConfirmedAt]);
};

export default useProfileCompleteness;
