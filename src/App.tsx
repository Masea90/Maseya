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
import { trackAppOpen, track } from '@/lib/analytics';

function App() {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    trackAppOpen();
    // Opened from a weekly tip notification (marker added by the service worker).
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('src') === 'push') {
        track('push_clicked', { path: window.location.pathname });
        params.delete('src');
        const qs = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
      }
    } catch { /* ignore */ }
  }, []);

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
