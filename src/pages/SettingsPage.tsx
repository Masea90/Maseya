import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Shield, Gift, ChevronRight, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { TranslationKey } from '@/lib/i18n';

const settingsSections: { icon: typeof User; labelKey: TranslationKey; path: string }[] = [
  { icon: User, labelKey: 'editProfileSetting', path: '/profile/edit' },
  { icon: Globe, labelKey: 'languageSetting', path: '/settings/language' },
  { icon: Bell, labelKey: 'notificationsSetting', path: '/settings/notifications' },
  { icon: Shield, labelKey: 'privacySetting', path: '/settings/privacy' },
  { icon: Gift, labelKey: 'rewardsSetting', path: '/rewards' },
];

const SettingsPage = () => {
  const { t } = useUser();
  const navigate = useNavigate();

  return (
    <AppLayout title={t('settings')}>
      <div className="px-4 py-6 space-y-4 animate-fade-in">
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {settingsSections.map((section) => (
              <button
                key={section.path}
                onClick={() => navigate(section.path)}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <section.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{t(section.labelKey)}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
