import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';
import { AppRoutes } from '@/components/AppRoutes';
import { ConsentModal } from '@/components/consent/ConsentModal';
import { AutoUpdater } from '@/components/AutoUpdater';
import { trackAppOpen } from '@/lib/analytics';

function App() {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => { trackAppOpen(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AutoUpdater />
              <ConsentModal onAcceptAll={() => {}} onAcceptEssential={() => {}} />
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </UserProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
