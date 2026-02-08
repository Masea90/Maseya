
-- Add category to community_posts for guided templates
ALTER TABLE public.community_posts 
ADD COLUMN category text DEFAULT 'general';

-- Create post_reactions table replacing generic likes
CREATE TABLE public.post_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('helped_me', 'i_relate', 'great_tip')),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_reactions
CREATE POLICY "Users can view all reactions"
  ON public.post_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON public.post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
  ON public.post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to count reactions per post
CREATE OR REPLACE FUNCTION public.get_post_reaction_counts(p_post_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(reaction_type, cnt),
    '{}'::jsonb
  )
  FROM (
    SELECT reaction_type, COUNT(*) as cnt
    FROM public.post_reactions
    WHERE post_id = p_post_id
    GROUP BY reaction_type
  ) sub;
$$;
