import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Gift, Star, Tag, Coffee, Sparkles, ChevronRight } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const rewards = [
  {
    id: 1,
    title: '10% Off First Order',
    description: 'Valid on any product from our partners',
    points: 100,
    icon: Tag,
    category: 'discount',
  },
  {
    id: 2,
    title: 'Free Sample Pack',
    description: '3 deluxe samples of clean beauty products',
    points: 200,
    icon: Gift,
    category: 'product',
  },
  {
    id: 3,
    title: '15-Min Skin Consultation',
    description: 'Video call with a licensed esthetician',
    points: 350,
    icon: Coffee,
    category: 'service',
  },
  {
    id: 4,
    title: 'Premium Skincare Set',
    description: 'Full-size products worth $50+',
    points: 500,
    icon: Sparkles,
    category: 'product',
  },
];

const RewardsPage = () => {
  const { user } = useUser();
  const [selectedReward, setSelectedReward] = useState<number | null>(null);

  return (
    <AppLayout title="Rewards Store">
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Points Balance */}
        <div className="bg-gradient-to-br from-zwina-gold/20 to-zwina-terracotta/20 rounded-3xl p-6 shadow-warm text-center">
          <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
          <div className="flex items-center justify-center gap-2">
            <Star className="w-8 h-8 text-zwina-gold" />
            <span className="font-display text-4xl font-bold text-foreground">
              {user.points}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">points</p>
        </div>

        {/* How to Earn */}
        <div className="bg-card rounded-2xl p-4 shadow-warm">
          <h2 className="font-display text-lg font-semibold mb-3">Earn More Points</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Complete routine step</span>
              <span className="font-medium text-primary">+5 pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full routine completion</span>
              <span className="font-medium text-primary">+15 pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Try a remedy</span>
              <span className="font-medium text-primary">+10 pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Post in community</span>
              <span className="font-medium text-primary">+5 pts</span>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Redeem Rewards</h2>
          <div className="space-y-3">
            {rewards.map(reward => {
              const canRedeem = user.points >= reward.points;
              return (
                <div
                  key={reward.id}
                  className={cn(
                    'bg-card rounded-2xl p-4 shadow-warm transition-all',
                    canRedeem ? 'hover:shadow-warm-lg cursor-pointer' : 'opacity-60'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center',
                      canRedeem ? 'bg-zwina-gold/20' : 'bg-muted'
                    )}>
                      <reward.icon className={cn(
                        'w-6 h-6',
                        canRedeem ? 'text-zwina-gold' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{reward.title}</h3>
                      <p className="text-sm text-muted-foreground">{reward.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'font-semibold',
                        canRedeem ? 'text-zwina-gold' : 'text-muted-foreground'
                      )}>
                        {reward.points}
                      </p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                  {canRedeem && (
                    <Button
                      size="sm"
                      className="w-full mt-3 rounded-xl bg-zwina-gold hover:bg-zwina-gold/90 text-white"
                    >
                      Redeem
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default RewardsPage;
