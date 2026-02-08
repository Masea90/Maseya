import { Users, FileText, MessageCircle, MousePointerClick, TrendingUp, Link2, Heart, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AdminStats } from '@/hooks/useAdminDashboard';

interface AdminOverviewCardsProps {
  stats: AdminStats;
}

const statCards = [
  { key: 'totalUsers', label: 'Users', icon: Users, color: 'text-blue-500' },
  { key: 'totalPosts', label: 'Posts', icon: FileText, color: 'text-green-500' },
  { key: 'totalComments', label: 'Comments', icon: MessageCircle, color: 'text-purple-500' },
  { key: 'totalReactions', label: 'Reactions', icon: Heart, color: 'text-pink-500' },
  { key: 'totalAffiliateClicks', label: 'Affiliate Clicks', icon: MousePointerClick, color: 'text-orange-500' },
  { key: 'totalAffiliateLinks', label: 'Affiliate Links', icon: Link2, color: 'text-cyan-500' },
] as const;

const AdminOverviewCards = ({ stats }: AdminOverviewCardsProps) => {
  return (
    <div className="space-y-4">
      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">New Users (7d)</span>
            </div>
            <p className="text-2xl font-bold">{stats.recentUsers}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3 px-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">New Posts (7d)</span>
            </div>
            <p className="text-2xl font-bold">{stats.recentPosts}</p>
          </CardContent>
        </Card>
      </div>

      {/* All Stats */}
      <div className="grid grid-cols-3 gap-2">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="pt-3 pb-2 px-2 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className="text-lg font-bold">{stats[key]}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminOverviewCards;
