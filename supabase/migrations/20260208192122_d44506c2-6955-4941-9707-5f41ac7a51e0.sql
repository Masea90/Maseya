
-- Add custom_routine column to profiles for storing user-customized routine steps
ALTER TABLE public.profiles 
ADD COLUMN custom_routine jsonb DEFAULT NULL;

-- This stores the user's customized routine as:
-- { "morning": [...steps], "night": [...steps] }
-- When null, the app uses default routine steps
