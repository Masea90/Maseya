// Auth context with Supabase authentication
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { getStoredConsent, saveConsent, setHealthDataConsent } from '@/components/consent/ConsentModal';


export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  emailConfirmedAt: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** False while the health-data consent state is still being resolved from the DB. */
  consentReady: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: 'already_registered' }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Set when a signup is completed, so the very next session grants consent. */
export const SIGNUP_CONSENT_FLAG = 'maseya_signup_consent';
/** A brand-new account: signing up counts as the consent moment. */
const FRESH_ACCOUNT_MS = 15 * 60 * 1000;

const hasPendingSignupConsent = (): boolean => {
  try {
    return localStorage.getItem(SIGNUP_CONSENT_FLAG) === '1';
  } catch {
    return false;
  }
};

const clearPendingSignupConsent = () => {
  try {
    localStorage.removeItem(SIGNUP_CONSENT_FLAG);
  } catch {
    /* ignore */
  }
};

/**
 * Resolves the health-data consent for a signed-in user.
 *  - DB says granted → mirror it locally (new device / incognito).
 *  - Never decided yet AND the account was just created (or this tab just
 *    completed a signup) → grant it: the informed notice is shown at signup,
 *    so no extra "activate personalization" click is required.
 *  - Withdrawn (consent_date set, health_data false) → left untouched.
 */
async function syncConsentFromDb(userId: string, accountCreatedAt?: string | null) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('consent_analytics, consent_personalization, consent_health_data, consent_date')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return;
    const stored = getStoredConsent();

    if (data.consent_health_data) {
      if (!stored?.health_data) {
        saveConsent({
          analytics: !!data.consent_analytics,
          personalization: data.consent_personalization ?? true,
          health_data: true,
          date: data.consent_date || new Date().toISOString(),
        });
        window.dispatchEvent(new Event('maseya:consent-updated'));
      }
      clearPendingSignupConsent();
      return;
    }

    const neverDecided = !data.consent_date;
    const createdMs = accountCreatedAt ? Date.parse(accountCreatedAt) : NaN;
    const freshAccount = Number.isFinite(createdMs) && Date.now() - createdMs < FRESH_ACCOUNT_MS;
    if (neverDecided && (hasPendingSignupConsent() || freshAccount)) {
      await setHealthDataConsent(true, userId);
      clearPendingSignupConsent();
    }
  } catch (e) {
    console.error('[auth] consent sync failed', e);
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Anonymous users have nothing to resolve; signed-in users must not see the
  // lock until the DB consent state is known (race condition on first scan).
  const [consentReady, setConsentReady] = useState(false);

  useEffect(() => {
    const resolveConsent = (s: Session | null) => {
      if (!s?.user?.id) {
        setConsentReady(true);
        return;
      }
      setConsentReady(false);
      void syncConsentFromDb(s.user.id, s.user.created_at).finally(() => setConsentReady(true));
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        // Defer DB reads (Supabase recommends not calling await inside the callback)
        setTimeout(() => resolveConsent(session), 0);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      resolveConsent(session);
    });

    return () => subscription.unsubscribe();
  }, []);


  const currentUser: AuthUser | null = user ? {
    id: user.id,
    email: user.email || '',
    createdAt: user.created_at,
    emailConfirmedAt: user.email_confirmed_at || null,
  } : null;


  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.toLowerCase().trim();
    
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Invalid email or password' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string; code?: 'already_registered' }> => {
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    // Validate password length
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { success: false, code: 'already_registered', error: 'An account with this email already exists' };
      }
      return { success: false, error: error.message };
    }

    // Supabase anti-enumeration: existing email returns success with empty identities array.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { success: false, code: 'already_registered', error: 'An account with this email already exists' };
    }

    if (error) {
      if (error.message.includes('already registered')) {
        return { success: false, error: 'An account with this email already exists' };
      }
      return { success: false, error: error.message };
    }

    // Signup completed: the informed notice is shown next to the signup button,
    // so personalization is enabled from the first session — no extra click.
    try { localStorage.setItem(SIGNUP_CONSENT_FLAG, '1'); } catch { /* ignore */ }
    if (data.session?.user?.id) {
      await setHealthDataConsent(true, data.session.user.id);
      clearPendingSignupConsent();
    }

    return { success: true };
  };

  const signInWithGoogle = async (redirectPath?: string, isSignUp = false): Promise<{ success: boolean; error?: string }> => {
    const safe = redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : '/';
    const redirectUrl = `${window.location.origin}${safe}`;

    // Google signup and login share one button; a brand-new account is detected
    // on return via `user.created_at` (see syncConsentFromDb).
    if (isSignUp) {
      try { localStorage.setItem(SIGNUP_CONSENT_FLAG, '1'); } catch { /* ignore */ }
    }

    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: redirectUrl,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  };


  const logout = async () => {
    // Purga de datos derivados del perfil autenticado (RGPD): alergias/condiciones
    // de piel copiadas a localStorage, consentimiento de datos de salud sincronizado
    // desde la DB y cachés de alternativas calculadas con ese perfil.
    // No borra: idioma elegido, 'maseya_sid' (analítica anónima), 'maseya_scan_tip_seen',
    // preferencias de instalación.
    try {
      localStorage.removeItem('maseya_onboarding');
      localStorage.removeItem('maseya_onboarding_skipped');
      localStorage.removeItem('maseya_consent');
      localStorage.removeItem(SIGNUP_CONSENT_FLAG);

    } catch (e) {
      console.error('[auth] failed to clear profile keys on logout', e);
    }
    try {
      const altsKeys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('maseya_alts_')) altsKeys.push(k);
      }
      altsKeys.forEach((k) => sessionStorage.removeItem(k));
    } catch (e) {
      console.error('[auth] failed to clear alternatives cache on logout', e);
    }
    await supabase.auth.signOut({ scope: 'local' });
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      session,
      isAuthenticated: !!user,
      isLoading,
      consentReady,
      login,
      signUp,
      signInWithGoogle,
      logout,
    }}>

      signUp,
      signInWithGoogle,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
