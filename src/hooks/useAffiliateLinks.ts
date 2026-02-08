import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AffiliateLink {
  id: string;
  product_id: number;
  retailer_name: string;
  retailer_icon: string;
  affiliate_url: string;
  is_primary: boolean;
  sort_order: number;
}

export const useAffiliateLinks = (productId: number) => {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchLinks = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('product_affiliate_links')
          .select('id, product_id, retailer_name, retailer_icon, affiliate_url, is_primary, sort_order')
          .eq('product_id', productId)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Error fetching affiliate links:', error);
        } else {
          setLinks((data as AffiliateLink[]) || []);
        }
      } catch (e) {
        console.error('Error fetching affiliate links:', e);
      }
      setIsLoading(false);
    };

    if (productId) {
      fetchLinks();
    }
  }, [productId]);

  const trackClick = async (link: AffiliateLink) => {
    try {
      await supabase.from('affiliate_clicks').insert({
        link_id: link.id,
        user_id: currentUser?.id || null,
        product_id: link.product_id,
        retailer_name: link.retailer_name,
      });
    } catch (e) {
      console.error('Error tracking click:', e);
    }

    // Open link
    window.open(link.affiliate_url, '_blank', 'noopener,noreferrer');
  };

  const primaryLink = links.find(l => l.is_primary) || links[0];

  return { links, primaryLink, isLoading, trackClick };
};
