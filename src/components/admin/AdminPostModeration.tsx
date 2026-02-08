import { useState } from 'react';
import { Star, Trash2, Eye, Clock, MessageCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AdminPost } from '@/hooks/useAdminDashboard';
import { toast } from 'sonner';

interface AdminPostModerationProps {
  posts: AdminPost[];
  onDelete: (postId: string) => Promise<boolean>;
  onToggleStaffPick: (postId: string, current: boolean) => Promise<boolean>;
}

const AdminPostModeration = ({ posts, onDelete, onToggleStaffPick }: AdminPostModerationProps) => {
  const [search, setSearch] = useState('');

  const filteredPosts = posts.filter(p => {
    const q = search.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      p.nickname?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getVisibilityIcon = (vis: string) => {
    if (vis === 'everyone') return <Eye className="w-3 h-3" />;
    return <Eye className="w-3 h-3 text-muted-foreground" />;
  };

  const handleDelete = async (postId: string) => {
    const ok = await onDelete(postId);
    if (ok) toast.success('Post deleted');
    else toast.error('Failed to delete post');
  };

  const handleToggleStaffPick = async (postId: string, current: boolean) => {
    const ok = await onToggleStaffPick(postId, current);
    if (ok) toast.success(current ? 'Staff pick removed' : 'Marked as staff pick ⭐');
    else toast.error('Failed to update');
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts..."
          className="pl-9"
          maxLength={200}
        />
      </div>

      {/* Post List */}
      <div className="space-y-2">
        {filteredPosts.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-6">No posts found</p>
        )}
        {filteredPosts.map(post => (
          <div
            key={post.id}
            className="border border-border rounded-xl p-3 space-y-2 hover:bg-secondary/20 transition-colors"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm truncate">
                  {post.nickname || 'Anonymous'}
                </span>
                {post.is_staff_pick && (
                  <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0">
                    <Star className="w-2.5 h-2.5 fill-primary text-primary" /> Pick
                  </Badge>
                )}
                {post.category && post.category !== 'general' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {post.category.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                {getVisibilityIcon(post.visibility)}
                <Clock className="w-3 h-3 ml-1" />
                <span>{formatDate(post.created_at)}</span>
              </div>
            </div>

            {/* Content preview */}
            <p className="text-sm text-foreground line-clamp-2">{post.content}</p>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> {post.comments_count}
                </span>
                <span>❤️ {post.likes_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => handleToggleStaffPick(post.id, post.is_staff_pick)}
                >
                  <Star className={`w-3.5 h-3.5 ${post.is_staff_pick ? 'fill-primary text-primary' : ''}`} />
                  {post.is_staff_pick ? 'Unpin' : 'Pin'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the post and all associated comments. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(post.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPostModeration;
