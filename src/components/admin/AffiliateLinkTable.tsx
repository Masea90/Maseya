import { Pencil, Trash2, ExternalLink, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AffiliateLinkWithClicks } from '@/hooks/useAdminAffiliateLinks';
import { productCatalog } from '@/lib/recommendations';
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

interface AffiliateLinkTableProps {
  links: AffiliateLinkWithClicks[];
  onEdit: (link: AffiliateLinkWithClicks) => void;
  onDelete: (id: string) => void;
  filterProductId: number | null;
}

const AffiliateLinkTable = ({ links, onEdit, onDelete, filterProductId }: AffiliateLinkTableProps) => {
  const getProductName = (productId: number) => {
    const product = productCatalog.find((p) => p.id === productId);
    return product ? `${product.brand} — ${product.name}` : `Product #${productId}`;
  };

  const filteredLinks = filterProductId
    ? links.filter((l) => l.product_id === filterProductId)
    : links;

  // Group by product
  const grouped = filteredLinks.reduce<Record<number, AffiliateLinkWithClicks[]>>((acc, link) => {
    if (!acc[link.product_id]) acc[link.product_id] = [];
    acc[link.product_id].push(link);
    return acc;
  }, {});

  if (filteredLinks.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        No affiliate links found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([productId, productLinks]) => (
        <div key={productId} className="border border-border rounded-xl overflow-hidden">
          <div className="bg-secondary/50 px-4 py-2">
            <h3 className="font-medium text-sm">{getProductName(Number(productId))}</h3>
          </div>
          <div className="divide-y divide-border">
            {productLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-lg flex-shrink-0">{link.retailer_icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">{link.retailer_name}</span>
                      {link.is_primary && (
                        <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {link.affiliate_url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {link.actual_clicks} clicks
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(link.affiliate_url, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(link)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete affiliate link?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove the {link.retailer_name} link for{' '}
                          {getProductName(link.product_id)}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(link.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AffiliateLinkTable;
