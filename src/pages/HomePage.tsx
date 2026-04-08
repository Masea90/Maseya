import { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Sparkles, Droplets, TrendingUp } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useRewards } from '@/hooks/useRewards';
import { useRoutineCompletionSync } from '@/hooks/useRoutineCompletionSync';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { productCatalog } from '@/lib/recommendations';
import { remedies } from '@/lib/remedies';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InstallBanner } from '@/components/pwa/InstallBanner';

const HomePage = () => {
  const { user, t, glowScore } = useUser();
  const { currentUser } = useAuth();
  const { recordPoints, awardBadge } = useRewards();
  const { syncCompletion } = useRoutineCompletionSync();
  const [completedToday, setCompletedToday] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showGlow, setShowGlow] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Check real DB for today's completion status on mount
  useEffect(() => {
    const checkTodayCompletion = async () => {
      if (!currentUser?.id) {
        setIsChecking(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('routine_completions')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('completion_date', today)
          .eq('is_fully_completed', true)
          .limit(1);

        setCompletedToday(!!(data && data.length > 0));
      } catch (e) {
        console.error('Error checking routine completion:', e);
      }
      setIsChecking(false);
    };

    checkTodayCompletion();
  }, [currentUser?.id, today]);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? t('goodMorning') : currentHour < 17 ? t('goodAfternoon') : t('goodEvening');

  // Personalized status message based on profile
  const statusMessage = useMemo(() => {
    if (user.streak === 0) return t('startYourJourney');
    if (user.skinConcerns.includes('dryness')) return t('skinNeedsHydration');
    if (user.skinConcerns.includes('oiliness') || user.skinConcerns.includes('acne')) return t('skinLooksGreat');
    if (user.hairConcerns.length > 0) return t('hairNeedsCare');
    if (user.streak > 0) return t('keepUpStreak');
    return t('skinLooksGreat');
  }, [user.skinConcerns, user.hairConcerns, user.streak, t]);

  // Personalized recommendation reason
  const getRecommendationReason = useCallback(() => {
    if (user.skinConcerns.includes('dryness')) return t('becauseSkinDry');
    if (user.skinConcerns.includes('oiliness')) return t('becauseSkinOily');
    if (user.skinConcerns.includes('acne')) return t('becauseSkinAcne');
    if (user.skinConcerns.includes('sensitivity')) return t('becauseSkinSensitive');
    return t('becauseSkinDry');
  }, [user.skinConcerns, t]);

  const getHairReason = useCallback(() => {
    if (user.hairConcerns.includes('dryBrittle')) return t('becauseHairDry');
    if (user.hairConcerns.includes('frizz')) return t('becauseHairFrizz');
    return t('becauseHairDry');
  }, [user.hairConcerns, t]);

  // Pick 2 products based on user profile
  const recommendedProducts = useMemo(() => {
    const skinProduct = productCatalog.find(p =>
      p.category === 'skin' && p.targetConcerns.some(c => user.skinConcerns.includes(c))
    ) || productCatalog.find(p => p.category === 'skin');

    const hairProduct = productCatalog.find(p =>
      p.category === 'hair' && p.targetHairTypes.includes(user.hairType)
    ) || productCatalog.find(p => p.category === 'hair');

    // Deduplicate by title+brand
    const seen = new Set<string>();
    return [skinProduct, hairProduct].filter((p): p is NonNullable<typeof p> => {
      if (!p) return false;
      const key = `${p.name.toLowerCase()}|${p.brand.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [user.skinConcerns, user.hairType]);

  // Pick 1 remedy
  const recommendedRemedy = useMemo(() => {
    if (user.skinConcerns.includes('dryness')) return remedies.find(r => r.category === 'Skin');
    if (user.hairConcerns.length > 0) return remedies.find(r => r.category === 'Hair');
    return remedies[0];
  }, [user.skinConcerns, user.hairConcerns]);

  // Progress metrics derived from real data (streak + glow score)
  const hydrationScore = useMemo(() => {
    const base = 40 + (user.streak * 3) + (user.skinConcerns.includes('dryness') ? -5 : 10);
    return Math.min(92, Math.max(30, base + glowScore.skin * 0.3));
  }, [user.streak, user.skinConcerns, glowScore.skin]);

  const consistencyScore = useMemo(() => {
    const base = 15 + (user.streak * 9);
    return Math.min(95, Math.max(10, base));
  }, [user.streak]);

  // Handle routine completion CTA — uses the REAL routine system
  const handleCompleteRoutine = useCallback(async () => {
    if (completedToday || !currentUser?.id) return;

    // Haptic feedback — instant UX
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

    // Optimistic UI update
    setShowGlow(true);
    setCompletedToday(true);

    // Determine which time of day based on current hour
    const timeOfDay = currentHour < 15 ? 'morning' : 'night';

    // Check if a routine_completions row already exists for today + time_of_day
    // If it does, preserve existing step data — only mark as fully completed
    const { data: existing } = await supabase
      .from('routine_completions')
      .select('id, completed_steps, total_steps')
      .eq('user_id', currentUser.id)
      .eq('completion_date', today)
      .eq('time_of_day', timeOfDay)
      .maybeSingle();

    if (existing) {
      // Row exists — preserve real step data, just mark fully completed
      await supabase
        .from('routine_completions')
        .update({ is_fully_completed: true })
        .eq('id', existing.id);
    } else {
      // No row for today — create one via the real sync flow
      await syncCompletion(timeOfDay, ['quick-complete-all'], 1);
    }

    // Award points through the same trusted flow as RoutinePage
    await recordPoints(5, 'routine_complete');
    awardBadge('first_step');

    toast.success(t('routineCompleted'), {
      description: t('routineCompletedDesc'),
    });

    setTimeout(() => setShowGlow(false), 2000);
  }, [completedToday, currentUser?.id, currentHour, syncCompletion, recordPoints, awardBadge, t, today]);

  return (
    <AppLayout showSearch showNotifications>
      <div className="px-4 py-5 space-y-5 animate-fade-in">
        {/* Today Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-foreground">
                {greeting}, {user.nickname || user.name} ☀️
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{statusMessage}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-accent/20 rounded-full px-3 py-1.5">
              <span className="text-lg">🔥</span>
              <span className="font-display font-bold text-foreground">{user.streak}</span>
              <span className="text-xs text-muted-foreground">{t('daysStreak')}</span>
            </div>
          </div>
        </div>

        {/* Primary CTA - Complete Routine */}
        <button
          onClick={handleCompleteRoutine}
          disabled={completedToday || isChecking}
          className={cn(
            'w-full relative overflow-hidden rounded-2xl p-5 text-center transition-all duration-300 shadow-warm',
            completedToday
              ? 'bg-primary/15 border-2 border-primary/30'
              : 'bg-gradient-olive text-primary-foreground hover:opacity-95 active:scale-[0.98]',
            showGlow && 'ring-4 ring-primary/40 ring-offset-2 ring-offset-background'
          )}
        >
          {showGlow && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/20 to-primary/0 animate-pulse" />
          )}
          <div className="relative flex items-center justify-center gap-3">
            {completedToday ? (
              <>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div className="text-center">
                  <span className="font-display text-lg font-semibold text-primary block">
                    {t('routineDoneToday')}
                  </span>
                  <p className="text-sm text-primary/70 mt-0.5">
                    🔥 {t('streakTomorrowHook', { streak: String(user.streak + 1) })}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                <span className="font-display text-lg font-semibold">
                  {t('completedRoutine')}
                </span>
              </>
            )}
          </div>
          {!completedToday && !isChecking && (
            <p className="relative text-sm opacity-80 mt-1">+5 {t('points')} · 🔥 {t('keepItUp')}</p>
          )}
        </button>

        <InstallBanner />

        {/* Progress Section */}
        <div className="bg-card rounded-2xl p-5 shadow-warm space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-display text-base font-semibold">{t('yourProgress')}</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            {user.streak > 0 ? t('skinImproving') : t('startYourJourney')}
          </p>

          {/* Hydration — derived from streak + glow score */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-glow-skin" />
                {t('hydrationLevel')}
              </span>
              <span className="font-semibold text-glow-skin">{Math.round(hydrationScore)}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-glow-skin rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${hydrationScore}%` }}
              />
            </div>
          </div>

          {/* Consistency — derived from streak */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-glow-nutrition" />
                {t('consistencyScore')}
              </span>
              <span className="font-semibold text-glow-nutrition">{Math.round(consistencyScore)}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-glow-nutrition rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${consistencyScore}%` }}
              />
            </div>
          </div>

          {/* Glow Score mini */}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('yourGlowScore')}</span>
            <Link to="/profile" className="flex items-center gap-1 text-primary font-semibold text-sm">
              {glowScore.overall}/100
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Today's Recommendations */}
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold">{t('todayRecommendations')}</h2>

          <div className="space-y-2.5">
            {recommendedProducts.map((product, i) => (
              product && (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-warm hover:shadow-warm-lg transition-all"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.brand}</p>
                    <p className="text-xs text-primary mt-1 italic">
                      {i === 0 ? getRecommendationReason() : getHairReason()}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Link>
              )
            ))}

            {recommendedRemedy && (
              <Link
                to={`/remedy/${recommendedRemedy.id}`}
                className="flex items-center gap-3 bg-glow-nutrition/10 border border-glow-nutrition/25 rounded-2xl p-3 transition-all hover:shadow-warm"
              >
                <div className="w-16 h-16 rounded-xl bg-glow-nutrition/15 flex items-center justify-center text-3xl flex-shrink-0">
                  {recommendedRemedy.image}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-glow-nutrition bg-glow-nutrition/15 px-1.5 py-0.5 rounded-full">
                      {t('naturalRemedy')}
                    </span>
                  </div>
                  <p className="font-medium text-sm text-foreground truncate">{t(recommendedRemedy.titleKey)}</p>
                  <p className="text-xs text-primary mt-0.5 italic">{t('becauseNatural')}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 pb-2">
          <Link
            to="/routine"
            className="bg-gradient-olive text-primary-foreground rounded-2xl p-4 shadow-warm transition-all hover:opacity-90"
          >
            <span className="text-xl mb-1 block">🧴</span>
            <p className="font-medium text-sm">{t('startRoutine')}</p>
          </Link>
          <Link
            to="/discover"
            className="bg-card border border-border rounded-2xl p-4 shadow-warm transition-all hover:shadow-warm-lg"
          >
            <span className="text-xl mb-1 block">🔍</span>
            <p className="font-medium text-sm text-foreground">{t('discover')}</p>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage;
