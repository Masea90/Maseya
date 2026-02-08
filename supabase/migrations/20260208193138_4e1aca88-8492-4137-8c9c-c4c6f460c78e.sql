
-- Add reminder preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS routine_reminders_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Create routine_completions table to track daily completion
CREATE TABLE public.routine_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'night')),
  completed_steps TEXT[] DEFAULT '{}',
  total_steps INTEGER DEFAULT 0,
  is_fully_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, completion_date, time_of_day)
);

-- Enable RLS
ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view own completions"
ON public.routine_completions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert own completions"
ON public.routine_completions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own completions
CREATE POLICY "Users can update own completions"
ON public.routine_completions FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can read all (for the cron edge function)
CREATE POLICY "Service role can read all completions"
ON public.routine_completions FOR SELECT
USING (true);

-- Timestamp trigger
CREATE TRIGGER update_routine_completions_updated_at
BEFORE UPDATE ON public.routine_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for efficient cron queries
CREATE INDEX idx_routine_completions_date_user 
ON public.routine_completions (completion_date, user_id, time_of_day);

CREATE INDEX idx_profiles_reminders_enabled
ON public.profiles (routine_reminders_enabled) WHERE routine_reminders_enabled = true;
