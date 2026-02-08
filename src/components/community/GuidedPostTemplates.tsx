import { Sparkles, BookOpen, Package, MessageSquare } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

export type PostCategory = 'what_worked' | 'my_routine' | 'product_helped' | 'general';

interface GuidedPostTemplatesProps {
  onSelect: (category: PostCategory) => void;
}

const templates: { category: PostCategory; icon: typeof Sparkles; labelKey: string; hintKey: string }[] = [
  { category: 'what_worked', icon: Sparkles, labelKey: 'templateWhatWorked', hintKey: 'templateWhatWorkedHint' },
  { category: 'my_routine', icon: BookOpen, labelKey: 'templateMyRoutine', hintKey: 'templateMyRoutineHint' },
  { category: 'product_helped', icon: Package, labelKey: 'templateProductHelped', hintKey: 'templateProductHelpedHint' },
  { category: 'general', icon: MessageSquare, labelKey: 'templateFreeform', hintKey: 'templateFreeformHint' },
];

export const GuidedPostTemplates = ({ onSelect }: GuidedPostTemplatesProps) => {
  const { t } = useUser();

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{t('chooseTemplate')}</p>
      <div className="grid grid-cols-1 gap-2">
        {templates.map(({ category, icon: Icon, labelKey, hintKey }) => (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{t(labelKey as any)}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(hintKey as any)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
