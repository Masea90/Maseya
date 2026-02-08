
-- Create product affiliate links table
CREATE TABLE public.product_affiliate_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id INTEGER NOT NULL,
  retailer_name TEXT NOT NULL,
  retailer_icon TEXT DEFAULT '🛒',
  affiliate_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, retailer_name)
);

-- Enable RLS
ALTER TABLE public.product_affiliate_links ENABLE ROW LEVEL SECURITY;

-- Everyone can read affiliate links (public data)
CREATE POLICY "Anyone can view affiliate links"
ON public.product_affiliate_links FOR SELECT
USING (true);

-- Only admins can manage affiliate links
CREATE POLICY "Admins can manage affiliate links"
ON public.product_affiliate_links FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create click tracking table
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES public.product_affiliate_links(id) ON DELETE CASCADE,
  user_id UUID,
  product_id INTEGER NOT NULL,
  retailer_name TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert clicks (tracking)
CREATE POLICY "Anyone can record clicks"
ON public.affiliate_clicks FOR INSERT
WITH CHECK (true);

-- Only admins can view click analytics
CREATE POLICY "Admins can view click analytics"
ON public.affiliate_clicks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX idx_affiliate_links_product ON public.product_affiliate_links(product_id);
CREATE INDEX idx_affiliate_clicks_product ON public.affiliate_clicks(product_id);
CREATE INDEX idx_affiliate_clicks_link ON public.affiliate_clicks(link_id);

-- Timestamp trigger
CREATE TRIGGER update_affiliate_links_updated_at
BEFORE UPDATE ON public.product_affiliate_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
