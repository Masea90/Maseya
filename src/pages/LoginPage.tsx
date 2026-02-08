import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getTranslation, TranslationKey } from '@/lib/i18n';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Login page can't use useUser (not inside UserProvider yet for unauthenticated users)
  // Read language from localStorage or default to 'en'
  const getSavedLanguage = (): 'en' | 'es' | 'fr' => {
    try {
      const stored = localStorage.getItem('maseya_language');
      if (stored === 'es' || stored === 'fr') return stored;
    } catch {}
    return 'en';
  };

  const lang = getSavedLanguage();
  const t = (key: TranslationKey): string => getTranslation(lang, key);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error(t('loginEmail'));
      return;
    }
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUp(email, password);
        if (result.success) {
          toast.success('Welcome aboard 🌿');
          navigate('/');
        } else {
          toast.error(result.error || 'Sign up failed');
        }
      } else {
        const result = await login(email, password);
        if (result.success) {
          toast.success('Welcome back! 🌿');
          navigate('/');
        } else {
          toast.error(result.error || 'Login failed');
        }
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        toast.error(result.error || 'Google sign in failed');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 pt-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            MASEYA
          </h1>
          <p className="text-muted-foreground mt-1">{t('loginSubtitle')}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 animate-fade-in">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            {isSignUp ? t('loginCreateAccount') : t('loginWelcomeBack')}
          </h2>
          <p className="text-muted-foreground">
            {isSignUp ? t('loginSignUpDesc') : t('loginSignInDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('loginEmail')}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-12 pl-12 rounded-2xl"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('loginPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignUp ? t('loginMinChars') : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12 pl-12 pr-12 rounded-2xl"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-lg font-medium bg-gradient-olive"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                {t('loginCreateAccount')}
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                {t('loginSignIn')}
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">{t('loginOr')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social Login */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-14 rounded-2xl text-lg font-medium"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isSubmitting}
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t('loginContinueGoogle')}
            </>
          )}
        </Button>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {isSignUp ? t('loginAlreadyHaveAccount') : t('loginDontHaveAccount')}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-medium"
            disabled={isSubmitting}
          >
            {isSignUp ? t('loginSignIn') : t('loginSignUp')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
