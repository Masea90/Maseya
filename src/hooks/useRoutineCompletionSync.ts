import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRoutineCompletionSync = () => {
  const { currentUser } = useAuth();

  const syncCompletion = useCallback(async (
    timeOfDay: 'morning' | 'night',
    completedSteps: string[],
    totalSteps: number,
  ) => {
    if (!currentUser?.id) return;

    const today = new Date().toISOString().split('T')[0];
    const isFullyCompleted = completedSteps.length >= totalSteps && totalSteps > 0;

    try {
      const { error } = await supabase
        .from('routine_completions')
        .upsert(
          {
            user_id: currentUser.id,
            completion_date: today,
            time_of_day: timeOfDay,
            completed_steps: completedSteps,
            total_steps: totalSteps,
            is_fully_completed: isFullyCompleted,
          },
          { onConflict: 'user_id,completion_date,time_of_day' }
        );

      if (error) {
        console.error('Error syncing routine completion:', error);
      }
    } catch (e) {
      console.error('Error syncing routine completion:', e);
    }
  }, [currentUser?.id]);

  return { syncCompletion };
};
