import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Hardcoded Spanish copy — auth pages are Spanish-only for now.
const T = {
  subtitle: 'Bienvenida de nuevo',
  welcomeBack: 'Bienvenida',
  createAccount: 'Crear cuenta',
  signInDesc: 'Inicia sesión para continuar',
  signUpDesc: 'Comienza tu camino personalizado',
  email: 'Correo electrónico',
  password: 'Contraseña',
  minChars: 'Mín. 6 caracteres',
  forgotPassword: '¿Olvidaste tu contraseña?',
  signIn: 'Entrar',
  signUp: 'Regístrate',
  or: 'o',
  continueGoogle: 'Continuar con Google',
  dontHaveAccount: '¿No tienes cuenta?',
  alreadyHaveAccount: '¿Ya tienes una cuenta?',
  checkEmailTitle: 'Revisa tu correo',
  checkEmailDescription: 'Te enviamos un enlace de verificación para activar tu cuenta.',
  checkEmailSpamHint: '¿No lo ves? Revisa la carpeta de spam o promociones.',
  checkEmailResend: 'Reenviar correo de verificación',
  checkEmailResent: '¡Correo de verificación reenviado!',
  checkEmailBackToLogin: 'Volver al inicio de sesión',
  welcomeToast: '¡Bienvenida de nuevo! 🌿',
  signUpFailed: 'Error al registrarse',
  loginFailed: 'Error al iniciar sesión',
  unexpectedError: 'Ha ocurrido un error inesperado',
  googleSignInFailed: 'Error con el inicio de sesión de Google',
  emptyFields: 'Introduce tu correo y contraseña',
  alreadyRegistered: 'Este correo ya tiene una cuenta. Inicia sesión con tu contraseña o con Google.',
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get('next');
  const nextPath = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
  const { login, signUp, signInWithGoogle } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error(T.emptyFields);
      return;
    }
    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUp(email, password);
        if (result.success) {
          setSignupEmail(email.toLowerCase().trim());
          setShowEmailConfirmation(true);
        } else if (result.code === 'already_registered') {
          toast.info(T.alreadyRegistered);
          setIsSignUp(false);
          setPassword('');
        } else {
          toast.error(result.error || T.signUpFailed);
        }
      } else {
        const result = await login(email, password);
        if (result.success) {
          toast.success(T.welcomeToast);
          navigate(nextPath);
        } else {
          toast.error(result.error || T.loginFailed);
        }
      }
    } catch {
      toast.error(T.unexpectedError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    if (!signupEmail) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(T.checkEmailResent);
      }
    } catch {
      toast.error(T.unexpectedError);
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle(nextPath);
      if (!result.success) {
        toast.error(result.error || T.googleSignInFailed);
      }
    } catch {
      toast.error(T.unexpectedError);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Email confirmation screen
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pt-safe">
        <div className="w-full max-w-sm text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {T.checkEmailTitle}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {T.checkEmailDescription}
            </p>
            <p className="text-sm font-medium text-foreground mt-2">
              {signupEmail}
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              {T.checkEmailSpamHint}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl"
              onClick={handleResendEmail}
              disabled={isResending}
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {T.checkEmailResend}
            </Button>

            <Button
              className="w-full h-12 rounded-2xl bg-gradient-olive"
              onClick={() => {
                setShowEmailConfirmation(false);
                setIsSignUp(false);
                setPassword('');
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {T.checkEmailBackToLogin}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-safe">
      {/* Header */}
      <div className="p-6 pt-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            MASEYA
          </h1>
          <p className="text-muted-foreground mt-1">{T.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 animate-fade-in">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            {isSignUp ? T.createAccount : T.welcomeBack}
          </h2>
          <p className="text-muted-foreground">
            {isSignUp ? T.signUpDesc : T.signInDesc}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{T.email}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-12 pl-12 rounded-2xl"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{T.password}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignUp ? T.minChars : '••••••••'}
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

          {!isSignUp && (
            <div className="text-right">
              <Link to="/reset-password" className="text-sm text-primary font-medium hover:underline">
                {T.forgotPassword}
              </Link>
            </div>
          )}

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
                {T.createAccount}
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                {T.signIn}
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">{T.or}</span>
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
              {T.continueGoogle}
            </>
          )}
        </Button>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {isSignUp ? T.alreadyHaveAccount : T.dontHaveAccount}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-medium"
            disabled={isSubmitting}
          >
            {isSignUp ? T.signIn : T.signUp}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
