import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Users, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ConsentModalProps {
  onAcceptAll: () => void;
  onAcceptEssential: () => void;
}

const CONSENT_STORAGE_KEY = 'maseya_consent';

export const getStoredConsent = () => {
  const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const saveConsent = (consent: { analytics: boolean; personalization: boolean; date: string }) => {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
};

// Save consent to database for logged-in users
const saveConsentToDb = async (userId: string, analytics: boolean, personalization: boolean) => {
  try {
    await supabase
      .from('profiles')
      .update({
        consent_analytics: analytics,
        consent_personalization: personalization,
        consent_date: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error saving consent to database:', error);
  }
};

export const ConsentModal = ({ onAcceptAll, onAcceptEssential }: ConsentModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const existingConsent = getStoredConsent();
    if (!existingConsent) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = async () => {
    const consent = {
      analytics: true,
      personalization: true,
      date: new Date().toISOString(),
    };
    saveConsent(consent);
    
    // Sync to database if logged in
    if (currentUser?.id) {
      await saveConsentToDb(currentUser.id, true, true);
    }
    
    setIsOpen(false);
    onAcceptAll();
  };

  const handleAcceptEssential = async () => {
    const consent = {
      analytics: false,
      personalization: true, // Essential for app to work
      date: new Date().toISOString(),
    };
    saveConsent(consent);
    
    // Sync to database if logged in
    if (currentUser?.id) {
      await saveConsentToDb(currentUser.id, false, true);
    }
    
    setIsOpen(false);
    onAcceptEssential();
  };

  const dataUsagePoints = [
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Personalization',
      description: 'We use your profile data to recommend products and routines tailored just for you.',
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'App Improvement',
      description: 'Anonymized usage patterns help us make the app better for everyone.',
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: 'Privacy Protected',
      description: 'Your personal data is NEVER sold. No individual user is ever identifiable.',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden rounded-3xl border-0 bg-card">
        <DialogHeader className="p-6 pb-0">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-olive flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-display">
            Your Privacy Matters
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <p className="text-center text-muted-foreground text-sm">
            We collect minimal data to personalize your beauty experience. Here's what you should know:
          </p>

          {!showDetails ? (
            <button
              onClick={() => setShowDetails(true)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <span className="text-sm font-medium">Learn more about our data practices</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              {dataUsagePoints.map((point, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-secondary/30"
                >
                  <div className="text-primary mt-0.5">{point.icon}</div>
                  <div>
                    <h4 className="font-medium text-sm">{point.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 space-y-3">
            <Button
              onClick={handleAcceptAll}
              className="w-full h-14 rounded-2xl bg-gradient-olive text-lg font-medium"
            >
              <Check className="w-5 h-5 mr-2" />
              Accept All
            </Button>
            <Button
              onClick={handleAcceptEssential}
              variant="outline"
              className="w-full h-12 rounded-2xl"
            >
              Accept Essential Only
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            You can change your preferences anytime in Settings → Privacy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentModal;
