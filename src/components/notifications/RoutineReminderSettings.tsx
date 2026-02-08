import { useState, useEffect } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const RoutineReminderSettings = () => {
  const { t, user } = useUser();
  const { currentUser } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load current setting from DB
  useEffect(() => {
    const load = async () => {
      if (!currentUser?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('routine_reminders_enabled, timezone')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (data) {
          setEnabled(!!data.routine_reminders_enabled);
        }
      } catch (e) {
        console.error('Error loading reminder settings:', e);
      }
      setIsLoading(false);
    };
    load();
  }, [currentUser?.id]);

  const handleToggle = async (checked: boolean) => {
    if (!currentUser?.id) return;

    setEnabled(checked);

    // Detect user's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          routine_reminders_enabled: checked,
          timezone,
        })
        .eq('user_id', currentUser.id);

      if (error) throw error;
      toast.success(t('routineRemindersSaved'));
    } catch (e) {
      console.error('Error saving reminder settings:', e);
      setEnabled(!checked); // Revert
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {t('routineReminders')}
        </CardTitle>
        <CardDescription>
          {t('routineRemindersDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-maseya-gold" />
            <span className="text-sm text-muted-foreground">
              {enabled ? t('routineRemindersEnabled') : t('routineRemindersDisabled')}
            </span>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
};
