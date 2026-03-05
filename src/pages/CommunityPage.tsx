import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useRewards } from '@/hooks/useRewards';
import { MessageCircle, MoreHorizontal, Plus, Users, Lock, Globe, Send, Loader2, Pencil, Trash2, Languages, Star, ImagePlus, X, TrendingUp, Clock, UserCheck, Bookmark, BookmarkCheck, UserPlus, Hash, Package } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/lib/authHeaders';
import { toast } from 'sonner';
import { PostReactions, ReactionType } from '@/components/community/PostReactions';
import { GuidedPostTemplates, PostCategory } from '@/components/community/GuidedPostTemplates';
import { HashtagText, extractHashtags } from '@/components/community/HashtagText';
import { productCatalog, Product } from '@/lib/recommendations';

interface Post {
  id: string;
  user_id: string;
  content: string;
  visibility: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  category?: string;
  is_staff_pick?: boolean;
  image_url?: string | null;
  moderation_status?: string;
  nickname?: string;
  avatarUrl?: string | null;
  reactionCounts?: Record<ReactionType, number>;
  product_id?: number | null;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  nickname?: string;
  avatarUrl?: string | null;
}


const CommunityPage = () => {
  const { t, user, updateUser } = useUser();
  const { currentUser } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { awardBadge, recordPoints } = useRewards();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New post creation
  const [showNewPost, setShowNewPost] = useState(false);
  const [postStep, setPostStep] = useState<'template' | 'write'>('template');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('general');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostVisibility, setNewPostVisibility] = useState<'everyone' | 'women_only'>('everyone');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image upload
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Comments
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Edit/Delete
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  
  // Translation
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set());
  const [translatedPosts, setTranslatedPosts] = useState<Map<string, string>>(new Map());
  const [translatingPosts, setTranslatingPosts] = useState<Set<string>>(new Set());
  
  // Reactions
  const [userReactions, setUserReactions] = useState<Map<string, Set<ReactionType>>>(new Map());
  
  // Feed tabs & follow/save state
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'newest' | 'trending' | 'following' | 'staff_picks' | 'saved'>('newest');

  // Product attachment
  const [attachedProductId, setAttachedProductId] = useState<number | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    loadPosts();
    loadUserReactions();
    loadFollowing();
    loadSavedPosts();
    loadTrendingTags();
  }, [currentUser?.id]);

  const loadFollowing = async () => {
    if (!currentUser?.id) return;
    try {
      const { data } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', currentUser.id);
      setFollowedUserIds(new Set(data?.map(d => d.following_id) || []));
    } catch (e) {
      console.error('Error loading following:', e);
    }
  };

  const loadSavedPosts = async () => {
    if (!currentUser?.id) return;
    try {
      const { data } = await supabase
        .from('user_saved_posts')
        .select('post_id')
        .eq('user_id', currentUser.id);
      setSavedPostIds(new Set(data?.map(d => d.post_id) || []));
    } catch (e) {
      console.error('Error loading saved posts:', e);
    }
  };

  const loadTrendingTags = async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from('community_posts')
        .select('content')
        .eq('visibility', 'everyone')
        .eq('moderation_status', 'approved')
        .gte('created_at', sevenDaysAgo)
        .limit(100);

      if (data && data.length > 0) {
        const tagCounts = new Map<string, number>();
        data.forEach(p => {
          extractHashtags(p.content).forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        });
        const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
        setTrendingTags(sorted.map(([tag]) => tag));
      }
      if (trendingTags.length === 0) {
        setTrendingTags(['skincare', 'curly', 'natural', 'glowup', 'dryskin']);
      }
    } catch (e) {
      console.error('Error loading trending tags:', e);
      setTrendingTags(['skincare', 'curly', 'natural', 'glowup', 'dryskin']);
    }
  };

  const toggleSavePost = async (postId: string) => {
    if (!currentUser?.id) return;
    const isSaved = savedPostIds.has(postId);
    // Optimistic
    setSavedPostIds(prev => {
      const next = new Set(prev);
      isSaved ? next.delete(postId) : next.add(postId);
      return next;
    });
    try {
      if (isSaved) {
        await supabase.from('user_saved_posts').delete().eq('user_id', currentUser.id).eq('post_id', postId);
      } else {
        await supabase.from('user_saved_posts').insert({ user_id: currentUser.id, post_id: postId });
      }
    } catch (e) {
      console.error('Error toggling save:', e);
      setSavedPostIds(prev => {
        const next = new Set(prev);
        isSaved ? next.add(postId) : next.delete(postId);
        return next;
      });
    }
  };

  const toggleFollowUser = async (userId: string) => {
    if (!currentUser?.id || userId === currentUser.id) return;
    const isFollowed = followedUserIds.has(userId);
    setFollowedUserIds(prev => {
      const next = new Set(prev);
      isFollowed ? next.delete(userId) : next.add(userId);
      return next;
    });
    try {
      if (isFollowed) {
        await supabase.from('user_follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId);
      } else {
        await supabase.from('user_follows').insert({ follower_id: currentUser.id, following_id: userId });
      }
    } catch (e) {
      console.error('Error toggling follow:', e);
      setFollowedUserIds(prev => {
        const next = new Set(prev);
        isFollowed ? next.add(userId) : next.delete(userId);
        return next;
      });
    }
  };

  const loadPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .in('moderation_status', ['approved', 'pending_review'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      // Filter: show pending_review only to the post author and admins
      const visiblePosts = postsData.filter(p => {
        if ((p as any).moderation_status === 'approved') return true;
        if ((p as any).moderation_status === 'pending_review' && (p.user_id === currentUser?.id || isAdmin)) return true;
        return false;
      });

      const userIds = [...new Set(visiblePosts.map(p => p.user_id))];
      // Use SECURITY DEFINER function to get public profiles (avoids RLS bypass)
      const { data: profilesData } = await supabase.rpc('get_public_profiles', {
        p_user_ids: userIds,
      });

      const profileMap = new Map<string, any>();
      (profilesData as any[])?.forEach((p: any) => {
        profileMap.set(p.user_id, { nickname: p.nickname, avatar_url: p.avatar_url });
      });

      // Load reaction counts for all posts
      const reactionCountsMap = new Map<string, Record<ReactionType, number>>();
      const { data: reactionsData } = await supabase
        .from('post_reactions')
        .select('post_id, reaction_type')
        .in('post_id', visiblePosts.map(p => p.id));
      
      if (reactionsData) {
        for (const r of reactionsData) {
          if (!reactionCountsMap.has(r.post_id)) {
            reactionCountsMap.set(r.post_id, { helped_me: 0, i_relate: 0, great_tip: 0 });
          }
          const counts = reactionCountsMap.get(r.post_id)!;
          counts[r.reaction_type as ReactionType]++;
        }
      }

      const postsWithProfiles: Post[] = visiblePosts.map(post => {
        const profile = profileMap.get(post.user_id);
        return {
          ...post,
          is_staff_pick: (post as Record<string, unknown>).is_staff_pick as boolean || false,
          image_url: (post as any).image_url || null,
          moderation_status: (post as any).moderation_status || 'approved',
          nickname: profile?.nickname,
          avatarUrl: profile?.avatar_url || null,
          product_id: (post as any).product_id || null,
          reactionCounts: reactionCountsMap.get(post.id) || { helped_me: 0, i_relate: 0, great_tip: 0 },
        };
      });

      setPosts(postsWithProfiles);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserReactions = async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('post_reactions')
        .select('post_id, reaction_type')
        .eq('user_id', currentUser.id);

      if (error) throw error;
      const map = new Map<string, Set<ReactionType>>();
      data?.forEach(r => {
        if (!map.has(r.post_id)) map.set(r.post_id, new Set());
        map.get(r.post_id)!.add(r.reaction_type as ReactionType);
      });
      setUserReactions(map);
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  };

  // Feed sorting
  const sortedPosts = useMemo(() => {
    if (activeTab === 'staff_picks') {
      return posts.filter(p => p.is_staff_pick);
    }

    if (activeTab === 'following') {
      return posts.filter(p => followedUserIds.has(p.user_id));
    }

    if (activeTab === 'saved') {
      return posts.filter(p => savedPostIds.has(p.id));
    }

    if (activeTab === 'trending') {
      return [...posts].sort((a, b) => {
        const scoreA = (a.likes_count || 0) + (a.comments_count || 0) * 2;
        const scoreB = (b.likes_count || 0) + (b.comments_count || 0) * 2;
        if (a.is_staff_pick && !b.is_staff_pick) return -1;
        if (!a.is_staff_pick && b.is_staff_pick) return 1;
        return scoreB - scoreA;
      });
    }

    // 'newest'
    return [...posts].sort((a, b) => {
      if (a.is_staff_pick && !b.is_staff_pick) return -1;
      if (!a.is_staff_pick && b.is_staff_pick) return 1;
      return 0;
    });
  }, [posts, activeTab, followedUserIds, savedPostIds]);

  const MAX_POST_LENGTH = 5000;
  const MAX_COMMENT_LENGTH = 1000;

  const getPlaceholder = (): string => {
    switch (selectedCategory) {
      case 'what_worked': return t('writingPromptWorked');
      case 'my_routine': return t('writingPromptRoutine');
      case 'product_helped': return t('writingPromptProduct');
      default: return t('communityPostPlaceholder');
    }
  };

  const getCategoryLabel = (category?: string): string | null => {
    switch (category) {
      case 'what_worked': return t('templateWhatWorked');
      case 'my_routine': return t('templateMyRoutine');
      case 'product_helped': return t('templateProductHelped');
      default: return null;
    }
  };

  const handleSelectTemplate = (category: PostCategory) => {
    setSelectedCategory(category);
    setPostStep('write');
  };

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`${t('imageTooLarge')}: ${t('imageSizeLimit')} ${sizeMB} MB. ${t('compressSuggestion')}`, { duration: 5000 });
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const MODERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-post`;

  const handleCreatePost = async () => {
    const trimmedContent = newPostContent.trim();
    if (!trimmedContent || !currentUser?.id) return;
    if (trimmedContent.length > MAX_POST_LENGTH) {
      toast.error(`Post must be ${MAX_POST_LENGTH} characters or less`);
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. AI moderation check
      let moderationStatus = 'approved';
      let moderationReason: string | null = null;
      try {
        const modHeaders = await getAuthHeaders();
        const modResp = await fetch(MODERATE_URL, {
          method: 'POST',
          headers: modHeaders,
          body: JSON.stringify({ content: trimmedContent, category: selectedCategory }),
        });
        if (modResp.ok) {
          const modData = await modResp.json();
          if (!modData.approved) {
            moderationStatus = 'pending_review';
            moderationReason = modData.reason || 'Flagged by AI moderation';
          }
        }
      } catch (modError) {
        console.error('Moderation check failed, proceeding as approved:', modError);
      }

      // 2. Upload image if selected
      let imageUrl: string | null = null;
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, selectedImage, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      // 3. Extract hashtags and create post
      const hashtags = extractHashtags(trimmedContent);
      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: currentUser.id,
          content: trimmedContent,
          visibility: newPostVisibility,
          tags: hashtags,
          category: selectedCategory,
          image_url: imageUrl,
          moderation_status: moderationStatus,
          moderation_reason: moderationReason,
          product_id: attachedProductId,
        } as any);
      if (error) throw error;

      // 4. Award points & badges for posting
      if (moderationStatus === 'approved') {
        recordPoints(3, 'community_post');
        recordPoints(3, 'community_post');
        awardBadge('first_post');
        if (imageUrl) awardBadge('photo_sharer');
      }

      if (moderationStatus === 'pending_review') {
        toast.info('Your post is under review and will be visible once approved 🔍');
      } else {
        toast.success('Post shared! 🌿');
      }
      setNewPostContent('');
      clearImage();
      setAttachedProductId(null);
      setShowNewPost(false);
      setPostStep('template');
      setSelectedCategory('general');
      loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleReaction = async (postId: string, type: ReactionType) => {
    if (!currentUser?.id) return;
    const postReactions = userReactions.get(postId) || new Set();
    const isActive = postReactions.has(type);

    // Optimistic update
    setUserReactions(prev => {
      const newMap = new Map(prev);
      const newSet = new Set(newMap.get(postId) || []);
      if (isActive) newSet.delete(type);
      else newSet.add(type);
      newMap.set(postId, newSet);
      return newMap;
    });

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const counts = { ...p.reactionCounts! };
      counts[type] = (counts[type] || 0) + (isActive ? -1 : 1);
      return { ...p, reactionCounts: counts };
    }));

    try {
      if (isActive) {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id)
          .eq('reaction_type', type);
      } else {
        await supabase
          .from('post_reactions')
          .insert({ post_id: postId, user_id: currentUser.id, reaction_type: type });
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      loadPosts();
      loadUserReactions();
    }
  };

  // Comments
  const loadComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!commentsData?.length) { setComments([]); setLoadingComments(false); return; }

      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      // Use SECURITY DEFINER function for comment author profiles
      const { data: profilesData } = await supabase.rpc('get_public_profiles', {
        p_user_ids: userIds,
      });
      const profileMap = new Map<string, { nickname?: string; avatar_url?: string }>();
      (profilesData as any[])?.forEach((p: any) => { profileMap.set(p.user_id, { nickname: p.nickname || undefined, avatar_url: p.avatar_url || undefined }); });
      setComments(commentsData.map(c => ({ ...c, nickname: profileMap.get(c.user_id)?.nickname || undefined, avatarUrl: profileMap.get(c.user_id)?.avatar_url || null })));
    } catch (error) { console.error('Error loading comments:', error); }
    finally { setLoadingComments(false); }
  };

  const handleOpenComments = (postId: string) => { setShowComments(postId); loadComments(postId); };

  const handleAddComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || !showComments || !currentUser?.id) return;
    if (trimmed.length > MAX_COMMENT_LENGTH) { toast.error(`Comment must be ${MAX_COMMENT_LENGTH} characters or less`); return; }
    try {
      const { error } = await supabase.from('post_comments').insert({ post_id: showComments, user_id: currentUser.id, content: trimmed });
      if (error) throw error;
      setNewComment('');
      loadComments(showComments);
      loadPosts();
    } catch (error) { console.error('Error adding comment:', error); toast.error('Failed to add comment'); }
  };

  // Edit & Delete
  const handleEditPost = async () => {
    if (!editingPost || !editContent.trim()) return;
    const trimmed = editContent.trim();
    if (trimmed.length > MAX_POST_LENGTH) { toast.error(`Post must be ${MAX_POST_LENGTH} characters or less`); return; }
    try {
      const { error } = await supabase.from('community_posts').update({ content: trimmed }).eq('id', editingPost.id).eq('user_id', currentUser?.id);
      if (error) throw error;
      toast.success('Post updated! ✨');
      setEditingPost(null);
      setEditContent('');
      loadPosts();
    } catch (error) { console.error('Error updating post:', error); toast.error('Failed to update post'); }
  };

  const handleDeletePost = async () => {
    if (!deletingPostId) return;
    try {
      const query = supabase.from('community_posts').delete().eq('id', deletingPostId);
      if (!isAdmin) query.eq('user_id', currentUser?.id);
      const { error } = await query;
      if (error) throw error;
      toast.success('Post deleted');
      setDeletingPostId(null);
      loadPosts();
    } catch (error) { console.error('Error deleting post:', error); toast.error('Failed to delete post'); }
  };

  const handleDeleteComment = async () => {
    if (!deletingCommentId || !showComments) return;
    try {
      const { error } = await supabase.from('post_comments').delete().eq('id', deletingCommentId);
      if (error) throw error;
      toast.success('Comment deleted');
      setDeletingCommentId(null);
      loadComments(showComments);
      loadPosts();
    } catch (error) { console.error('Error deleting comment:', error); toast.error('Failed to delete comment'); }
  };

  // Translation
  const TRANSLATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate`;

  const getTranslatedContent = async (postId: string, content: string): Promise<string> => {
    if (translatedPosts.has(postId)) return translatedPosts.get(postId)!;
    setTranslatingPosts(prev => new Set(prev).add(postId));
    try {
      const transHeaders = await getAuthHeaders();
      const resp = await fetch(TRANSLATE_URL, {
        method: 'POST',
        headers: transHeaders,
        body: JSON.stringify({ text: content, targetLanguage: user.language }),
      });
      if (!resp.ok) throw new Error('Translation failed');
      const data = await resp.json();
      const translated = data.translatedText || content;
      setTranslatedPosts(prev => new Map(prev).set(postId, translated));
      return translated;
    } catch (error) { console.error('Translation error:', error); toast.error(t('chatbotError')); return content; }
    finally { setTranslatingPosts(prev => { const s = new Set(prev); s.delete(postId); return s; }); }
  };

  const toggleTranslation = async (postId: string, content: string) => {
    if (showOriginal.has(postId)) {
      setShowOriginal(prev => { const s = new Set(prev); s.delete(postId); return s; });
    } else {
      if (!translatedPosts.has(postId)) await getTranslatedContent(postId, content);
      setShowOriginal(prev => new Set(prev).add(postId));
    }
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

  return (
    <AppLayout title={t('communityNav')}>
      <div className="px-4 py-6 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{posts.length} {t('members')}</span>
          </div>
          <Button size="sm" className="rounded-full bg-gradient-olive" onClick={() => { setShowNewPost(true); setPostStep('template'); }}>
            <Plus className="w-4 h-4 mr-1" />
            {t('post')}
          </Button>
        </div>

        {/* Feed Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setActiveTab('newest')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              activeTab === 'newest'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            {'Newest'}
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              activeTab === 'trending'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {'Trending'}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              activeTab === 'following'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {'Following'}
          </button>
          <button
            onClick={() => setActiveTab('staff_picks')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              activeTab === 'staff_picks'
                ? 'bg-maseya-gold text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <Star className="w-3.5 h-3.5" />
            {t('staffPicks')}
          </button>
        </div>

        {/* Posts Feed */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="text-center py-10 space-y-5 bg-card rounded-2xl p-6 shadow-warm">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full flex items-center justify-center mx-auto">
              <span className="text-4xl">🌿</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-lg font-semibold text-foreground">{t('communityWelcomeTitle')}</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">{t('communityWelcomeDesc')}</p>
            </div>
            <div className="space-y-2 text-left max-w-xs mx-auto">
              {[t('communityWelcomeTip1'), t('communityWelcomeTip2'), t('communityWelcomeTip3')].map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">✦</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={() => { setShowNewPost(true); setPostStep('template'); }}
              className="rounded-full bg-gradient-olive px-6"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('communityWelcomeCta')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPosts.map(post => {
              const categoryLabel = getCategoryLabel(post.category);
              return (
                <div key={post.id} className={cn(
                  'bg-card rounded-2xl p-4 shadow-warm space-y-3',
                  post.is_staff_pick && 'ring-1 ring-maseya-gold/30'
                )}>
                  {/* Staff Pick Badge */}
                  {post.is_staff_pick && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-maseya-gold/10 border border-maseya-gold/25 text-xs font-medium text-maseya-gold">
                      <Star className="w-3 h-3 fill-maseya-gold" />
                      {t('staffPick')}
                    </div>
                  )}
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => navigate(`/user/${post.user_id}`)} className="focus:outline-none">
                        <Avatar className="w-10 h-10 hover:ring-2 hover:ring-primary/40 transition-all">
                          <AvatarImage src={post.avatarUrl || undefined} alt={post.nickname || 'User'} />
                          <AvatarFallback className="bg-secondary text-sm font-medium">
                            {post.nickname ? post.nickname.slice(0, 2).toUpperCase() : '👤'}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => navigate(`/user/${post.user_id}`)}
                            className="font-medium text-foreground text-sm hover:text-primary transition-colors"
                          >
                            {post.nickname || 'Anonymous'}
                          </button>
                          {post.is_staff_pick && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-maseya-gold/15 text-[10px] font-semibold text-maseya-gold">
                              ✓ MASEYA
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{getTimeAgo(post.created_at)}</span>
                          <span>•</span>
                          {post.visibility === 'women_only' ? (
                            <span className="flex items-center gap-0.5"><Lock className="w-3 h-3" /> {t('womenOnly')}</span>
                          ) : (
                            <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" /> {t('everyone')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {(post.user_id === currentUser?.id || isAdmin) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                            <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {post.user_id === currentUser?.id && (
                            <DropdownMenuItem onClick={() => { setEditingPost(post); setEditContent(post.content); }}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setDeletingPostId(post.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> {isAdmin && post.user_id !== currentUser?.id ? 'Delete (Admin)' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Category Tag */}
                  {categoryLabel && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary">
                      {categoryLabel}
                    </div>
                  )}

                  {/* Pending review badge */}
                  {post.moderation_status === 'pending_review' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-medium text-amber-600">
                      🔍 {t('postUnderReview')}
                    </div>
                  )}

                  {/* Post Image */}
                  {post.image_url && (
                    <div className="rounded-xl overflow-hidden border border-border">
                      <img src={post.image_url} alt="Post" className="w-full max-h-72 object-cover" loading="lazy" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="space-y-2">
                    <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {showOriginal.has(post.id) ? (translatedPosts.get(post.id) || post.content) : post.content}
                    </p>
                    <button
                      onClick={() => toggleTranslation(post.id, post.content)}
                      disabled={translatingPosts.has(post.id)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      {translatingPosts.has(post.id) ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> {t('chatbotTyping')}</>
                      ) : (
                        <><Languages className="w-3 h-3" /> {showOriginal.has(post.id) ? t('seeOriginal') : t('seeTranslation')}</>
                      )}
                    </button>
                  </div>

                  {/* Reactions + Comment button */}
                  <div className="pt-2 border-t border-border space-y-2">
                    <PostReactions
                      postId={post.id}
                      reactions={post.reactionCounts || { helped_me: 0, i_relate: 0, great_tip: 0 }}
                      userReactions={userReactions.get(post.id) || new Set()}
                      onToggleReaction={toggleReaction}
                    />
                    <button
                      onClick={() => handleOpenComments(post.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.comments_count} {t('comment')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Post Dialog — Guided */}
      <Dialog open={showNewPost} onOpenChange={(open) => { setShowNewPost(open); if (!open) { setPostStep('template'); setSelectedCategory('general'); setNewPostContent(''); clearImage(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('shareWithCommunity')}</DialogTitle>
          </DialogHeader>
          {postStep === 'template' ? (
            <GuidedPostTemplates onSelect={handleSelectTemplate} />
          ) : (
            <div className="space-y-4">
              {selectedCategory !== 'general' && (
                <button
                  onClick={() => setPostStep('template')}
                  className="text-xs text-primary hover:underline"
                >
                  ← {t('chooseTemplate')}
                </button>
              )}
              <Textarea
                placeholder={getPlaceholder()}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                maxLength={MAX_POST_LENGTH}
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{newPostContent.length}/{MAX_POST_LENGTH}</p>
              
              {/* Image upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm text-muted-foreground"
                >
                  <ImagePlus className="w-4 h-4" />
                  {t('addPhoto') || 'Add a photo'}
                </button>
              )}

              <div className="flex gap-2">
                <Button variant={newPostVisibility === 'everyone' ? 'default' : 'outline'} size="sm" onClick={() => setNewPostVisibility('everyone')} className="rounded-full">
                  <Globe className="w-4 h-4 mr-1" /> {t('everyone')}
                </Button>
                <Button variant={newPostVisibility === 'women_only' ? 'default' : 'outline'} size="sm" onClick={() => setNewPostVisibility('women_only')} className="rounded-full">
                  <Lock className="w-4 h-4 mr-1" /> {t('womenOnly')}
                </Button>
              </div>
              <Button onClick={handleCreatePost} disabled={!newPostContent.trim() || isSubmitting} className="w-full rounded-full bg-gradient-olive">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> {t('post')}</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={!!showComments} onOpenChange={() => setShowComments(null)}>
        <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>{t('comment')}</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {loadingComments ? (
              <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No comments yet</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-3 group">
                  <button onClick={() => navigate(`/user/${comment.user_id}`)} className="focus:outline-none">
                    <Avatar className="w-8 h-8 hover:ring-2 hover:ring-primary/40 transition-all">
                      <AvatarImage src={comment.avatarUrl || undefined} alt={comment.nickname || 'User'} />
                      <AvatarFallback className="bg-secondary text-xs font-medium">
                        {comment.nickname ? comment.nickname.slice(0, 2).toUpperCase() : '👤'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1">
                    <button
                      onClick={() => navigate(`/user/${comment.user_id}`)}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {comment.nickname || 'Anonymous'}
                    </button>
                    <p className="text-sm text-foreground">{comment.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(comment.created_at)}</p>
                  </div>
                  {(comment.user_id === currentUser?.id || isAdmin) && (
                    <button onClick={() => setDeletingCommentId(comment.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-destructive/10 transition-all" title="Delete comment">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <div className="flex-1">
              <Textarea placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} maxLength={MAX_COMMENT_LENGTH} className="min-h-[60px] resize-none" />
              <p className="text-xs text-muted-foreground text-right mt-1">{newComment.length}/{MAX_COMMENT_LENGTH}</p>
            </div>
            <Button onClick={handleAddComment} disabled={!newComment.trim()} size="icon" className="self-end rounded-full bg-gradient-olive">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} maxLength={MAX_POST_LENGTH} className="min-h-[120px] resize-none" />
            <p className="text-xs text-muted-foreground text-right">{editContent.length}/{MAX_POST_LENGTH}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingPost(null)} className="flex-1 rounded-full">Cancel</Button>
              <Button onClick={handleEditPost} disabled={!editContent.trim()} className="flex-1 rounded-full bg-gradient-olive">Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmations */}
      <AlertDialog open={!!deletingPostId} onOpenChange={() => setDeletingPostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete your post and all its comments.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingCommentId} onOpenChange={() => setDeletingCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default CommunityPage;
