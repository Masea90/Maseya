import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, UserPlus, UserMinus, ArrowLeft, Sparkles, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface PublicProfile {
  user_id: string;
  nickname: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

interface PublicPost {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  category: string | null;
  image_url: string | null;
}

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useUser();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) return;
    loadProfile();
    loadPosts();
    loadFollowCounts();
    if (currentUser?.id) checkFollowStatus();
  }, [userId, currentUser?.id]);

  const loadProfile = async () => {
    try {
      // Use SECURITY DEFINER function — only returns safe public fields
      const { data, error } = await supabase.rpc('get_public_profile', {
        p_user_id: userId!,
      });

      if (error) throw error;
      // rpc returns an array; take first row
      const row = Array.isArray(data) ? data[0] : data;
      setProfile(row as PublicProfile ?? null);
    } catch (e) {
      console.error('Error loading profile:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('id, content, created_at, likes_count, comments_count, category, image_url')
        .eq('user_id', userId!)
        .eq('visibility', 'everyone')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (e) {
      console.error('Error loading posts:', e);
    }
  };

  const loadFollowCounts = async () => {
    try {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId!),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId!),
      ]);
      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (e) {
      console.error('Error loading follow counts:', e);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser?.id || !userId) return;
    try {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .maybeSingle();
      setIsFollowing(!!data);
    } catch (e) {
      console.error('Error checking follow:', e);
    }
  };

  const handleFollow = async () => {
    if (!currentUser?.id || !userId || isOwnProfile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        toast.success('Unfollowed');
      } else {
        await supabase
          .from('user_follows')
          .insert({ follower_id: currentUser.id, following_id: userId });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        toast.success('Following!');
      }
    } catch (e) {
      console.error('Error toggling follow:', e);
      toast.error('Something went wrong');
    } finally {
      setFollowLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  if (isLoading) {
    return (
      <AppLayout title="Profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout title="Profile">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <span className="text-4xl">👤</span>
          <p className="text-muted-foreground">User not found</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const initials = profile.nickname
    ? profile.nickname.slice(0, 2).toUpperCase()
    : '👤';

  return (
    <AppLayout title={profile.nickname || 'Profile'}>
      <div className="px-4 py-6 space-y-5 animate-fade-in">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Profile Header */}
        <Card className="overflow-hidden">
          <CardContent className="p-6 text-center space-y-4">
            <Avatar className="w-24 h-24 mx-auto border-4 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.nickname || 'User'} />
              <AvatarFallback className="bg-secondary text-3xl">{initials}</AvatarFallback>
            </Avatar>

            <div>
              <h1 className="font-display text-xl font-semibold text-foreground">
                {profile.nickname || t('anonymous')}
              </h1>
              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{profile.bio}</p>
              )}
              {profile.created_at && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Joined {new Date(profile.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="font-semibold text-foreground">{followersCount}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">{followingCount}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">{posts.length}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
            </div>

            {/* Follow button */}
            {!isOwnProfile && currentUser && (
              <Button
                onClick={handleFollow}
                disabled={followLoading}
                variant={isFollowing ? 'outline' : 'default'}
                className="rounded-full px-8"
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <><UserMinus className="w-4 h-4 mr-2" /> Unfollow</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" /> Follow</>
                )}
              </Button>
            )}

            {isOwnProfile && (
              <Button
                variant="outline"
                className="rounded-full px-8"
                onClick={() => navigate('/profile/edit')}
              >
                Edit Profile
              </Button>
            )}
          </CardContent>
        </Card>

        {/* User Posts */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Posts</h3>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No public posts yet</p>
          ) : (
            posts.map(post => (
              <Card key={post.id}>
                <CardContent className="p-4 space-y-2">
                  {post.category && post.category !== 'general' && (
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {post.category.replace('_', ' ')}
                    </span>
                  )}
                  {post.image_url && (
                    <div className="rounded-xl overflow-hidden border border-border">
                      <img src={post.image_url} alt="Post" className="w-full max-h-48 object-cover" loading="lazy" />
                    </div>
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">{post.content}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>❤️ {post.likes_count}</span>
                    <span>💬 {post.comments_count}</span>
                    <span className="ml-auto">{getTimeAgo(post.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default UserProfilePage;
