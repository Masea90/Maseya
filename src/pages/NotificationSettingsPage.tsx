import { AppLayout } from '@/components/layout/AppLayout';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { RoutineReminderSettings } from '@/components/notifications/RoutineReminderSettings';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell, MessageSquare, Heart, Gift, Users } from 'lucide-react';

const NotificationSettingsPage = () => {
  const { t } = useUser();

  const inAppSettings = [
    { id: 'likes', icon: Heart, label: 'Likes', description: 'When someone likes your post' },
    { id: 'comments', icon: MessageSquare, label: 'Comments', description: 'When someone comments on your post' },
    { id: 'follows', icon: Users, label: 'Follows', description: 'When someone follows you' },
    { id: 'rewards', icon: Gift, label: 'Rewards', description: 'Points earned and reward updates' },
  ];

  return (
    <AppLayout title={t('notifications')}>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Push Notifications */}
        <NotificationSettings />

        {/* Routine Reminders */}
        <RoutineReminderSettings />

        {/* In-App Notification Preferences */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              In-App Notifications
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive in the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inAppSettings.map(setting => (
              <div key={setting.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <setting.icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{setting.label}</p>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NotificationSettingsPage;
