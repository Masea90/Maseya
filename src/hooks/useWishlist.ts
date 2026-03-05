import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useWishlist() {
  const { currentUser } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }
    supabase
      .from('user_wishlist')
      .select('product_id')
      .eq('user_id', currentUser.id)
      .then(({ data }) => {
        setWishlistIds(new Set(data?.map(d => d.product_id) || []));
        setIsLoading(false);
      });
  }, [currentUser?.id]);

  const isInWishlist = useCallback(
    (productId: number) => wishlistIds.has(productId),
    [wishlistIds]
  );

  const toggleWishlist = useCallback(
    async (productId: number) => {
      if (!currentUser?.id) return;
      const removing = wishlistIds.has(productId);

      // Optimistic update
      setWishlistIds(prev => {
        const next = new Set(prev);
        removing ? next.delete(productId) : next.add(productId);
        return next;
      });

      if (removing) {
        await supabase
          .from('user_wishlist')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('product_id', productId);
      } else {
        await supabase
          .from('user_wishlist')
          .upsert(
            { user_id: currentUser.id, product_id: productId },
            { onConflict: 'user_id,product_id' }
          );
      }
    },
    [currentUser?.id, wishlistIds]
  );

  return { wishlistIds, isInWishlist, toggleWishlist, isLoading };
}
