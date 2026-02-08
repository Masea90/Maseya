import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, RefreshCw, Link2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAdminAffiliateLinks } from '@/hooks/useAdminAffiliateLinks';
import { AffiliateLink } from '@/hooks/useAffiliateLinks';
import { productCatalog } from '@/lib/recommendations';
import AffiliateLinkTable from '@/components/admin/AffiliateLinkTable';
import AffiliateLinkEditor from '@/components/admin/AffiliateLinkEditor';
import AffiliateClickAnalytics from '@/components/admin/AffiliateClickAnalytics';

const AdminAffiliatePage = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { links, analytics, isLoading, addLink, updateLink, deleteLink, refetch } = useAdminAffiliateLinks();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null);
  const [filterProductId, setFilterProductId] = useState<number | null>(null);

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

  const handleEdit = (link: AffiliateLink) => {
    setEditingLink(link);
    setEditorOpen(true);
  };

  const handleAdd = () => {
    setEditingLink(null);
    setEditorOpen(true);
  };

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
            <h1 className="font-display text-lg font-semibold">Affiliate Links</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={refetch} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={handleAdd} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <Tabs defaultValue="links">
          <TabsList className="w-full">
            <TabsTrigger value="links" className="flex-1 gap-1.5">
              <Link2 className="w-4 h-4" />
              Links
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 gap-1.5">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="mt-4 space-y-3">
            {/* Product Filter */}
            <Select
              value={filterProductId ? String(filterProductId) : 'all'}
              onValueChange={(v) => setFilterProductId(v === 'all' ? null : Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {productCatalog.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.brand} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <AffiliateLinkTable
                links={links}
                onEdit={handleEdit}
                onDelete={deleteLink}
                filterProductId={filterProductId}
              />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-40 rounded-xl" />
              </div>
            ) : (
              <AffiliateClickAnalytics analytics={analytics} totalLinks={links.length} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Editor Dialog */}
      <AffiliateLinkEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        link={editingLink}
        onSave={addLink}
        onUpdate={updateLink}
      />
    </div>
  );
};

export default AdminAffiliatePage;
