import { Heart, HandHeart, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

export type ReactionType = 'helped_me' | 'i_relate' | 'great_tip';

interface PostReactionsProps {
  postId: string;
  reactions: Record<ReactionType, number>;
  userReactions: Set<ReactionType>;
  onToggleReaction: (postId: string, type: ReactionType) => void;
}

const reactionConfig: { type: ReactionType; icon: typeof Heart; labelKey: string }[] = [
  { type: 'helped_me', icon: HandHeart, labelKey: 'reactionHelpedMe' },
  { type: 'i_relate', icon: Heart, labelKey: 'reactionIRelate' },
  { type: 'great_tip', icon: Lightbulb, labelKey: 'reactionGreatTip' },
];

export const PostReactions = ({ postId, reactions, userReactions, onToggleReaction }: PostReactionsProps) => {
  const { t } = useUser();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {reactionConfig.map(({ type, icon: Icon, labelKey }) => {
        const count = reactions[type] || 0;
        const isActive = userReactions.has(type);

        return (
          <button
            key={type}
            onClick={() => onToggleReaction(postId, type)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              isActive
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-secondary/60 text-muted-foreground border border-transparent hover:bg-secondary hover:text-foreground'
            )}
          >
            <Icon className={cn('w-3.5 h-3.5', isActive && 'fill-primary/30')} />
            <span>{t(labelKey as any)}</span>
            {count > 0 && (
              <span className={cn(
                'ml-0.5 text-[10px] font-semibold',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
