import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';

import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { OnboardingQuiz } from '@/components/onboarding/OnboardingQuiz';
import { LanguageSelect } from '@/components/onboarding/LanguageSelect';

import ScannerPage from '@/pages/ScannerPage';
import HistoryPage from '@/pages/HistoryPage';
import ProfilePage from '@/pages/ProfilePage';
import MiraPage from '@/pages/MiraPage';

import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import UpdatePasswordPage from '@/pages/UpdatePasswordPage';
import NotFound from '@/pages/NotFound';

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
 * Gate that forces /welcome → /onboarding/quiz before any scanner feature
 * can be reached. Applies to both anonymous and authenticated users.
 */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const location = useLocation();
  const localDone = hasLocalOnboarding();
  const dbDone = user.onboardingComplete;
  const done = localDone && dbDone;

  const allowed = ['/welcome', '/onboarding/quiz', '/onboarding/language', '/update-password', '/login'];
  if (!done && !allowed.includes(location.pathname)) {
    return <Navigate to="/welcome" replace />;
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

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/onboarding/quiz" element={<OnboardingQuiz />} />
        <Route path="/onboarding/language" element={<LanguageSelect />} />
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    );
  }

  return (
    <OnboardingGate>
      <Routes>
        <Route path="/" element={<Navigate to={hasLocalOnboarding() ? '/scan' : '/welcome'} replace />} />
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/onboarding/language" element={<LanguageSelect />} />
        <Route path="/onboarding/quiz" element={<OnboardingQuiz />} />

        <Route path="/scan" element={<ScannerPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/mira" element={<MiraPage />} />

        <Route path="/update-password" element={<UpdatePasswordPage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </OnboardingGate>
  );
}
