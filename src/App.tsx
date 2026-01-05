import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { Chatbot } from "@/components/chat/Chatbot";

// Pages
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user } = useUser();

  return (
    <>
      <Routes>
        {/* Onboarding */}
        <Route path="/" element={user.onboardingComplete ? <Navigate to="/home" /> : <WelcomeScreen />} />
        <Route path="/onboarding/quiz" element={<OnboardingQuiz />} />
        <Route path="/onboarding/premium" element={<PremiumScreen />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Main App */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/routine" element={<RoutinePage />} />
        <Route path="/remedies" element={<RemediesPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/premium" element={<PremiumScreen />} />
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user.onboardingComplete && <Chatbot />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
