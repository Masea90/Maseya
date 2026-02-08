import { useState } from 'react';
import { Star, Trash2, Eye, Clock, MessageCircle, Search, CheckCircle, AlertTriangle, Image } from 'lucide-react';
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
  onApprove?: (postId: string) => Promise<boolean>;
}

const AdminPostModeration = ({ posts, onDelete, onToggleStaffPick, onApprove }: AdminPostModerationProps) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'flagged'>('all');

  const filteredPosts = posts.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = (
      p.content.toLowerCase().includes(q) ||
      p.nickname?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
    if (filterMode === 'flagged') {
      return matchesSearch && p.moderation_status === 'pending_review';
    }
    return matchesSearch;
  });

  const flaggedCount = posts.filter(p => p.moderation_status === 'pending_review').length;

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

  const handleApprove = async (postId: string) => {
    if (!onApprove) return;
    const ok = await onApprove(postId);
    if (ok) toast.success('Post approved ✅');
    else toast.error('Failed to approve');
  };

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filterMode === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
          }`}
        >
          All Posts
        </button>
        <button
          onClick={() => setFilterMode('flagged')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
            filterMode === 'flagged' ? 'bg-amber-500 text-white' : 'bg-secondary text-muted-foreground'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          Flagged {flaggedCount > 0 && `(${flaggedCount})`}
        </button>
      </div>

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
          <p className="text-center text-muted-foreground text-sm py-6">
            {filterMode === 'flagged' ? 'No flagged posts 🎉' : 'No posts found'}
          </p>
        )}
        {filteredPosts.map(post => (
          <div
            key={post.id}
            className={`border rounded-xl p-3 space-y-2 hover:bg-secondary/20 transition-colors ${
              post.moderation_status === 'pending_review'
                ? 'border-amber-500/50 bg-amber-500/5'
                : 'border-border'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm truncate">
                  {post.nickname || 'Anonymous'}
                </span>
                {post.moderation_status === 'pending_review' && (
                  <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0 bg-amber-500/15 text-amber-600 border-amber-500/25">
                    <AlertTriangle className="w-2.5 h-2.5" /> Flagged
                  </Badge>
                )}
                {post.is_staff_pick && (
                  <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0">
                    <Star className="w-2.5 h-2.5 fill-primary text-primary" /> Pick
                  </Badge>
                )}
                {post.image_url && (
                  <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                    <Image className="w-2.5 h-2.5" /> Photo
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

            {/* Moderation reason */}
            {post.moderation_status === 'pending_review' && post.moderation_reason && (
              <p className="text-xs text-amber-600 bg-amber-500/10 px-2.5 py-1.5 rounded-lg">
                🤖 AI reason: {post.moderation_reason}
              </p>
            )}

            {/* Content preview */}
            <p className="text-sm text-foreground line-clamp-3">{post.content}</p>

            {/* Image preview */}
            {post.image_url && (
              <div className="rounded-lg overflow-hidden border border-border max-w-[200px]">
                <img src={post.image_url} alt="Post" className="w-full h-24 object-cover" />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> {post.comments_count}
                </span>
                <span>❤️ {post.likes_count}</span>
              </div>
              <div className="flex items-center gap-1">
                {post.moderation_status === 'pending_review' && onApprove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700"
                    onClick={() => handleApprove(post.id)}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve
                  </Button>
                )}
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
