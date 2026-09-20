-- Weekly "did you know" push tips
CREATE TABLE public.push_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL DEFAULT '/scan',
  language text NOT NULL DEFAULT 'es',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.push_tips TO authenticated;
GRANT ALL ON public.push_tips TO service_role;
ALTER TABLE public.push_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage push tips"
ON public.push_tips FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- One row per user per delivered tip: enforces weekly cap + no-repeat rotation
CREATE TABLE public.push_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tip_id uuid NOT NULL REFERENCES public.push_tips(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent'
);

CREATE INDEX push_sends_user_sent_idx ON public.push_sends (user_id, sent_at DESC);

GRANT SELECT ON public.push_sends TO authenticated;
GRANT ALL ON public.push_sends TO service_role;
ALTER TABLE public.push_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own push sends"
ON public.push_sends FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Opt-out flag on existing subscriptions (additive, defaulted)
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;