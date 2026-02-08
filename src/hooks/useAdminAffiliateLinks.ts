import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AffiliateLink } from '@/hooks/useAffiliateLinks';
import { toast } from 'sonner';

export interface AffiliateLinkWithClicks extends AffiliateLink {
  click_count: number;
  actual_clicks: number;
}

export interface ClickAnalytics {
  retailer_name: string;
  product_id: number;
  total_clicks: number;
  last_click: string | null;
}

export const useAdminAffiliateLinks = () => {
  const [links, setLinks] = useState<AffiliateLinkWithClicks[]>([]);
  const [analytics, setAnalytics] = useState<ClickAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_affiliate_links')
        .select('*')
        .order('product_id', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Fetch click counts per link
      const { data: clickData, error: clickError } = await supabase
        .from('affiliate_clicks')
        .select('link_id, retailer_name, product_id, clicked_at');

      if (clickError) throw clickError;

      const clickMap = new Map<string, { count: number; lastClick: string | null }>();
      (clickData || []).forEach((click) => {
        const key = click.link_id || '';
        const existing = clickMap.get(key);
        if (existing) {
          existing.count++;
          if (click.clicked_at && (!existing.lastClick || click.clicked_at > existing.lastClick)) {
            existing.lastClick = click.clicked_at;
          }
        } else {
          clickMap.set(key, { count: 1, lastClick: click.clicked_at });
        }
      });

      const enrichedLinks: AffiliateLinkWithClicks[] = (data || []).map((link) => ({
        id: link.id,
        product_id: link.product_id,
        retailer_name: link.retailer_name,
        retailer_icon: link.retailer_icon || '🛒',
        affiliate_url: link.affiliate_url,
        is_primary: link.is_primary || false,
        sort_order: link.sort_order || 0,
        click_count: link.click_count || 0,
        actual_clicks: clickMap.get(link.id)?.count || 0,
      }));

      setLinks(enrichedLinks);

      // Build analytics
      const analyticsMap = new Map<string, ClickAnalytics>();
      (clickData || []).forEach((click) => {
        const key = `${click.product_id}-${click.retailer_name}`;
        const existing = analyticsMap.get(key);
        if (existing) {
          existing.total_clicks++;
          if (click.clicked_at && (!existing.last_click || click.clicked_at > existing.last_click)) {
            existing.last_click = click.clicked_at;
          }
        } else {
          analyticsMap.set(key, {
            retailer_name: click.retailer_name,
            product_id: click.product_id,
            total_clicks: 1,
            last_click: click.clicked_at,
          });
        }
      });
      setAnalytics(Array.from(analyticsMap.values()).sort((a, b) => b.total_clicks - a.total_clicks));
    } catch (e) {
      console.error('Error fetching admin affiliate data:', e);
      toast.error('Failed to load affiliate data');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const addLink = async (link: Omit<AffiliateLink, 'id'>) => {
    try {
      const { error } = await supabase.from('product_affiliate_links').insert({
        product_id: link.product_id,
        retailer_name: link.retailer_name,
        retailer_icon: link.retailer_icon,
        affiliate_url: link.affiliate_url,
        is_primary: link.is_primary,
        sort_order: link.sort_order,
      });
      if (error) throw error;
      toast.success('Link added successfully');
      await fetchLinks();
    } catch (e) {
      console.error('Error adding link:', e);
      toast.error('Failed to add link');
    }
  };

  const updateLink = async (id: string, updates: Partial<AffiliateLink>) => {
    try {
      const { error } = await supabase
        .from('product_affiliate_links')
        .update({
          retailer_name: updates.retailer_name,
          retailer_icon: updates.retailer_icon,
          affiliate_url: updates.affiliate_url,
          is_primary: updates.is_primary,
          sort_order: updates.sort_order,
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Link updated successfully');
      await fetchLinks();
    } catch (e) {
      console.error('Error updating link:', e);
      toast.error('Failed to update link');
    }
  };

  const deleteLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_affiliate_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Link deleted');
      await fetchLinks();
    } catch (e) {
      console.error('Error deleting link:', e);
      toast.error('Failed to delete link');
    }
  };

  return { links, analytics, isLoading, addLink, updateLink, deleteLink, refetch: fetchLinks };
};
