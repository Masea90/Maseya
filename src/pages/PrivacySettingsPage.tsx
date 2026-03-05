import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Download, Trash2, Eye, BarChart3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PrivacySettingsPage = () => {
  const { user, updateUser, t } = useUser();
  const { currentUser } = useAuth();

  const handleToggleAnalytics = (checked: boolean) => {
    updateUser({ consentAnalytics: checked, consentDate: new Date().toISOString() });
    toast.success(checked ? 'Analytics enabled' : 'Analytics disabled');
  };

  const handleTogglePersonalization = (checked: boolean) => {
    updateUser({ consentPersonalization: checked, consentDate: new Date().toISOString() });
    toast.success(checked ? 'Personalization enabled' : 'Personalization disabled');
  };

  return (
    <AppLayout title={t('privacy')}>
      <div className="px-4 py-6 space-y-6 animate-fade-in">
        {/* Data Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t('consentTitle')}
            </CardTitle>
            <CardDescription>
              {t('consentDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('consentPersonalizationTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('consentPersonalizationDesc')}</p>
                </div>
              </div>
              <Switch
                checked={user.consentPersonalization}
                onCheckedChange={handleTogglePersonalization}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('consentImprovementTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('consentImprovementDesc')}</p>
                </div>
              </div>
              <Switch
                checked={user.consentAnalytics}
                onCheckedChange={handleToggleAnalytics}
              />
            </div>

            {user.consentDate && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Last updated: {new Date(user.consentDate).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4" />
              Your Data
            </CardTitle>
            <CardDescription>
              Manage your personal data stored in MASEYA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => toast.info('Data export will be available soon.')}
            >
              <Download className="w-4 h-4" />
              Export my data
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={() => toast.info('To delete your account, please contact support@maseya.es')}
            >
              <Trash2 className="w-4 h-4" />
              Delete my account
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center px-4">
          {t('consentPrivacyDesc')}
        </p>
      </div>
    </AppLayout>
  );
};

export default PrivacySettingsPage;
