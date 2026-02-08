import { supabase } from '@/integrations/supabase/client';

/**
 * Returns auth headers with the user's JWT token for edge function calls.
 * Falls back to publishable key if no session exists.
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};
