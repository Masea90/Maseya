
-- 1) Trigger to sync profiles.points from point_transactions
CREATE OR REPLACE FUNCTION public.sync_profile_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id UUID;
  total_points INTEGER;
BEGIN
  -- Determine which user_id to update
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;

  -- Compute the real total from point_transactions
  SELECT COALESCE(SUM(amount), 0) INTO total_points
  FROM public.point_transactions
  WHERE user_id = target_user_id;

  -- Update profiles.points to match
  UPDATE public.profiles
  SET points = total_points
  WHERE user_id = target_user_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to point_transactions
DROP TRIGGER IF EXISTS trigger_sync_profile_points ON public.point_transactions;
CREATE TRIGGER trigger_sync_profile_points
AFTER INSERT OR UPDATE OR DELETE ON public.point_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_points();

-- 2) Function to update streak based on routine completion
CREATE OR REPLACE FUNCTION public.update_streak_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_date DATE;
  current_streak INTEGER;
  today DATE := CURRENT_DATE;
BEGIN
  -- Only process fully completed routines
  IF NOT NEW.is_fully_completed THEN
    RETURN NEW;
  END IF;

  -- Get current streak and find the last completion date before today
  SELECT p.streak INTO current_streak
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  SELECT MAX(rc.completion_date) INTO last_date
  FROM public.routine_completions rc
  WHERE rc.user_id = NEW.user_id
    AND rc.is_fully_completed = true
    AND rc.completion_date < today;

  IF last_date = today - 1 THEN
    -- Consecutive day: increment streak
    UPDATE public.profiles
    SET streak = COALESCE(current_streak, 0) + 1
    WHERE user_id = NEW.user_id;
  ELSIF last_date IS NULL OR last_date < today - 1 THEN
    -- Gap > 1 day or first ever: reset to 1
    UPDATE public.profiles
    SET streak = 1
    WHERE user_id = NEW.user_id;
  END IF;
  -- If last_date = today, another routine today, don't change streak

  RETURN NEW;
END;
$$;

-- Attach trigger to routine_completions
DROP TRIGGER IF EXISTS trigger_update_streak ON public.routine_completions;
CREATE TRIGGER trigger_update_streak
AFTER INSERT OR UPDATE ON public.routine_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_streak_on_completion();
