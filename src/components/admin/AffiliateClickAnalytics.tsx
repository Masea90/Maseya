import { BarChart3, MousePointerClick, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClickAnalytics } from '@/hooks/useAdminAffiliateLinks';
import { productCatalog } from '@/lib/recommendations';

interface AffiliateClickAnalyticsProps {
  analytics: ClickAnalytics[];
  totalLinks: number;
}

const AffiliateClickAnalytics = ({ analytics, totalLinks }: AffiliateClickAnalyticsProps) => {
  const totalClicks = analytics.reduce((sum, a) => sum + a.total_clicks, 0);
  const topRetailer = analytics[0];

  const getProductName = (productId: number) => {
    const product = productCatalog.find((p) => p.id === productId);
    return product ? `${product.brand} — ${product.name}` : `Product #${productId}`;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalLinks}</p>
            <p className="text-xs text-muted-foreground">Total Links</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <MousePointerClick className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalClicks}</p>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{topRetailer?.retailer_name || '—'}</p>
            <p className="text-xs text-muted-foreground">Top Retailer</p>
          </CardContent>
        </Card>
      </div>

      {/* Click breakdown */}
      {analytics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Click Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.map((entry, i) => {
              const pct = totalClicks > 0 ? (entry.total_clicks / totalClicks) * 100 : 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate mr-2">
                      {entry.retailer_name} · <span className="text-muted-foreground">{getProductName(entry.product_id)}</span>
                    </span>
                    <span className="font-medium whitespace-nowrap">{entry.total_clicks} clicks</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {analytics.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MousePointerClick className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No click data yet</p>
            <p className="text-xs">Clicks will appear here as users interact with affiliate links</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AffiliateClickAnalytics;
