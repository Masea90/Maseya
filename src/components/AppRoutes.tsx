import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { OnboardingQuiz } from '@/components/onboarding/OnboardingQuiz';
import { LanguageSelect } from '@/components/onboarding/LanguageSelect';

import ScannerPage from '@/pages/ScannerPage';
import PhotoCapturePage from '@/pages/PhotoCapturePage';
import ResultPage from '@/pages/ResultPage';
import HistoryPage from '@/pages/HistoryPage';
import ProfilePage from '@/pages/ProfilePage';
import MiraPage from '@/pages/MiraPage';
import PremiumPage from '@/pages/PremiumPage';

import LoginPage from '@/pages/LoginPage';
import AdminPage from '@/pages/AdminPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import UpdatePasswordPage from '@/pages/UpdatePasswordPage';
import NotFound from '@/pages/NotFound';
import OAuthConsentPage from '@/pages/OAuthConsentPage';
import PrivacyPage from '@/pages/PrivacyPage';

const ONBOARDING_KEY = 'maseya_onboarding';

const hasLocalOnboarding = (): boolean => {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.skin) && parsed.skin.length > 0;
  } catch {
    return false;
  }
};

/**
 * Routing rules for onboarding:
 *   1. Auth + health_profiles row → straight to /scan (skip welcome + quiz)
 *   2. Auth + no health_profiles  → /onboarding/quiz (skip welcome)
 *   3. Anonymous + localStorage   → straight to /scan
 *   4. Otherwise                  → /welcome
 *
 * For authenticated users we also hydrate localStorage from health_profiles
 * so cross-device personalization works on first load.
 */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const userId = currentUser?.id ?? null;

  // null = unknown (still checking), true/false = result
  const [hasHealthProfile, setHasHealthProfile] = useState<boolean | null>(
    userId ? null : false,
  );

  useEffect(() => {
    if (!userId) {
      setHasHealthProfile(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('health_profiles')
        .select('skin_type, allergies')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('[OnboardingGate] health_profiles read error', error);
        setHasHealthProfile(false);
        return;
      }
      const exists = !!data;
      setHasHealthProfile(exists);
      // Hydrate localStorage so the rest of the app (scoring, etc.) works cross-device.
      if (exists && !hasLocalOnboarding()) {
        try {
          localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
            skin: data?.skin_type ?? [],
            allergies: data?.allergies ?? [],
          }));
        } catch (e) {
          console.error('[OnboardingGate] hydrate localStorage failed', e);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Wait for the DB check before deciding for authenticated users.
  if (userId && hasHealthProfile === null) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 animate-pulse" />
      </div>
    );
  }

  const onboardingDone = userId ? hasHealthProfile === true : hasLocalOnboarding();
  const path = location.pathname;

  // Authenticated user without a health profile → force quiz (skip welcome).
  if (userId && !onboardingDone) {
    const allowedForQuiz = ['/onboarding/quiz', '/onboarding/language', '/update-password', '/admin', '/privacy'];
    if (!allowedForQuiz.includes(path)) {
      return <Navigate to="/onboarding/quiz" replace />;
    }
    return <>{children}</>;
  }

  // Anonymous user without onboarding → welcome flow.
  if (!userId && !onboardingDone) {
    const allowed = ['/welcome', '/onboarding/quiz', '/onboarding/language', '/update-password', '/login', '/reset-password', '/privacy'];
    if (!allowed.includes(path)) {
      return <Navigate to="/welcome" replace />;
    }
    return <>{children}</>;
  }

  // Onboarding done → never show welcome/quiz again.
  if (onboardingDone && (path === '/welcome' || path === '/onboarding/quiz')) {
    return <Navigate to="/scan" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoading: userLoading } = useUser();

  if (authLoading || userLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <span className="text-3xl">🌿</span>
          </div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // OAuth consent must bypass the onboarding gate so it can render for any signed-in
  // user (and redirect anonymous users to /login with a `next` back to this URL).
  if (typeof window !== 'undefined' && window.location.pathname === '/.lovable/oauth/consent') {
    return (
      <Routes>
        <Route path="/.lovable/oauth/consent" element={<OAuthConsentPage />} />
      </Routes>
    );
  }


  if (!isAuthenticated) {
    return (
      <OnboardingGate>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/welcome" element={<WelcomeScreen />} />
          <Route path="/onboarding/quiz" element={<OnboardingQuiz />} />
          <Route path="/onboarding/language" element={<LanguageSelect />} />
          <Route path="/scan" element={<ScannerPage />} />
          <Route path="/scan/photo" element={<PhotoCapturePage />} />
          <Route path="/result/:barcode" element={<ResultPage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/history" element={<Navigate to="/login" replace />} />
          <Route path="/profile" element={<Navigate to="/login" replace />} />
          <Route path="/mira" element={<Navigate to="/login" replace />} />
          <Route path="/admin" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </OnboardingGate>
    );
  }

  return (
    <OnboardingGate>
      <Routes>
        <Route path="/" element={<Navigate to="/scan" replace />} />
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/onboarding/language" element={<LanguageSelect />} />
        <Route path="/onboarding/quiz" element={<OnboardingQuiz />} />

        <Route path="/scan" element={<ScannerPage />} />
        <Route path="/scan/photo" element={<PhotoCapturePage />} />
        <Route path="/result/:barcode" element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/mira" element={<MiraPage />} />
        <Route path="/premium" element={<PremiumPage />} />
        <Route path="/admin" element={<AdminPage />} />

        <Route path="/update-password" element={<UpdatePasswordPage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </OnboardingGate>
  );
}
