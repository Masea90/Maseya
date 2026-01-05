interface GlowScoreProps {
  skin: number;
  hair: number;
  nutrition: number;
}

export const GlowScore = ({ skin, hair, nutrition }: GlowScoreProps) => {
  const overall = Math.round((skin + hair + nutrition) / 3);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (overall / 100) * circumference;

  return (
    <div className="bg-card rounded-3xl p-6 shadow-warm">
      <h2 className="font-display text-lg font-semibold mb-4">Your Glow Score</h2>
      
      <div className="flex items-center gap-6">
        {/* Circular Progress */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="10"
            />
            <circle
              cx="56"
              cy="56"
              r="45"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold text-primary">{overall}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Skin</span>
              <span className="font-medium text-glow-skin">{skin}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-glow-skin rounded-full transition-all duration-700"
                style={{ width: `${skin}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Hair</span>
              <span className="font-medium text-glow-hair">{hair}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-glow-hair rounded-full transition-all duration-700"
                style={{ width: `${hair}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nutrition</span>
              <span className="font-medium text-glow-nutrition">{nutrition}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-glow-nutrition rounded-full transition-all duration-700"
                style={{ width: `${nutrition}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
        <span className="text-lg">📈</span>
        <span className="text-sm text-muted-foreground">
          <span className="text-primary font-medium">+5%</span> improvement this week
        </span>
      </div>
    </div>
  );
};
