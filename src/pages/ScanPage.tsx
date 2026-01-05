import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { Camera, Lock, Crown, Sparkles, ChevronLeft } from 'lucide-react';

const ScanPage = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  if (!user.isPremium) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Locked State */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center">
              <Camera className="w-16 h-16 text-muted-foreground" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-zwina-gold rounded-full flex items-center justify-center shadow-warm">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold mb-2">AI Skin & Hair Scanner</h1>
          <p className="text-muted-foreground mb-8 max-w-xs">
            Get personalized analysis of your skin and hair health using advanced AI technology
          </p>

          <div className="space-y-4 w-full max-w-sm mb-8">
            <div className="bg-card rounded-2xl p-4 text-left flex items-start gap-3 shadow-warm">
              <Sparkles className="w-5 h-5 text-glow-skin flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Skin Analysis</p>
                <p className="text-sm text-muted-foreground">
                  Hydration, texture, pores, and personalized recommendations
                </p>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-4 text-left flex items-start gap-3 shadow-warm">
              <Sparkles className="w-5 h-5 text-glow-hair flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Hair Analysis</p>
                <p className="text-sm text-muted-foreground">
                  Scalp health, damage level, porosity, and care tips
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => navigate('/premium')}
            className="w-full max-w-sm h-14 rounded-2xl text-lg font-medium bg-zwina-gold hover:bg-zwina-gold/90 text-white shadow-warm"
          >
            <Crown className="w-5 h-5 mr-2" />
            Unlock with Premium
          </Button>
        </div>
      </div>
    );
  }

  // Premium user - show scan interface
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-display text-lg font-semibold">AI Scanner</span>
        <div className="w-10" />
      </div>

      {/* Scan Interface */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-64 h-64 bg-card rounded-full flex items-center justify-center shadow-warm-lg mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-glow-skin/20 to-glow-hair/20 animate-pulse-soft" />
          <Camera className="w-20 h-20 text-primary relative z-10" />
        </div>

        <h2 className="font-display text-xl font-semibold mb-2">Ready to Scan</h2>
        <p className="text-muted-foreground mb-8 max-w-xs">
          Position your face in good lighting for the best results
        </p>

        <div className="space-y-3 w-full max-w-sm">
          <Button className="w-full h-14 rounded-2xl text-lg font-medium bg-glow-skin/80 hover:bg-glow-skin text-white">
            <Camera className="w-5 h-5 mr-2" />
            Scan Skin
          </Button>
          <Button className="w-full h-14 rounded-2xl text-lg font-medium bg-glow-hair/80 hover:bg-glow-hair text-white">
            <Camera className="w-5 h-5 mr-2" />
            Scan Hair
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScanPage;
