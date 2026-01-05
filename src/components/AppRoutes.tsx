import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { Chatbot } from "@/components/chat/Chatbot";

// Pages
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { LanguageSelect } from "@/components/onboarding/LanguageSelect";
import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide";
import { OnboardingQuiz } from "@/components/onboarding/OnboardingQuiz";
import { PremiumScreen } from "@/components/onboarding/PremiumScreen";
import HomePage from "@/pages/HomePage";
import DiscoverPage from "@/pages/DiscoverPage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import RoutinePage from "@/pages/RoutinePage";
import RemediesPage from "@/pages/RemediesPage";
import CommunityPage from "@/pages/CommunityPage";
import ProfilePage from "@/pages/ProfilePage";
import ScanPage from "@/pages/ScanPage";
import SearchPage from "@/pages/SearchPage";
import RewardsPage from "@/pages/RewardsPage";
import LoginPage from "@/pages/LoginPage";
import LanguageSettingsPage from "@/pages/LanguageSettingsPage";
import ProfileEditPage from "@/pages/ProfileEditPage";
import NotificationSettingsPage from "@/pages/NotificationSettingsPage";
import InstallPage from "@/pages/InstallPage";
import NotFound from "@/pages/NotFound";

/**
 * AppRoutes - Contains all route definitions
 * Must be rendered inside AuthProvider and UserProvider
 */
export function AppRoutes() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { user, isLoading: userLoading } = useUser();

  // Show loading while auth or user data is being determined
  if (authLoading || userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <span className="text-3xl">🌿</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> show login
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Routes>
        {/* Onboarding - Language first, then guide (for first-time users), then welcome */}
        <Route path="/" element={user.onboardingComplete ? <Navigate to="/home" /> : <Navigate to="/onboarding/language" />} />
        <Route path="/onboarding/language" element={<LanguageSelect />} />
        <Route path="/onboarding/guide" element={<OnboardingGuide />} />
        <Route path="/onboarding/welcome" element={<WelcomeScreen />} />
        <Route path="/onboarding/quiz" element={<OnboardingQuiz />} />
        <Route path="/onboarding/premium" element={<PremiumScreen />} />
        
        {/* Main App */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/routine" element={<RoutinePage />} />
        <Route path="/remedies" element={<RemediesPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/premium" element={<PremiumScreen />} />
        <Route path="/settings/language" element={<LanguageSettingsPage />} />
        <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
        <Route path="/install" element={<InstallPage />} />
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user.onboardingComplete && <Chatbot />}
    </>
  );
}