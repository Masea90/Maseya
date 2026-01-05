import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/contexts/UserContext';
import { Check, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    id: 'skin',
    title: 'What are your skin concerns?',
    subtitle: 'Select all that apply',
    options: [
      { id: 'dryness', label: 'Dryness', emoji: '💧' },
      { id: 'acne', label: 'Acne & Breakouts', emoji: '🔴' },
      { id: 'aging', label: 'Fine Lines & Aging', emoji: '✨' },
      { id: 'sensitivity', label: 'Sensitivity', emoji: '🌸' },
      { id: 'oiliness', label: 'Oily Skin', emoji: '💦' },
      { id: 'hyperpigmentation', label: 'Dark Spots', emoji: '🎯' },
      { id: 'dullness', label: 'Dull Skin', emoji: '😴' },
      { id: 'pores', label: 'Large Pores', emoji: '🔎' },
    ],
    multi: true,
    field: 'skinConcerns',
  },
  {
    id: 'hair',
    title: "What's your hair type?",
    subtitle: 'Select one',
    options: [
      { id: 'straight', label: 'Straight', emoji: '📏' },
      { id: 'wavy', label: 'Wavy', emoji: '🌊' },
      { id: 'curly', label: 'Curly', emoji: '🌀' },
      { id: 'coily', label: 'Coily', emoji: '⭕' },
    ],
    multi: false,
    field: 'hairType',
  },
  {
    id: 'hairConcerns',
    title: 'Any hair concerns?',
    subtitle: 'Select all that apply',
    options: [
      { id: 'dryness', label: 'Dry & Brittle', emoji: '🏜️' },
      { id: 'frizz', label: 'Frizz', emoji: '⚡' },
      { id: 'hairfall', label: 'Hair Fall', emoji: '😰' },
      { id: 'dandruff', label: 'Dandruff', emoji: '❄️' },
      { id: 'oily', label: 'Oily Scalp', emoji: '💧' },
      { id: 'thinning', label: 'Thinning', emoji: '🪶' },
    ],
    multi: true,
    field: 'hairConcerns',
  },
  {
    id: 'goals',
    title: 'What matters most to you?',
    subtitle: 'Select your top priorities',
    options: [
      { id: 'clearskin', label: 'Clear, Glowing Skin', emoji: '✨' },
      { id: 'healthyhair', label: 'Healthy, Strong Hair', emoji: '💪' },
      { id: 'natural', label: 'All-Natural Products', emoji: '🌿' },
      { id: 'nutrition', label: 'Better Nutrition', emoji: '🥗' },
      { id: 'routine', label: 'Simple Routines', emoji: '📋' },
      { id: 'community', label: 'Community Support', emoji: '💕' },
    ],
    multi: true,
    field: 'goals',
  },
];

export const OnboardingQuiz = () => {
  const navigate = useNavigate();
  const { updateUser, completeOnboarding } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({
    skinConcerns: [],
    hairType: [],
    hairConcerns: [],
    goals: [],
  });

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const toggleSelection = (optionId: string) => {
    const field = step.field;
    setSelections(prev => {
      const current = prev[field] || [];
      if (step.multi) {
        return {
          ...prev,
          [field]: current.includes(optionId)
            ? current.filter(id => id !== optionId)
            : [...current, optionId],
        };
      } else {
        return {
          ...prev,
          [field]: current.includes(optionId) ? [] : [optionId],
        };
      }
    });
  };

  const isSelected = (optionId: string) => {
    return (selections[step.field] || []).includes(optionId);
  };

  const canContinue = (selections[step.field] || []).length > 0;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Save all selections
      updateUser({
        skinConcerns: selections.skinConcerns,
        hairType: selections.hairType[0] || '',
        hairConcerns: selections.hairConcerns,
        goals: selections.goals,
      });
      navigate('/onboarding/premium');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-muted-foreground" />
          </button>
          <span className="text-sm text-muted-foreground">
            {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={() => navigate('/onboarding/premium')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Skip
          </button>
        </div>
        <Progress value={progress} className="h-2 bg-secondary" />
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 animate-fade-in" key={step.id}>
        <div className="space-y-2 mb-8">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {step.title}
          </h1>
          <p className="text-muted-foreground">{step.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {step.options.map(option => (
            <button
              key={option.id}
              onClick={() => toggleSelection(option.id)}
              className={cn(
                'relative p-4 rounded-2xl border-2 text-left transition-all duration-200',
                isSelected(option.id)
                  ? 'border-primary bg-primary/10 shadow-warm'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              {isSelected(option.id) && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <span className="text-2xl mb-2 block">{option.emoji}</span>
              <span className="font-medium text-sm text-foreground">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pt-0">
        <Button
          onClick={handleNext}
          disabled={!canContinue}
          className="w-full h-14 text-lg font-medium rounded-2xl bg-gradient-olive hover:opacity-90 transition-all shadow-warm-lg disabled:opacity-50"
        >
          {currentStep < steps.length - 1 ? (
            <>
              Continue
              <ChevronRight className="w-5 h-5 ml-1" />
            </>
          ) : (
            'Complete'
          )}
        </Button>
      </div>
    </div>
  );
};
