
-- 1) user_saved_posts table for bookmarks
CREATE TABLE public.user_saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE public.user_saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved posts"
  ON public.user_saved_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
  ON public.user_saved_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
  ON public.user_saved_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2) user_wishlist table
CREATE TABLE public.user_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishlist"
  ON public.user_wishlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to wishlist"
  ON public.user_wishlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from wishlist"
  ON public.user_wishlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) Add product_id to community_posts
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS product_id integer DEFAULT NULL;
