import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getTranslation, TranslationKey } from '@/lib/i18n';

const ResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

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
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        console.error('Reset password error:', error);
      }
      // Always show success to prevent email enumeration
      setIsSent(true);
    } catch {
      setIsSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-muted-foreground text-sm">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link.
              Check your inbox (and spam folder).
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary font-medium text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to login
          </Link>
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
          <h1 className="font-display text-3xl font-bold text-foreground">MASEYA</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-4 animate-fade-in">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Reset password
          </h2>
          <p className="text-muted-foreground">
            Enter your email and we'll send you a link to reset your password.
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
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-lg font-medium bg-gradient-olive"
            disabled={isSubmitting || !email.trim()}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-primary font-medium text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
