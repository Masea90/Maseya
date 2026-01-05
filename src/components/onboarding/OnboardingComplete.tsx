import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check } from 'lucide-react';

export const OnboardingComplete = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/home');
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-6 text-center">
      <div className="animate-fade-in-scale space-y-6">
        <div className="relative">
          <div className="w-28 h-28 bg-primary rounded-full flex items-center justify-center shadow-warm-lg animate-glow mx-auto">
            <Check className="w-14 h-14 text-primary-foreground" />
          </div>
          <div className="absolute -top-2 -right-2">
            <Sparkles className="w-8 h-8 text-zwina-gold animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-primary">
            You're All Set!
          </h1>
          <p className="text-muted-foreground text-lg max-w-xs mx-auto">
            Your personalized glow journey begins now ✨
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    </div>
  );
};
