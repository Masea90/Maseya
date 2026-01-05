import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { AppRoutes } from "@/components/AppRoutes";
import { ConsentModal } from "@/components/consent/ConsentModal";

/**
 * App - Root component with all providers
 * Provider order: QueryClient > Auth > User > Tooltip > Router
 * Updated to ensure proper context initialization
 */
function App() {
  const [queryClient] = useState(() => new QueryClient());

  const handleConsentAcceptAll = () => {
    // Consent is saved in the modal itself
    console.log('User accepted all data usage');
  };

  const handleConsentAcceptEssential = () => {
    // Consent is saved in the modal itself
    console.log('User accepted essential only');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ConsentModal 
              onAcceptAll={handleConsentAcceptAll}
              onAcceptEssential={handleConsentAcceptEssential}
            />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </UserProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;