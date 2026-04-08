import { Link } from 'react-router-dom';
import { ExternalLink, ChevronRight } from 'lucide-react';
import { buildAmazonAffiliateUrl } from '@/lib/amazonAffiliate';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { productCatalog } from '@/lib/recommendations';
import { remedies } from '@/lib/remedies';
import type { TranslationKey } from '@/lib/i18n';

export interface ChatProduct {
  title: string;
  brand: string;
  amazon_url: string;
  marketplace: string;
  reason?: string;
  catalog_id?: number; // internal product ID if matched
}

export interface ChatRemedy {
  title: string;
  category: string;
  reason: string;
  remedy_id?: number; // internal remedy ID if matched
}

// Try to match an AI-recommended product to the internal catalog
function matchCatalogProduct(title: string, brand: string) {
  const titleLower = title.toLowerCase();
  const brandLower = brand.toLowerCase();
  return productCatalog.find(
    p =>
      p.brand.toLowerCase() === brandLower ||
      p.name.toLowerCase().includes(titleLower.split(' ').slice(0, 2).join(' ')) ||
      titleLower.includes(p.name.toLowerCase().split(' ').slice(0, 2).join(' '))
  );
}

// Try to match a remedy by title
function matchRemedy(title: string) {
  const titleLower = title.toLowerCase();
  return remedies.find(r => {
    // We can't resolve the key here easily, so match by keywords
    const keywords = titleLower.split(' ');
    return keywords.some(kw => kw.length > 4 && r.titleKey.toLowerCase().includes(kw));
  });
}

export const ChatProductCard = ({ product }: { product: ChatProduct }) => {
  const { currentUser } = useAuth();
  const { t } = useUser();
  const catalogProduct = product.catalog_id
    ? productCatalog.find(p => p.id === product.catalog_id)
    : matchCatalogProduct(product.title, product.brand);

  const handleAmazonClick = () => {
    const affiliateUrl = buildAmazonAffiliateUrl(product.amazon_url);
    window.open(affiliateUrl, '_blank', 'noopener,noreferrer');

    // Only track if we have a real catalog product ID
    if (catalogProduct?.id) {
      supabase.from('affiliate_clicks').insert({
        product_id: catalogProduct.id,
        retailer_name: product.marketplace,
        user_id: currentUser?.id || null,
      }).then(() => {});
    }
  };

  return (
    <div className="flex gap-3 p-3 rounded-xl border border-border bg-background">
      {/* Product image */}
      {catalogProduct?.image ? (
        <img
          src={catalogProduct.image}
          alt={product.title}
          className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🧴</span>
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1.5">
        <div>
          <p className="text-xs font-semibold text-foreground leading-tight truncate">
            {product.title}
          </p>
          <p className="text-[10px] text-muted-foreground">{product.brand}</p>
        </div>

        {product.reason && (
          <p className="text-[10px] text-primary italic leading-snug line-clamp-2">
            {product.reason}
          </p>
        )}

        <div className="flex gap-1.5">
          {catalogProduct && (
            <Link
              to={`/product/${catalogProduct.id}`}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[10px] font-medium text-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
              {t('viewProduct')}
            </Link>
          )}
          <button
            onClick={handleAmazonClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-medium hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-3 h-3" />
            Amazon
          </button>
        </div>
      </div>
    </div>
  );
};

export const ChatRemedyCard = ({ remedy }: { remedy: ChatRemedy }) => {
  const { t } = useUser();
  const matchedRemedy = remedy.remedy_id
    ? remedies.find(r => r.id === remedy.remedy_id)
    : matchRemedy(remedy.title);

  return (
    <Link
      to={matchedRemedy ? `/remedy/${matchedRemedy.id}` : '/remedies'}
      className="flex gap-3 p-3 rounded-xl border border-glow-nutrition/25 bg-glow-nutrition/5 hover:bg-glow-nutrition/10 transition-colors"
    >
      <div className="w-14 h-14 rounded-lg bg-glow-nutrition/15 flex items-center justify-center text-2xl flex-shrink-0">
        {matchedRemedy?.image || '🌿'}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-glow-nutrition bg-glow-nutrition/15 px-1.5 py-0.5 rounded-full">
            {remedy.category}
          </span>
        </div>
        <p className="text-xs font-semibold text-foreground leading-tight truncate">
          {matchedRemedy ? t(matchedRemedy.titleKey as TranslationKey) : remedy.title}
        </p>
        {remedy.reason && (
          <p className="text-[10px] text-primary italic leading-snug line-clamp-2">
            {remedy.reason}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 self-center" />
    </Link>
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

export const ChatRemedyCards = ({ remedies: remedyList }: { remedies: ChatRemedy[] }) => {
  if (!remedyList?.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {remedyList.map((remedy, idx) => (
        <ChatRemedyCard key={`${remedy.title}-${idx}`} remedy={remedy} />
      ))}
    </div>
  );
};
