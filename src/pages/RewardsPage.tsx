import { AppLayout } from '@/components/layout/AppLayout';
import { Star, Trophy, Clock, Flame, Sparkles } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useRewards, ALL_BADGES, LEVELS, getUserLevel } from '@/hooks/useRewards';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

const RewardsPage = () => {
  const { user, t } = useUser();
  const { earnedBadgeIds, transactions, isLoading, levelInfo } = useRewards();

  const earnedCount = earnedBadgeIds.size;
  const totalBadges = ALL_BADGES.length;

  const categories = [
    { key: 'routine' as const, label: t('routineNav'), emoji: '🧴' },
    { key: 'streak' as const, label: t('streak'), emoji: '🔥' },
    { key: 'community' as const, label: t('communityNav'), emoji: '💬' },
    { key: 'shopping' as const, label: t('discover'), emoji: '🛍️' },
    { key: 'profile' as const, label: t('profile'), emoji: '👤' },
  ];

  const getReasonLabel = (reason: string): string => {
    const map: Record<string, string> = {
      routine_step: t('earnPointsPerStep'),
      routine_complete: t('pointsEarned'),
      community_post: t('post'),
      affiliate_click: t('discover'),
      badge_earned: 'Badge',
    };
    return map[reason] || reason;
  };

  const formatTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (isLoading) {
    return (
      <AppLayout title={t('rewards')}>
        <div className="px-4 py-6 space-y-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('rewards')}>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Points + Level Card */}
        <div className="bg-gradient-to-br from-maseya-gold/20 to-maseya-terracotta/20 rounded-3xl p-6 shadow-warm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('points')}</p>
              <div className="flex items-center gap-2">
                <Star className="w-7 h-7 text-maseya-gold" />
                <span className="font-display text-4xl font-bold text-foreground">
                  {user.points}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Level</p>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl">{levelInfo.current.emoji}</span>
                <span className="font-display text-lg font-semibold">{levelInfo.current.name}</span>
              </div>
            </div>
          </div>

          {/* Level progress */}
          {levelInfo.nextLevel && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Lv.{levelInfo.current.level} {levelInfo.current.name}</span>
                <span>Lv.{levelInfo.nextLevel.level} {levelInfo.nextLevel.name}</span>
              </div>
              <Progress value={levelInfo.progressToNext} className="h-2.5" />
              <p className="text-xs text-muted-foreground text-center">
                {levelInfo.nextLevel.minPoints - user.points} pts to next level
              </p>
            </div>
          )}
          {!levelInfo.nextLevel && (
            <p className="text-sm text-center text-maseya-gold font-medium">
              🎉 Max level reached!
            </p>
          )}
        </div>

        {/* How to Earn */}
        <div className="bg-card rounded-2xl p-4 shadow-warm">
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-maseya-gold" />
            {t('earnPointsPerStep')}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('stepCleanser')}, {t('stepToner')}...</span>
              <span className="font-medium text-primary">+2 pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('morningRoutine')} / {t('nightRoutine')}</span>
              <span className="font-medium text-primary">+5 pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('post')} ({t('communityNav')})</span>
              <span className="font-medium text-primary">+3 pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">🛍️ {t('discover')}</span>
              <span className="font-medium text-primary">+3 pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">7-day streak</span>
              <span className="font-medium text-primary">+50 pts</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="badges">
          <TabsList className="w-full">
            <TabsTrigger value="badges" className="flex-1 gap-1.5">
              <Trophy className="w-4 h-4" />
              Badges ({earnedCount}/{totalBadges})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5">
              <Clock className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges" className="mt-4 space-y-5">
            {categories.map(cat => {
              const catBadges = ALL_BADGES.filter(b => b.category === cat.key);
              return (
                <div key={cat.key}>
                  <h3 className="font-display text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <span>{cat.emoji}</span> {cat.label}
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {catBadges.map(badge => {
                      const earned = earnedBadgeIds.has(badge.id);
                      return (
                        <div
                          key={badge.id}
                          className={cn(
                            'rounded-2xl p-3.5 border transition-all',
                            earned
                              ? 'bg-maseya-gold/10 border-maseya-gold/30 shadow-warm'
                              : 'bg-card border-border opacity-50'
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className={cn('text-2xl', !earned && 'grayscale')}>
                              {badge.emoji}
                            </span>
                            <div className="min-w-0">
                              <p className={cn(
                                'font-medium text-sm leading-tight',
                                earned ? 'text-foreground' : 'text-muted-foreground'
                              )}>
                                {badge.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                                {badge.description}
                              </p>
                            </div>
                          </div>
                          {earned && (
                            <div className="mt-2 text-xs text-maseya-gold font-medium flex items-center gap-1">
                              ✓ Earned
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* All levels */}
            <div>
              <h3 className="font-display text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-maseya-terracotta" /> Levels
              </h3>
              <div className="space-y-2">
                {LEVELS.map(level => {
                  const reached = user.points >= level.minPoints;
                  return (
                    <div
                      key={level.level}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all',
                        reached
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-card border-border opacity-50'
                      )}
                    >
                      <span className={cn('text-xl', !reached && 'grayscale')}>{level.emoji}</span>
                      <div className="flex-1">
                        <p className={cn('font-medium text-sm', !reached && 'text-muted-foreground')}>
                          Lv.{level.level} — {level.name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">{level.minPoints} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No point history yet</p>
                <p className="text-xs">Complete routine steps and post in the community to earn points!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-card rounded-xl border border-border"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{getReasonLabel(tx.reason)}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(tx.created_at)}</p>
                    </div>
                    <span className={cn(
                      'font-semibold text-sm whitespace-nowrap',
                      tx.amount > 0 ? 'text-primary' : 'text-destructive'
                    )}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default RewardsPage;
