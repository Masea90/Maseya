import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { Check, Crown, X, Camera, Sparkles, Zap } from 'lucide-react';

const freeFeatures = [
  'Personalized skin & hair profile',
  'Daily beauty tips',
  'Natural remedy library',
  'Community access',
  'Points & rewards',
];

const premiumFeatures = [
  'AI Skin & Hair Scanner',
  'Advanced ingredient analysis',
  'Exclusive product recommendations',
  'Priority community support',
  'Ad-free experience',
];

export const PremiumScreen = () => {
  const navigate = useNavigate();
  const { completeOnboarding, updateUser } = useUser();

  const handleStartFree = () => {
    completeOnboarding();
    navigate('/home');
  };

  const handleStartPremium = () => {
    updateUser({ isPremium: true });
    completeOnboarding();
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
        >
          <X className="w-6 h-6 text-muted-foreground" />
        </button>
        <span className="font-display text-lg font-semibold">Choose Your Plan</span>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 space-y-6 animate-fade-in">
        {/* Free Plan */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-warm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Free</h3>
              <p className="text-sm text-muted-foreground">Great to start</p>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {freeFeatures.map(feature => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
          <Button
            onClick={handleStartFree}
            variant="outline"
            className="w-full h-12 rounded-2xl font-medium"
          >
            Start Free
          </Button>
        </div>

        {/* Premium Plan */}
        <div className="relative bg-gradient-to-br from-zwina-gold/10 via-card to-zwina-terracotta/10 border-2 border-zwina-gold/50 rounded-3xl p-6 shadow-warm-lg overflow-hidden">
          {/* Popular Badge */}
          <div className="absolute top-0 right-0 bg-zwina-gold text-white text-xs font-medium px-3 py-1 rounded-bl-2xl rounded-tr-3xl">
            POPULAR
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-zwina-gold/20 rounded-2xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-zwina-gold" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">Premium</h3>
              <p className="text-sm text-muted-foreground">
                <span className="text-zwina-gold font-semibold">$9.99</span>/month
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Everything in Free, plus:
          </p>

          <ul className="space-y-3 mb-6">
            {premiumFeatures.map(feature => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <div className="w-4 h-4 rounded-full bg-zwina-gold/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-zwina-gold" />
                </div>
                <span className="text-foreground font-medium">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            <Button
              onClick={handleStartPremium}
              className="w-full h-12 rounded-2xl font-medium bg-zwina-gold hover:bg-zwina-gold/90 text-white shadow-warm"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start 7-Day Free Trial
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Cancel anytime. No commitment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
