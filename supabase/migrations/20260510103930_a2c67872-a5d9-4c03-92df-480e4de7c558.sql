
-- ============ DROP OLD FEATURES ============

-- Community
DROP TABLE IF EXISTS public.post_reactions CASCADE;
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.user_saved_posts CASCADE;
DROP TABLE IF EXISTS public.user_follows CASCADE;
DROP TABLE IF EXISTS public.community_posts CASCADE;

-- Wishlist
DROP TABLE IF EXISTS public.user_wishlist CASCADE;

-- Routines
DROP TABLE IF EXISTS public.routine_completions CASCADE;

-- Rewards
DROP TABLE IF EXISTS public.point_transactions CASCADE;
DROP TABLE IF EXISTS public.user_badges CASCADE;

-- Affiliates
DROP TABLE IF EXISTS public.affiliate_clicks CASCADE;
DROP TABLE IF EXISTS public.product_affiliate_links CASCADE;

-- Drop now-orphaned functions
DROP FUNCTION IF EXISTS public.update_comments_count() CASCADE;
DROP FUNCTION IF EXISTS public.update_likes_count() CASCADE;
DROP FUNCTION IF EXISTS public.create_like_notification() CASCADE;
DROP FUNCTION IF EXISTS public.create_comment_notification() CASCADE;
DROP FUNCTION IF EXISTS public.get_post_reaction_counts(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_points() CASCADE;
DROP FUNCTION IF EXISTS public.update_streak_on_completion() CASCADE;

-- Drop columns on profiles tied to removed features
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS custom_routine,
  DROP COLUMN IF EXISTS routine_reminders_enabled,
  DROP COLUMN IF EXISTS first_routine_completed,
  DROP COLUMN IF EXISTS points,
  DROP COLUMN IF EXISTS streak,
  DROP COLUMN IF EXISTS is_premium;

-- ============ NEW TABLES ============

-- 1) health_profiles
CREATE TABLE public.health_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  skin_type TEXT[] DEFAULT '{}',
  skin_conditions TEXT[] DEFAULT '{}',
  skin_sensitivities TEXT[] DEFAULT '{}',
  hair_type TEXT,
  hair_condition TEXT,
  hair_concerns TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  diet TEXT,
  nutrition_goals TEXT[] DEFAULT '{}',
  pregnancy_or_lactation BOOLEAN DEFAULT false,
  completion_pct INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own health profile select" ON public.health_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own health profile insert" ON public.health_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own health profile update" ON public.health_profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own health profile delete" ON public.health_profiles
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER health_profiles_updated_at
  BEFORE UPDATE ON public.health_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) products_cache
CREATE TABLE public.products_cache (
  barcode TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('off','obf','photo')),
  product_data JSONB NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products cache public read" ON public.products_cache
  FOR SELECT USING (true);
-- No insert/update/delete policies → only service role can write.

-- 3) scan_history
CREATE TABLE public.scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barcode TEXT,
  source TEXT NOT NULL CHECK (source IN ('off','obf','photo')),
  product_name TEXT,
  product_image TEXT,
  category TEXT CHECK (category IN ('food','cosmetic','unknown')),
  product_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- { global, layer1, layer2, layer3 }
  ai_explanation TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX scan_history_user_scanned_idx ON public.scan_history(user_id, scanned_at DESC);
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own scans select" ON public.scan_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own scans insert" ON public.scan_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own scans delete" ON public.scan_history
  FOR DELETE USING (auth.uid() = user_id);

-- 4) scan_alternatives
CREATE TABLE public.scan_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scan_history(id) ON DELETE CASCADE,
  alt_barcode TEXT,
  alt_data JSONB NOT NULL,
  reason TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX scan_alternatives_scan_idx ON public.scan_alternatives(scan_id);
ALTER TABLE public.scan_alternatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own alternatives select" ON public.scan_alternatives
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.scan_history s WHERE s.id = scan_id AND s.user_id = auth.uid())
  );
-- Inserts done by service role only.

-- 5) subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium')),
  period TEXT CHECK (period IN ('monthly','yearly')),
  provider TEXT,
  provider_customer_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own subscription select" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
-- Writes by service role only.

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) monthly_scan_counts
CREATE TABLE public.monthly_scan_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- 'YYYY-MM'
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year_month)
);

ALTER TABLE public.monthly_scan_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own scan counts select" ON public.monthly_scan_counts
  FOR SELECT USING (auth.uid() = user_id);
-- Writes by service role only.
