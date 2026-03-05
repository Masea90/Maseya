import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { productCatalog } from '@/lib/recommendations';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const ProfileWishlist = () => {
  const { currentUser } = useAuth();
  const { t } = useUser();
  const navigate = useNavigate();
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('user_wishlist')
      .select('product_id')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setWishlistIds(data?.map(d => d.product_id) || []);
        setIsLoading(false);
      });
  }, [currentUser?.id]);

  const removeFromWishlist = async (productId: number) => {
    if (!currentUser?.id) return;
    setWishlistIds(prev => prev.filter(id => id !== productId));
    await supabase.from('user_wishlist').delete().eq('user_id', currentUser.id).eq('product_id', productId);
  };

  const products = wishlistIds
    .map(id => productCatalog.find(p => p.id === id))
    .filter(Boolean);

  if (isLoading) return null;

  return (
    <div className="bg-card rounded-2xl p-5 shadow-warm space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-destructive" />
        <h3 className="font-semibold text-foreground">{t('myWishlist')}</h3>
        {products.length > 0 && (
          <span className="text-xs text-muted-foreground">({products.length})</span>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-4 space-y-1">
          <Package className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">{t('wishlistEmpty')}</p>
          <p className="text-xs text-muted-foreground">{t('wishlistEmptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map(product => {
            if (!product) return null;
            return (
              <div key={product.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50 border border-border group">
                <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground">{product.brand}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs h-7"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {t('viewProduct')}
                </Button>
                <button
                  onClick={() => removeFromWishlist(product.id)}
                  className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                  title={t('removeFromWishlist')}
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
