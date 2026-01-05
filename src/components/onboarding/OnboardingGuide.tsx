import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Target, Compass, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import { TranslationKey } from "@/lib/i18n";

const steps: {
  icon: typeof Sparkles;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}[] = [
  {
    icon: Sparkles,
    titleKey: "guideStep1Title",
    descriptionKey: "guideStep1Desc",
  },
  {
    icon: Target,
    titleKey: "guideStep2Title",
    descriptionKey: "guideStep2Desc",
  },
  {
    icon: Users,
    titleKey: "guideStep3Title",
    descriptionKey: "guideStep3Desc",
  },
  {
    icon: Compass,
    titleKey: "guideStep4Title",
    descriptionKey: "guideStep4Desc",
  },
];

export function OnboardingGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { t, setGuideCompleted } = useUser();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setGuideCompleted(true);
    navigate("/onboarding/welcome");
  };

  const handleSkip = () => {
    setGuideCompleted(true);
    navigate("/onboarding/welcome");
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/20 to-background flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("guideSkip")}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32">
        {/* Icon with soft glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
            <Icon className="w-12 h-12 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        {/* Step indicator */}
        <p className="text-xs text-muted-foreground mb-4 tracking-wider uppercase">
          {currentStep + 1} / {steps.length}
        </p>

        {/* Title */}
        <h1 className="font-display text-2xl font-semibold text-center mb-4">
          {t(step.titleKey)}
        </h1>

        {/* Description */}
        <p className="text-muted-foreground text-center text-lg leading-relaxed max-w-xs">
          {t(step.descriptionKey)}
        </p>
      </div>

      {/* Bottom section */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pb-10 bg-gradient-to-t from-background via-background to-transparent">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentStep
                  ? "bg-primary w-6"
                  : index < currentStep
                  ? "bg-primary/60"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Action button */}
        <Button
          onClick={handleNext}
          className="w-full py-6 text-base font-medium rounded-full"
        >
          {currentStep === steps.length - 1
            ? t("guideStart")
            : t("guideNext")}
        </Button>
      </div>
    </div>
  );
}
