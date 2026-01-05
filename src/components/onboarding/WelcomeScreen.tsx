import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Leaf, Heart } from 'lucide-react';

export const WelcomeScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center p-6 text-center">
      <div className="animate-fade-in space-y-8 max-w-sm">
        {/* Logo & Icon */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center shadow-warm-lg animate-pulse-soft">
            <span className="text-5xl">🌿</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-primary">ZWINA</h1>
          <p className="text-muted-foreground text-lg">
            Your natural beauty journey starts here
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 py-6">
          <div className="flex items-center gap-3 text-left bg-card/60 backdrop-blur-sm rounded-2xl p-4 shadow-warm">
            <div className="w-10 h-10 bg-glow-skin/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-glow-skin" />
            </div>
            <div>
              <p className="font-medium text-foreground">Personalized Skin Care</p>
              <p className="text-sm text-muted-foreground">Tailored to your unique skin</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left bg-card/60 backdrop-blur-sm rounded-2xl p-4 shadow-warm">
            <div className="w-10 h-10 bg-glow-hair/20 rounded-full flex items-center justify-center">
              <Leaf className="w-5 h-5 text-glow-hair" />
            </div>
            <div>
              <p className="font-medium text-foreground">Natural Remedies</p>
              <p className="text-sm text-muted-foreground">Clean, organic solutions</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left bg-card/60 backdrop-blur-sm rounded-2xl p-4 shadow-warm">
            <div className="w-10 h-10 bg-glow-nutrition/20 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-glow-nutrition" />
            </div>
            <div>
              <p className="font-medium text-foreground">Supportive Community</p>
              <p className="text-sm text-muted-foreground">Connect with like-minded women</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={() => navigate('/onboarding/quiz')}
            className="w-full h-14 text-lg font-medium rounded-2xl bg-gradient-olive hover:opacity-90 transition-all shadow-warm-lg"
          >
            Get Started
          </Button>
          <button
            onClick={() => navigate('/login')}
            className="text-muted-foreground hover:text-primary transition-colors text-sm"
          >
            Already have an account? <span className="font-medium underline">Sign in</span>
          </button>
        </div>
      </div>
    </div>
  );
};
