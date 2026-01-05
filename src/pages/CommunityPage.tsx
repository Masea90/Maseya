import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Heart, MessageCircle, Share2, MoreHorizontal, Plus, Users, Lock, Globe, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const mockPosts = [
  {
    id: 1,
    user: { name: 'Emma Wilson', avatar: '👩🏻', verified: true },
    content: 'Finally found a routine that works for my sensitive skin! The key was switching to fragrance-free everything. 🌿',
    image: null,
    likes: 124,
    comments: 18,
    time: '2h ago',
    privacy: 'everyone',
    tags: ['sensitive skin', 'routine'],
  },
  {
    id: 2,
    user: { name: 'Aisha M.', avatar: '👩🏾', verified: false },
    content: 'Rice water rinse results after 4 weeks! My hair has never been shinier ✨',
    image: '💇🏾‍♀️',
    likes: 287,
    comments: 45,
    time: '5h ago',
    privacy: 'women',
    tags: ['hair care', 'rice water'],
  },
  {
    id: 3,
    user: { name: 'Sophie L.', avatar: '👩🏼', verified: true },
    content: 'PSA: Vitamin C serum should be applied BEFORE moisturizer, not after! Game changer for absorption 💡',
    image: null,
    likes: 456,
    comments: 62,
    time: '8h ago',
    privacy: 'everyone',
    tags: ['tips', 'vitamin c'],
  },
  {
    id: 4,
    user: { name: 'Maria G.', avatar: '👩🏽', verified: false },
    content: 'Made the honey oatmeal mask from the app today - my skin feels so soft! Highly recommend for dry winter skin 🍯',
    image: '🍯',
    likes: 89,
    comments: 12,
    time: '1d ago',
    privacy: 'women',
    tags: ['diy', 'mask'],
  },
];

const CommunityPage = () => {
  const [likedPosts, setLikedPosts] = useState<number[]>([]);

  const toggleLike = (postId: number) => {
    setLikedPosts(prev =>
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
  };

  return (
    <AppLayout title="Community">
      <div className="px-4 py-6 space-y-4 animate-fade-in">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">12.5k members</span>
          </div>
          <Button size="sm" className="rounded-full bg-gradient-olive">
            <Plus className="w-4 h-4 mr-1" />
            Post
          </Button>
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {mockPosts.map(post => (
            <div
              key={post.id}
              className="bg-card rounded-2xl p-4 shadow-warm space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-xl">
                    {post.user.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground">{post.user.name}</span>
                      {post.user.verified && (
                        <span className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-[8px] text-primary-foreground">✓</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{post.time}</span>
                      <span>•</span>
                      {post.privacy === 'women' ? (
                        <span className="flex items-center gap-0.5">
                          <Lock className="w-3 h-3" /> Women only
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <Globe className="w-3 h-3" /> Everyone
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <p className="text-foreground text-sm leading-relaxed">{post.content}</p>

              {/* Image */}
              {post.image && (
                <div className="bg-secondary rounded-xl aspect-video flex items-center justify-center text-6xl">
                  {post.image}
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-secondary text-muted-foreground rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-6 pt-2 border-t border-border">
                <button
                  onClick={() => toggleLike(post.id)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Heart
                    className={cn(
                      'w-5 h-5 transition-colors',
                      likedPosts.includes(post.id) && 'fill-zwina-rose text-zwina-rose'
                    )}
                  />
                  <span>{post.likes + (likedPosts.includes(post.id) ? 1 : 0)}</span>
                </button>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span>{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CommunityPage;
