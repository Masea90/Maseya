import { useState } from 'react';
import { Bell, BellOff, Clock, FlaskConical, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const isDev = import.meta.env.DEV;

export const NotificationSettings = () => {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestPush = async () => {
    setIsSendingTest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Not signed in', description: 'Sign in to test push.', variant: 'destructive' });
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-push`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title: 'MASEYA Test 🧪',
            message: 'Push notifications are working!',
          }),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        toast({
          title: 'Test failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Test sent!',
          description: `Sent to ${result.sent} device(s). Check your notifications.`,
        });
      }
    } catch (err) {
      console.error('Test push error:', err);
      toast({ title: 'Error', description: 'Failed to send test push.', variant: 'destructive' });
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellOff className="w-4 h-4" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser. Try using Chrome or Safari on a mobile device.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          {permission === 'denied'
            ? 'Notifications are blocked. To re-enable them, update your browser or device notification settings for this site.'
            : 'Get gentle reminders to complete your morning and night beauty routines, plus updates when someone interacts with your posts.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isSubscribed ? 'Routine reminders active' : 'Enable routine reminders'}
            </span>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading || permission === 'denied'}
          />
        </div>
        {permission === 'denied' && (
          <p className="text-xs text-destructive">
            You previously blocked notifications. Open your browser settings to allow them again.
          </p>
        )}
        {isDev && isSubscribed && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 gap-2 text-xs"
            onClick={handleTestPush}
            disabled={isSendingTest}
          >
            {isSendingTest ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <FlaskConical className="w-3 h-3" />
            )}
            Send Test Notification (Dev)
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
