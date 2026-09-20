-- Internal config table (service-role only) holding the shared secret used by
-- the profiles trigger to authenticate against the send-welcome-email function.
CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No policies: not readable/writable by anon or authenticated. Service role only.

INSERT INTO public.app_config (key, value)
VALUES ('welcome_trigger_secret', gen_random_uuid()::text);

-- Fires on profile creation and on any later profile write. The edge function
-- decides: confirmed email, account created after the rollout cutoff, and not
-- already logged in email_send_log. Email+password users are skipped until
-- they confirm; their next profile write (e.g. onboarding) re-triggers.
CREATE OR REPLACE FUNCTION public.notify_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT value INTO v_secret FROM public.app_config WHERE key = 'welcome_trigger_secret';
  IF v_secret IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := 'https://tjimqvdnzjivpgkkyylo.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-welcome-secret', v_secret
    ),
    body := jsonb_build_object('user_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_welcome_email
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_welcome_email();