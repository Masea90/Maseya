import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Shield, Gift, ChevronRight, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const settingsSections = [
  { icon: User, label: 'Edit Profile', path: '/profile/edit' },
  { icon: Globe, label: 'Language', path: '/settings/language' },
  { icon: Bell, label: 'Notifications', path: '/settings/notifications' },
  { icon: Shield, label: 'Privacy', path: '/settings/privacy' },
  { icon: Gift, label: 'Rewards', path: '/rewards' },
];

const SettingsPage = () => {
  const { t } = useUser();
  const navigate = useNavigate();

  return (
    <AppLayout title="Settings">
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
                  <span className="text-sm font-medium">{section.label}</span>
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
