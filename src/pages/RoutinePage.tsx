import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser, RoutineCompletion } from '@/contexts/UserContext';
import { Check, Sun, Moon, Flame, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { TranslationKey } from '@/lib/i18n';
import { useState } from 'react';

type TimeOfDay = 'morning' | 'night';

interface RoutineStep {
  id: number;
  stepKey: TranslationKey;
  productKey: TranslationKey;
  emoji: string;
  durationKey: TranslationKey;
}

const routineData: Record<TimeOfDay, RoutineStep[]> = {
  morning: [
    { id: 1, stepKey: 'stepCleanser', productKey: 'productGentleCleanser', emoji: '🧴', durationKey: 'duration1Min' },
    { id: 2, stepKey: 'stepToner', productKey: 'productRoseWaterToner', emoji: '🌹', durationKey: 'duration30Sec' },
    { id: 3, stepKey: 'stepSerum', productKey: 'productVitaminCSerum', emoji: '✨', durationKey: 'duration1Min' },
    { id: 4, stepKey: 'stepMoisturizer', productKey: 'productDailyHydratingCream', emoji: '💧', durationKey: 'duration1Min' },
    { id: 5, stepKey: 'stepSunscreen', productKey: 'productSpf50Mineral', emoji: '☀️', durationKey: 'duration1Min' },
  ],
  night: [
    { id: 1, stepKey: 'stepOilCleanser', productKey: 'productCleansingBalm', emoji: '🫒', durationKey: 'duration2Min' },
    { id: 2, stepKey: 'stepWaterCleanser', productKey: 'productGentleFoamCleanser', emoji: '🧴', durationKey: 'duration1Min' },
    { id: 3, stepKey: 'stepToner', productKey: 'productHydratingEssence', emoji: '💫', durationKey: 'duration30Sec' },
    { id: 4, stepKey: 'stepTreatment', productKey: 'productRetinolSerum', emoji: '🔬', durationKey: 'duration1Min' },
    { id: 5, stepKey: 'stepEyeCream', productKey: 'productPeptideEyeCream', emoji: '👁️', durationKey: 'duration30Sec' },
    { id: 6, stepKey: 'stepNightCream', productKey: 'productRepairNightMask', emoji: '🌙', durationKey: 'duration1Min' },
  ],
};

const RoutinePage = () => {
  const { user, updateUser, updateRoutineCompletion, t } = useUser();
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  
  // Use persisted routine completion from user context
  const completed = user.routineCompletion || { morning: [], night: [], lastCompletedDate: null };

  const currentRoutine = routineData[timeOfDay];
  const completedCount = completed[timeOfDay]?.length || 0;
  const totalSteps = currentRoutine.length;
  const progress = (completedCount / totalSteps) * 100;

  const toggleStep = (stepId: number) => {
    const current = completed[timeOfDay] || [];
    const isCurrentlyCompleted = current.includes(stepId);
    
    const updatedTimeOfDay = isCurrentlyCompleted
      ? current.filter(id => id !== stepId)
      : [...current, stepId];
    
    const newCompletion: RoutineCompletion = {
      ...completed,
      [timeOfDay]: updatedTimeOfDay,
      lastCompletedDate: completed.lastCompletedDate,
    };
    
    // Award points when completing a step (not when uncompleting)
    if (!isCurrentlyCompleted) {
      updateUser({ points: user.points + 5 });
    }
    
    updateRoutineCompletion(newCompletion);
  };

  const isCompleted = (stepId: number) => (completed[timeOfDay] || []).includes(stepId);
  const allCompleted = completedCount === totalSteps;

  return (
    <AppLayout title={t('routineNav')}>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Toggle */}
        <div className="bg-card rounded-2xl p-1.5 flex shadow-warm">
          <button
            onClick={() => setTimeOfDay('morning')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all',
              timeOfDay === 'morning'
                ? 'bg-maseya-gold/20 text-maseya-gold'
                : 'text-muted-foreground'
            )}
          >
            <Sun className="w-5 h-5" />
            {t('morning')}
          </button>
          <button
            onClick={() => setTimeOfDay('night')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all',
              timeOfDay === 'night'
                ? 'bg-indigo-500/20 text-indigo-500'
                : 'text-muted-foreground'
            )}
          >
            <Moon className="w-5 h-5" />
            {t('night')}
          </button>
        </div>

        {/* Progress */}
        <div className="bg-card rounded-2xl p-4 shadow-warm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-maseya-terracotta" />
              <span className="font-medium">{user.streak} {t('dayStreak')}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalSteps} {t('steps')}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          {allCompleted && (
            <div className="flex items-center gap-2 text-sm text-glow-hair bg-glow-hair/10 rounded-xl p-3">
              <Gift className="w-4 h-4" />
              <span>+15 {t('pointsEarned')} ✨</span>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">
            {timeOfDay === 'morning' ? '☀️' : '🌙'} {timeOfDay === 'morning' ? t('morningRoutine') : t('nightRoutine')}
          </h2>
          
          <div className="space-y-2">
            {currentRoutine.map((step) => (
              <button
                key={step.id}
                onClick={() => toggleStep(step.id)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left',
                  isCompleted(step.id)
                    ? 'bg-glow-hair/10 border-glow-hair/30'
                    : 'bg-card border-border hover:border-primary/50'
                )}
              >
                {/* Checkbox */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    isCompleted(step.id)
                      ? 'bg-glow-hair border-glow-hair'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isCompleted(step.id) && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Icon */}
                <span className="text-2xl">{step.emoji}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium transition-all',
                    isCompleted(step.id) && 'line-through text-muted-foreground'
                  )}>
                    {t(step.stepKey)}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {t(step.productKey)}
                  </p>
                </div>

                {/* Duration */}
                <span className="text-xs text-muted-foreground">{t(step.durationKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Points Info */}
        <div className="bg-maseya-gold/10 border border-maseya-gold/30 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="font-medium text-foreground">{t('earnPointsPerStep')}</p>
            <p className="text-sm text-muted-foreground">
              {t('perStepBonus')}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default RoutinePage;
