import { useState } from 'react';
import { Search, Crown, Shield, Globe, Flame } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AdminUser } from '@/hooks/useAdminDashboard';

interface AdminUserManagementProps {
  users: AdminUser[];
}

const AdminUserManagement = ({ users }: AdminUserManagementProps) => {
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return (
      u.nickname?.toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'admin') return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Admin</Badge>;
    if (role === 'moderator') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Mod</Badge>;
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="pl-9"
          maxLength={200}
        />
      </div>

      {/* User List */}
      <div className="space-y-1.5">
        {filteredUsers.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-6">No users found</p>
        )}
        {filteredUsers.map(user => (
          <div
            key={user.id}
            className="border border-border rounded-xl p-3 hover:bg-secondary/20 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">
                    {user.nickname ? user.nickname.slice(0, 1).toUpperCase() : '👤'}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate">
                      {user.nickname || 'No nickname'}
                    </span>
                    {getRoleBadge(user.role)}
                    {user.is_premium && (
                      <Crown className="w-3.5 h-3.5 text-maseya-gold" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {user.country && (
                      <span className="flex items-center gap-0.5">
                        <Globe className="w-3 h-3" />
                        {user.country}
                      </span>
                    )}
                    <span>{formatDate(user.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs">
                    <Shield className="w-3 h-3 text-primary" />
                    <span className="font-medium">{user.points} pts</span>
                  </div>
                  {user.streak > 0 && (
                    <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Flame className="w-3 h-3 text-maseya-terracotta" />
                      <span>{user.streak} streak</span>
                    </div>
                  )}
                </div>
                <Badge
                  variant={user.onboarding_complete ? 'default' : 'outline'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {user.onboarding_complete ? 'Active' : 'Setup'}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminUserManagement;
