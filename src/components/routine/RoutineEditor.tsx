import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings2, Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/lib/i18n';

export interface CustomStep {
  id: string;
  label: string;
  product: string;
  emoji: string;
  duration: string;
  isDefault?: boolean;
  defaultStepKey?: string;
  defaultProductKey?: string;
  defaultDurationKey?: string;
}

type TimeOfDay = 'morning' | 'night';

interface RoutineEditorProps {
  timeOfDay: TimeOfDay;
  steps: CustomStep[];
  onSave: (steps: CustomStep[]) => void;
}

const EMOJI_OPTIONS = ['🧴', '🌹', '✨', '💧', '☀️', '🫒', '💫', '🔬', '👁️', '🌙', '🍯', '🧊', '💆', '🌿', '🫧'];

const DURATION_OPTIONS = ['30 sec', '1 min', '2 min', '3 min', '5 min'];

export const RoutineEditor = ({ timeOfDay, steps, onSave }: RoutineEditorProps) => {
  const { t } = useUser();
  const [editSteps, setEditSteps] = useState<CustomStep[]>(steps);
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStep, setNewStep] = useState({ label: '', product: '', emoji: '🧴', duration: '1 min' });

  const handleOpen = (open: boolean) => {
    if (open) {
      setEditSteps(steps);
      setShowAddForm(false);
      setNewStep({ label: '', product: '', emoji: '🧴', duration: '1 min' });
    }
    setIsOpen(open);
  };

  const removeStep = (id: string) => {
    setEditSteps(prev => prev.filter(s => s.id !== id));
  };

  const addStep = () => {
    if (!newStep.label.trim()) return;
    const step: CustomStep = {
      id: `custom-${Date.now()}`,
      label: newStep.label.trim(),
      product: newStep.product.trim() || newStep.label.trim(),
      emoji: newStep.emoji,
      duration: newStep.duration,
      isDefault: false,
    };
    setEditSteps(prev => [...prev, step]);
    setNewStep({ label: '', product: '', emoji: '🧴', duration: '1 min' });
    setShowAddForm(false);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...editSteps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setEditSteps(newSteps);
  };

  const handleSave = () => {
    onSave(editSteps);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <button className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-display text-lg">
            {timeOfDay === 'morning' ? '☀️' : '🌙'}{' '}
            {t('editRoutine')}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pb-24">
          {editSteps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
            >
              {/* Reorder controls */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveStep(index, 'up')}
                  disabled={index === 0}
                  className={cn(
                    'p-0.5 rounded transition-colors',
                    index === 0 ? 'text-muted-foreground/30' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Emoji */}
              <span className="text-xl">{step.emoji}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {step.isDefault && step.defaultStepKey ? t(step.defaultStepKey as TranslationKey) : step.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.isDefault && step.defaultProductKey ? t(step.defaultProductKey as TranslationKey) : step.product}
                </p>
              </div>

              {/* Duration badge */}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {step.isDefault && step.defaultDurationKey ? t(step.defaultDurationKey as TranslationKey) : step.duration}
              </span>

              {/* Remove button */}
              <button
                onClick={() => removeStep(step.id)}
                className="p-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Add new step */}
          {showAddForm ? (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
              <div className="flex gap-2">
                {/* Emoji selector */}
                <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewStep(prev => ({ ...prev, emoji }))}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all',
                        newStep.emoji === emoji ? 'bg-primary/20 scale-110' : 'hover:bg-muted'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                placeholder={t('stepName')}
                value={newStep.label}
                onChange={e => setNewStep(prev => ({ ...prev, label: e.target.value }))}
                className="bg-background"
              />
              <Input
                placeholder={t('productName')}
                value={newStep.product}
                onChange={e => setNewStep(prev => ({ ...prev, product: e.target.value }))}
                className="bg-background"
              />

              {/* Duration selector */}
              <div className="flex gap-2 flex-wrap">
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setNewStep(prev => ({ ...prev, duration: d }))}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      newStep.duration === d
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1"
                >
                  {t('cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={addStep}
                  disabled={!newStep.label.trim()}
                  className="flex-1"
                >
                  {t('addStep')}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">{t('addStep')}</span>
            </button>
          )}
        </div>

        {/* Save button - fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <Button onClick={handleSave} className="w-full" size="lg">
            {t('saveRoutine')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
