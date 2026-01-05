import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Check, Sun, Moon, Flame, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type TimeOfDay = 'morning' | 'night';

const routineData = {
  morning: [
    { id: 1, step: 'Cleanser', product: 'Gentle Hydrating Cleanser', emoji: '🧴', duration: '1 min' },
    { id: 2, step: 'Toner', product: 'Rose Water Toner', emoji: '🌹', duration: '30 sec' },
    { id: 3, step: 'Serum', product: 'Vitamin C Serum', emoji: '✨', duration: '1 min' },
    { id: 4, step: 'Moisturizer', product: 'Daily Hydrating Cream', emoji: '💧', duration: '1 min' },
    { id: 5, step: 'Sunscreen', product: 'SPF 50 Mineral', emoji: '☀️', duration: '1 min' },
  ],
  night: [
    { id: 1, step: 'Oil Cleanser', product: 'Cleansing Balm', emoji: '🫒', duration: '2 min' },
    { id: 2, step: 'Water Cleanser', product: 'Gentle Foam Cleanser', emoji: '🧴', duration: '1 min' },
    { id: 3, step: 'Toner', product: 'Hydrating Essence', emoji: '💫', duration: '30 sec' },
    { id: 4, step: 'Treatment', product: 'Retinol Serum', emoji: '🔬', duration: '1 min' },
    { id: 5, step: 'Eye Cream', product: 'Peptide Eye Cream', emoji: '👁️', duration: '30 sec' },
    { id: 6, step: 'Night Cream', product: 'Repair Night Mask', emoji: '🌙', duration: '1 min' },
  ],
};

const RoutinePage = () => {
  const { user, updateUser, t } = useUser();
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [completed, setCompleted] = useState<Record<TimeOfDay, number[]>>({
    morning: [],
    night: [],
  });

  const currentRoutine = routineData[timeOfDay];
  const completedCount = completed[timeOfDay].length;
  const totalSteps = currentRoutine.length;
  const progress = (completedCount / totalSteps) * 100;

  const toggleStep = (stepId: number) => {
    setCompleted(prev => {
      const current = prev[timeOfDay];
      const updated = current.includes(stepId)
        ? current.filter(id => id !== stepId)
        : [...current, stepId];
      
      // Award points when completing a step
      if (!current.includes(stepId)) {
        updateUser({ points: user.points + 5 });
      }
      
      return { ...prev, [timeOfDay]: updated };
    });
  };

  const isCompleted = (stepId: number) => completed[timeOfDay].includes(stepId);
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
            {currentRoutine.map((step, index) => (
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
                    {step.step}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {step.product}
                  </p>
                </div>

                {/* Duration */}
                <span className="text-xs text-muted-foreground">{step.duration}</span>
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
