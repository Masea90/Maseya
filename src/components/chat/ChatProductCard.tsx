import { ExternalLink } from 'lucide-react';
import { buildAmazonAffiliateUrl } from '@/lib/amazonAffiliate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';

export interface ChatProduct {
  title: string;
  brand: string;
  amazon_url: string;
  marketplace: string;
  reason?: string;
}

export const ChatProductCard = ({ product }: { product: ChatProduct }) => {
  const { currentUser } = useAuth();
  const { t } = useUser();

  const handleClick = () => {
    const affiliateUrl = buildAmazonAffiliateUrl(product.amazon_url);
    window.open(affiliateUrl, '_blank', 'noopener,noreferrer');

    // Fire-and-forget tracking
    supabase.from('affiliate_clicks').insert({
      product_id: 0,
      retailer_name: product.marketplace,
      user_id: currentUser?.id || null,
    }).then(() => {});
  };

  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-border bg-background">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground leading-tight truncate">
            {product.title}
          </p>
          <p className="text-[10px] text-muted-foreground">{product.brand}</p>
        </div>
      </div>
      {product.reason && (
        <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
          {product.reason}
        </p>
      )}
      <button
        onClick={handleClick}
        className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 transition-opacity"
      >
        <ExternalLink className="w-3 h-3" />
        {t('openOnAmazon') || 'Open on Amazon'}
      </button>
    </div>
  );
};

export const ChatProductCards = ({ products }: { products: ChatProduct[] }) => {
  if (!products?.length) return null;

  return (
    <div className="mt-2 space-y-2">
      {products.map((product, idx) => (
        <ChatProductCard key={`${product.title}-${idx}`} product={product} />
      ))}
    </div>
  );
};
