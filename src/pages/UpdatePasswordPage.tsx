import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getTranslation, TranslationKey } from '@/lib/i18n';

const UpdatePasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const getSavedLanguage = (): 'en' | 'es' | 'fr' => {
    try {
      const stored = localStorage.getItem('maseya_language');
      if (stored === 'es' || stored === 'fr') return stored;
    } catch {}
    return 'en';
  };
  const lang = getSavedLanguage();
  const t = (key: TranslationKey): string => getTranslation(lang, key);

  // Check for recovery session from the URL hash
  useEffect(() => {
    const checkSession = async () => {
      // Supabase puts the recovery token in the URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');

      if (type === 'recovery') {
        setIsValidSession(true);
      } else {
        // Also check if there's an active session (user might already be logged in via recovery link)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidSession(true);
        }
      }
      setIsChecking(false);
    };
    checkSession();

    // Listen for auth state changes (recovery token auto-signs in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setIsChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error(t('passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error(error.message || t('passwordUpdateError'));
      } else {
        setIsSuccess(true);
        toast.success(t('passwordUpdatedSuccess'));
        setTimeout(() => navigate('/home'), 2000);
      }
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="font-display text-xl font-bold">{t('invalidLinkTitle')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('invalidLinkDesc')}
          </p>
          <Button onClick={() => navigate('/reset-password')} className="bg-gradient-olive">
            {t('requestNewLink')}
          </Button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold">{t('passwordUpdatedTitle')}</h1>
          <p className="text-muted-foreground text-sm">{t('passwordUpdatedDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-6 pt-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">KHARM</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-4 animate-fade-in">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            {t('setNewPasswordTitle')}
          </h2>
          <p className="text-muted-foreground">
            {t('setNewPasswordDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('newPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('loginMinChars')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12 pl-12 pr-12 rounded-2xl"
                disabled={isSubmitting}
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('confirmPasswordLabel')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('reenterPassword')}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="h-12 pl-12 rounded-2xl"
                disabled={isSubmitting}
                minLength={6}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-lg font-medium bg-gradient-olive"
            disabled={isSubmitting || password.length < 6}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              t('updatePassword')
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
