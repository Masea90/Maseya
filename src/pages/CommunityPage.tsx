import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Heart, MessageCircle, Share2, MoreHorizontal, Plus, Users, Lock, Globe, Send, X, Loader2, Pencil, Trash2, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProfileBadge } from '@/components/profile/ProfileBadge';

interface Post {
  id: string;
  user_id: string;
  content: string;
  visibility: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  nickname?: string;
  profileCompleteness?: number;
  profileTier?: 'starter' | 'rising' | 'trusted' | 'verified';
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  nickname?: string;
}

// Calculate profile completeness for community display
const calculateProfileTier = (profile: Record<string, unknown>): { percentage: number; tier: 'starter' | 'rising' | 'trusted' | 'verified' } => {
  let completed = 0;
  const total = 8;
  
  if ((profile.skin_concerns as string[])?.length > 0) completed++;
  if (profile.hair_type) completed++;
  if ((profile.goals as string[])?.length > 0) completed++;
  if ((profile.sensitivities as string[])?.length > 0) completed++;
  if (profile.age_range) completed++;
  if (profile.country && profile.climate_type) completed++;
  if (profile.nickname) completed++;
  if ((profile.hair_concerns as string[])?.length > 0) completed++;
  
  const percentage = Math.round((completed / total) * 100);
  
  let tier: 'starter' | 'rising' | 'trusted' | 'verified';
  if (percentage >= 90) tier = 'verified';
  else if (percentage >= 70) tier = 'trusted';
  else if (percentage >= 40) tier = 'rising';
  else tier = 'starter';
  
  return { percentage, tier };
};

const CommunityPage = () => {
  const { t, user } = useUser();
  const { currentUser } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostVisibility, setNewPostVisibility] = useState<'everyone' | 'women_only'>('everyone');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set());
  const [translatedPosts, setTranslatedPosts] = useState<Map<string, string>>(new Map());
  // Load posts
  useEffect(() => {
    loadPosts();
    loadUserLikes();
  }, [currentUser?.id]);

  const loadPosts = async () => {
    try {
      // First get posts
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;
      
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      
      // Fetch profiles for those users (include completeness fields)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, nickname, skin_concerns, hair_type, hair_concerns, goals, sensitivities, age_range, country, climate_type')
        .in('user_id', userIds);

      // Create maps for nickname and profile completeness
      const profileMap = new Map<string, { nickname?: string; percentage: number; tier: 'starter' | 'rising' | 'trusted' | 'verified' }>();
      profilesData?.forEach(p => {
        const { percentage, tier } = calculateProfileTier(p as unknown as Record<string, unknown>);
        profileMap.set(p.user_id, {
          nickname: p.nickname || undefined,
          percentage,
          tier,
        });
      });

      // Merge posts with profile data
      const postsWithProfiles: Post[] = postsData.map(post => {
        const profile = profileMap.get(post.user_id);
        return {
          ...post,
          nickname: profile?.nickname,
          profileCompleteness: profile?.percentage || 0,
          profileTier: profile?.tier || 'starter',
        };
      });

      setPosts(postsWithProfiles);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserLikes = async () => {
    if (!currentUser?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUser.id);

      if (error) throw error;
      setLikedPosts(new Set(data?.map(l => l.post_id) || []));
    } catch (error) {
      console.error('Error loading likes:', error);
    }
  };

  const MAX_POST_LENGTH = 5000;
  const MAX_COMMENT_LENGTH = 1000;

  const handleCreatePost = async () => {
    const trimmedContent = newPostContent.trim();
    if (!trimmedContent || !currentUser?.id) return;
    
    // Validate length
    if (trimmedContent.length > MAX_POST_LENGTH) {
      toast.error(`Post must be ${MAX_POST_LENGTH} characters or less`);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: currentUser.id,
          content: trimmedContent,
          visibility: newPostVisibility,
          tags: [],
        });

      if (error) throw error;
      
      toast.success('Post shared! 🌿');
      setNewPostContent('');
      setShowNewPost(false);
      loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!currentUser?.id) return;

    const isLiked = likedPosts.has(postId);
    
    // Optimistic update
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });

    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) }
        : p
    ));

    try {
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: currentUser.id });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      loadPosts();
      loadUserLikes();
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      // First get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;
      
      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setLoadingComments(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      
      // Fetch profiles for those users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, nickname')
        .in('user_id', userIds);

      // Create a map of user_id to nickname
      const nicknameMap = new Map<string, string>();
      profilesData?.forEach(p => {
        if (p.nickname) nicknameMap.set(p.user_id, p.nickname);
      });

      // Merge comments with nicknames
      const commentsWithNicknames: Comment[] = commentsData.map(comment => ({
        ...comment,
        nickname: nicknameMap.get(comment.user_id) || undefined,
      }));

      setComments(commentsWithNicknames);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleOpenComments = (postId: string) => {
    setShowComments(postId);
    loadComments(postId);
  };

  const handleAddComment = async () => {
    const trimmedComment = newComment.trim();
    if (!trimmedComment || !showComments || !currentUser?.id) return;

    // Validate length
    if (trimmedComment.length > MAX_COMMENT_LENGTH) {
      toast.error(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`);
      return;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: showComments,
          user_id: currentUser.id,
          content: trimmedComment,
        });

      if (error) throw error;
      
      setNewComment('');
      loadComments(showComments);
      loadPosts(); // Refresh comment count
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleEditPost = async () => {
    if (!editingPost || !editContent.trim()) return;
    
    const trimmedContent = editContent.trim();
    if (trimmedContent.length > MAX_POST_LENGTH) {
      toast.error(`Post must be ${MAX_POST_LENGTH} characters or less`);
      return;
    }

    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ content: trimmedContent })
        .eq('id', editingPost.id)
        .eq('user_id', currentUser?.id);

      if (error) throw error;
      
      toast.success('Post updated! ✨');
      setEditingPost(null);
      setEditContent('');
      loadPosts();
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const handleDeletePost = async () => {
    if (!deletingPostId) return;

    try {
      // Admin can delete any post, regular users only their own
      const query = supabase
        .from('community_posts')
        .delete()
        .eq('id', deletingPostId);
      
      // If not admin, also filter by user_id
      if (!isAdmin) {
        query.eq('user_id', currentUser?.id);
      }

      const { error } = await query;

      if (error) throw error;
      
      toast.success('Post deleted');
      setDeletingPostId(null);
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleDeleteComment = async () => {
    if (!deletingCommentId || !showComments) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', deletingCommentId);

      if (error) throw error;
      
      toast.success('Comment deleted');
      setDeletingCommentId(null);
      loadComments(showComments);
      loadPosts(); // Refresh comment count
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const openEditDialog = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content);
  };

  // Simple language detection - checks if text contains non-ASCII characters typical of other languages
  const detectNonUserLanguage = (text: string): boolean => {
    const userLang = user.language;
    // Check for French-specific characters if user is not French
    if (userLang !== 'fr' && /[àâäéèêëïîôùûüÿœæç]/i.test(text)) return true;
    // Check for Spanish-specific characters if user is not Spanish
    if (userLang !== 'es' && /[áéíóúüñ¿¡]/i.test(text)) return true;
    return false;
  };

  // Mock translation function - in production, use an AI translation API
  const getTranslatedContent = async (postId: string, content: string): Promise<string> => {
    // Check if already translated
    if (translatedPosts.has(postId)) {
      return translatedPosts.get(postId)!;
    }
    
    // For demo purposes, just add a note - in production use real translation
    // This would call your AI gateway or translation service
    const translated = `[${t('translatedFrom')} ${detectNonUserLanguage(content) ? 'autre langue' : 'English'}]\n\n${content}`;
    setTranslatedPosts(prev => new Map(prev).set(postId, translated));
    return translated;
  };

  const toggleTranslation = (postId: string) => {
    setShowOriginal(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const posted = new Date(date);
    const diff = Math.floor((now.getTime() - posted.getTime()) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const getUserDisplayName = (post: Post) => {
    if (post.nickname) return post.nickname;
    return 'Anonymous';
  };

  return (
    <AppLayout title={t('communityNav')}>
      <div className="px-4 py-6 space-y-4 animate-fade-in">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{posts.length} {t('members')}</span>
          </div>
          <Button 
            size="sm" 
            className="rounded-full bg-gradient-olive"
            onClick={() => setShowNewPost(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('post')}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          /* Feed */
          <div className="space-y-4">
            {posts.map(post => (
              <div
                key={post.id}
                className="bg-card rounded-2xl p-4 shadow-warm space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{getUserDisplayName(post)}</span>
                        {post.profileTier && post.profileCompleteness !== undefined && post.profileCompleteness > 0 && (
                          <ProfileBadge
                            percentage={post.profileCompleteness}
                            tier={post.profileTier}
                            tierLabel={post.profileTier.charAt(0).toUpperCase() + post.profileTier.slice(1)}
                            size="sm"
                            showPercentage={true}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{getTimeAgo(post.created_at)}</span>
                        <span>•</span>
                        {post.visibility === 'women_only' ? (
                          <span className="flex items-center gap-0.5">
                            <Lock className="w-3 h-3" /> {t('womenOnly')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5">
                            <Globe className="w-3 h-3" /> {t('everyone')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {(post.user_id === currentUser?.id || isAdmin) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {post.user_id === currentUser?.id && (
                          <DropdownMenuItem onClick={() => openEditDialog(post)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => setDeletingPostId(post.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {isAdmin && post.user_id !== currentUser?.id ? 'Delete (Admin)' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                      <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {showOriginal.has(post.id) ? post.content : (translatedPosts.get(post.id) || post.content)}
                  </p>
                  
                  {/* Translation toggle - show for all posts to allow translation */}
                  <button
                    onClick={() => {
                      if (!translatedPosts.has(post.id) && !showOriginal.has(post.id)) {
                        getTranslatedContent(post.id, post.content);
                      }
                      toggleTranslation(post.id);
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Languages className="w-3 h-3" />
                    {showOriginal.has(post.id) ? t('seeTranslation') : t('seeOriginal')}
                  </button>
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
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
                )}

                {/* Actions */}
                <div className="flex items-center gap-6 pt-2 border-t border-border">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Heart
                      className={cn(
                        'w-5 h-5 transition-colors',
                        likedPosts.has(post.id) && 'fill-maseya-rose text-maseya-rose'
                      )}
                    />
                    <span>{post.likes_count}</span>
                  </button>
                  <button 
                    onClick={() => handleOpenComments(post.id)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{post.comments_count}</span>
                  </button>
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Post Dialog */}
      <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share with the community</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder={t('communityPostPlaceholder')}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              maxLength={MAX_POST_LENGTH}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {newPostContent.length}/{MAX_POST_LENGTH}
            </p>
            <div className="flex gap-2">
              <Button
                variant={newPostVisibility === 'everyone' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewPostVisibility('everyone')}
                className="rounded-full"
              >
                <Globe className="w-4 h-4 mr-1" />
                {t('everyone')}
              </Button>
              <Button
                variant={newPostVisibility === 'women_only' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewPostVisibility('women_only')}
                className="rounded-full"
              >
                <Lock className="w-4 h-4 mr-1" />
                {t('womenOnly')}
              </Button>
            </div>
            <Button
              onClick={handleCreatePost}
              disabled={!newPostContent.trim() || isSubmitting}
              className="w-full rounded-full bg-gradient-olive"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('post')}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={!!showComments} onOpenChange={() => setShowComments(null)}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('comment')}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No comments yet</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-3 group">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-sm">
                    👤
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {comment.nickname || 'Anonymous'}
                    </p>
                    <p className="text-sm text-foreground">{comment.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getTimeAgo(comment.created_at)}
                    </p>
                  </div>
                  {(comment.user_id === currentUser?.id || isAdmin) && (
                    <button
                      onClick={() => setDeletingCommentId(comment.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-destructive/10 transition-all"
                      title="Delete comment"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
                className="min-h-[60px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {newComment.length}/{MAX_COMMENT_LENGTH}
              </p>
            </div>
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              size="icon"
              className="self-end rounded-full bg-gradient-olive"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={MAX_POST_LENGTH}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {editContent.length}/{MAX_POST_LENGTH}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingPost(null)}
                className="flex-1 rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditPost}
                disabled={!editContent.trim()}
                className="flex-1 rounded-full bg-gradient-olive"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPostId} onOpenChange={() => setDeletingPostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post and all its comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Comment Confirmation Dialog */}
      <AlertDialog open={!!deletingCommentId} onOpenChange={() => setDeletingCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteComment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default CommunityPage;
