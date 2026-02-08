import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, LayoutDashboard, FileText, Users, Link2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import AdminOverviewCards from '@/components/admin/AdminOverviewCards';
import AdminPostModeration from '@/components/admin/AdminPostModeration';
import AdminUserManagement from '@/components/admin/AdminUserManagement';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { stats, posts, users, isLoading, deletePost, toggleStaffPick, refetch } = useAdminDashboard();

  // Access guard
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-2xl">🔒</p>
          <p className="text-muted-foreground text-sm">Admin access required</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg font-semibold">Admin Dashboard</h1>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <Tabs defaultValue="overview">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview" className="text-xs gap-1 px-1">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="text-xs gap-1 px-1">
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs gap-1 px-1">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="affiliates" className="text-xs gap-1 px-1">
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Affiliate</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              </div>
            ) : (
              <AdminOverviewCards stats={stats} />
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : (
              <AdminPostModeration
                posts={posts}
                onDelete={deletePost}
                onToggleStaffPick={toggleStaffPick}
              />
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : (
              <AdminUserManagement users={users} />
            )}
          </TabsContent>

          <TabsContent value="affiliates" className="mt-4">
            <div className="space-y-4">
              <div className="border border-border rounded-xl p-6 text-center space-y-3">
                <BarChart3 className="w-10 h-10 text-primary mx-auto" />
                <div>
                  <p className="font-medium">Affiliate Link Management</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage retailer links, view click analytics, and add new affiliate partners.
                  </p>
                </div>
                <Button onClick={() => navigate('/admin/affiliates')} className="gap-1.5">
                  <Link2 className="w-4 h-4" />
                  Open Affiliate Manager
                </Button>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{stats.totalAffiliateLinks}</p>
                  <p className="text-xs text-muted-foreground">Active Links</p>
                </div>
                <div className="border border-border rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{stats.totalAffiliateClicks}</p>
                  <p className="text-xs text-muted-foreground">Total Clicks</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
