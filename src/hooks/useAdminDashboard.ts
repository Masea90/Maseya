import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  totalReactions: number;
  totalAffiliateClicks: number;
  totalAffiliateLinks: number;
  recentPosts: number;
  recentUsers: number;
}

export interface AdminPost {
  id: string;
  user_id: string;
  content: string;
  visibility: string;
  category: string | null;
  is_staff_pick: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  tags: string[];
  nickname?: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  nickname: string | null;
  language: string | null;
  country: string | null;
  is_premium: boolean;
  points: number;
  streak: number;
  onboarding_complete: boolean;
  created_at: string;
  role?: string;
}

export const useAdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    totalReactions: 0,
    totalAffiliateClicks: 0,
    totalAffiliateLinks: 0,
    recentPosts: 0,
    recentUsers: 0,
  });
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      // Fetch posts with author nicknames
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const postsList = postsData || [];

      // Get author nicknames
      if (postsList.length > 0) {
        const userIds = [...new Set(postsList.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nickname')
          .in('user_id', userIds);

        const nickMap = new Map(profiles?.map(p => [p.user_id, p.nickname]) || []);
        postsList.forEach(p => {
          (p as AdminPost).nickname = nickMap.get(p.user_id) || undefined;
        });
      }

      setPosts(postsList.map(p => ({
        ...p,
        is_staff_pick: p.is_staff_pick || false,
        category: p.category || null,
        nickname: (p as AdminPost).nickname,
      })));

      // Fetch users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, user_id, nickname, language, country, is_premium, points, streak, onboarding_complete, created_at')
        .order('created_at', { ascending: false });

      const usersList = (profilesData || []).map(p => ({
        ...p,
        is_premium: p.is_premium || false,
        points: p.points || 0,
        streak: p.streak || 0,
        onboarding_complete: p.onboarding_complete || false,
      }));

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
      usersList.forEach(u => {
        (u as AdminUser).role = roleMap.get(u.user_id) || 'user';
      });

      setUsers(usersList as AdminUser[]);

      // Counts
      const { count: commentsCount } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true });

      const { count: reactionsCount } = await supabase
        .from('post_reactions')
        .select('*', { count: 'exact', head: true });

      const { count: clicksCount } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true });

      const { count: linksCount } = await supabase
        .from('product_affiliate_links')
        .select('*', { count: 'exact', head: true });

      // Recent (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentPosts = postsList.filter(p => p.created_at && p.created_at >= sevenDaysAgo).length;
      const recentUsers = usersList.filter(u => u.created_at && u.created_at >= sevenDaysAgo).length;

      setStats({
        totalUsers: usersList.length,
        totalPosts: postsList.length,
        totalComments: commentsCount || 0,
        totalReactions: reactionsCount || 0,
        totalAffiliateClicks: clicksCount || 0,
        totalAffiliateLinks: linksCount || 0,
        recentPosts,
        recentUsers,
      });
    } catch (e) {
      console.error('Error fetching admin data:', e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);
      if (error) throw error;
      await fetchAll();
      return true;
    } catch (e) {
      console.error('Error deleting post:', e);
      return false;
    }
  };

  const toggleStaffPick = async (postId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ is_staff_pick: !current })
        .eq('id', postId);
      if (error) throw error;
      await fetchAll();
      return true;
    } catch (e) {
      console.error('Error toggling staff pick:', e);
      return false;
    }
  };

  return { stats, posts, users, isLoading, deletePost, toggleStaffPick, refetch: fetchAll };
};
