import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'routine' | 'community' | 'profile' | 'streak' | 'shopping';
  requiredPoints?: number;
  condition?: string;
}

export interface PointTransaction {
  id: string;
  amount: number;
  reason: string;
  badge_id: string | null;
  created_at: string;
}

// All badges defined statically — no DB table needed
export const ALL_BADGES: Badge[] = [
  // Routine badges
  { id: 'first_step', name: 'First Step', description: 'Complete your first routine step', emoji: '🌱', category: 'routine' },
  { id: 'morning_star', name: 'Morning Star', description: 'Complete a full morning routine', emoji: '☀️', category: 'routine' },
  { id: 'night_owl', name: 'Night Owl', description: 'Complete a full night routine', emoji: '🌙', category: 'routine' },
  { id: 'routine_master', name: 'Routine Master', description: 'Complete 10 full routines', emoji: '👑', category: 'routine' },

  // Streak badges
  { id: 'streak_3', name: '3-Day Streak', description: 'Maintain a 3-day routine streak', emoji: '🔥', category: 'streak' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day routine streak', emoji: '⚡', category: 'streak' },
  { id: 'streak_30', name: 'Monthly Legend', description: '30-day streak — incredible dedication!', emoji: '🏆', category: 'streak' },

  // Community badges
  { id: 'first_post', name: 'First Post', description: 'Share your first community post', emoji: '💬', category: 'community' },
  { id: 'helpful', name: 'Helpful', description: 'Get 5 "This helped me" reactions', emoji: '🤝', category: 'community' },
  { id: 'photo_sharer', name: 'Photo Sharer', description: 'Post with a photo for the first time', emoji: '📸', category: 'community' },

  // Profile badges
  { id: 'profile_complete', name: 'Profile Complete', description: 'Complete your profile 100%', emoji: '✅', category: 'profile' },
  { id: 'photo_ready', name: 'Photo Ready', description: 'Upload a profile photo', emoji: '🤳', category: 'profile' },

  // Shopping badges
  { id: 'smart_shopper', name: 'Smart Shopper', description: 'Explore your first product recommendation', emoji: '🛍️', category: 'shopping' },
];

// Level thresholds
export const LEVELS = [
  { level: 1, name: 'Newbie', minPoints: 0, emoji: '🌱' },
  { level: 2, name: 'Explorer', minPoints: 50, emoji: '🌿' },
  { level: 3, name: 'Enthusiast', minPoints: 150, emoji: '🌸' },
  { level: 4, name: 'Expert', minPoints: 350, emoji: '✨' },
  { level: 5, name: 'Guru', minPoints: 600, emoji: '👑' },
  { level: 6, name: 'Legend', minPoints: 1000, emoji: '💎' },
];

export const getUserLevel = (points: number) => {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (points >= l.minPoints) current = l;
    else break;
  }
  const nextLevel = LEVELS.find(l => l.minPoints > points);
  const progressToNext = nextLevel
    ? ((points - current.minPoints) / (nextLevel.minPoints - current.minPoints)) * 100
    : 100;
  return { current, nextLevel, progressToNext };
};

export const useRewards = () => {
  const { currentUser } = useAuth();
  const { user } = useUser();
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }
    try {
      const [badgesRes, txRes] = await Promise.all([
        supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', currentUser.id),
        supabase
          .from('point_transactions')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (badgesRes.data) {
        setEarnedBadgeIds(new Set(badgesRes.data.map(b => b.badge_id)));
      }
      if (txRes.data) {
        setTransactions(txRes.data as PointTransaction[]);
      }
    } catch (e) {
      console.error('Error fetching rewards data:', e);
    }
    setIsLoading(false);
  }, [currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const awardBadge = useCallback(async (badgeId: string) => {
    if (!currentUser?.id || earnedBadgeIds.has(badgeId)) return false;
    try {
      const { error } = await supabase
        .from('user_badges')
        .insert({ user_id: currentUser.id, badge_id: badgeId });
      if (error) {
        if (error.code === '23505') return false; // duplicate
        throw error;
      }
      setEarnedBadgeIds(prev => new Set([...prev, badgeId]));
      return true;
    } catch (e) {
      console.error('Error awarding badge:', e);
      return false;
    }
  }, [currentUser?.id, earnedBadgeIds]);

  const recordPoints = useCallback(async (amount: number, reason: string, badgeId?: string) => {
    if (!currentUser?.id) return;
    try {
      await supabase
        .from('point_transactions')
        .insert({
          user_id: currentUser.id,
          amount,
          reason,
          badge_id: badgeId || null,
        });
    } catch (e) {
      console.error('Error recording points:', e);
    }
  }, [currentUser?.id]);

  const levelInfo = getUserLevel(user.points);

  return {
    earnedBadgeIds,
    allBadges: ALL_BADGES,
    transactions,
    isLoading,
    awardBadge,
    recordPoints,
    levelInfo,
    refetch: fetchData,
  };
};
