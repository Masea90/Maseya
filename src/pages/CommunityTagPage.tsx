import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Hash, MessageCircle } from 'lucide-react';
import { HashtagText } from '@/components/community/HashtagText';

interface TagPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  category: string | null;
  image_url: string | null;
  nickname?: string;
  avatarUrl?: string | null;
}

const CommunityTagPage = () => {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { t } = useUser();
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<TagPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tag) return;
    loadTagPosts();
  }, [tag]);

  const loadTagPosts = async () => {
    setIsLoading(true);
    try {
      // Search for posts containing the hashtag
      const { data, error } = await supabase
        .from('community_posts')
        .select('id, user_id, content, created_at, likes_count, comments_count, category, image_url')
        .eq('visibility', 'everyone')
        .eq('moderation_status', 'approved')
        .ilike('content', `%#${tag}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profiles } = await supabase.rpc('get_public_profiles', { p_user_ids: userIds });
        const profileMap = new Map<string, any>();
        (profiles as any[])?.forEach((p: any) => profileMap.set(p.user_id, p));

        setPosts(data.map(p => ({
          ...p,
          nickname: profileMap.get(p.user_id)?.nickname,
          avatarUrl: profileMap.get(p.user_id)?.avatar_url || null,
        })));
      } else {
        setPosts([]);
      }
    } catch (e) {
      console.error('Error loading tag posts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <AppLayout title={`#${tag}`}>
      <div className="px-4 py-6 space-y-4 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Hash className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-foreground">#{tag}</h1>
            <p className="text-xs text-muted-foreground">{posts.length} posts</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No posts with #{tag} yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="bg-card rounded-2xl p-4 shadow-warm space-y-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate(`/user/${post.user_id}`)} className="focus:outline-none">
                    <Avatar className="w-9 h-9 hover:ring-2 hover:ring-primary/40 transition-all">
                      <AvatarImage src={post.avatarUrl || undefined} />
                      <AvatarFallback className="bg-secondary text-xs">
                        {post.nickname?.slice(0, 2).toUpperCase() || '👤'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div>
                    <button
                      onClick={() => navigate(`/user/${post.user_id}`)}
                      className="font-medium text-sm text-foreground hover:text-primary transition-colors"
                    >
                      {post.nickname || t('anonymous')}
                    </button>
                    <p className="text-xs text-muted-foreground">{getTimeAgo(post.created_at)}</p>
                  </div>
                </div>

                {post.image_url && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img src={post.image_url} alt="Post" className="w-full max-h-48 object-cover" loading="lazy" />
                  </div>
                )}

                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  <HashtagText text={post.content} />
                </p>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>❤️ {post.likes_count}</span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {post.comments_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CommunityTagPage;
