import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, Lock, Users, HeartPulse } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

interface ConsentModalProps {
  onAcceptAll?: () => void;
  onAcceptEssential?: () => void;
}

interface StoredConsent {
  analytics: boolean;
  personalization: boolean;
  health_data: boolean;
  date: string;
}

const CONSENT_STORAGE_KEY = 'maseya_consent';
// Routes where the consent banner must NOT appear (welcome / pre-onboarding)
const HIDE_ON_ROUTES = ['/', '/welcome'];

export const getStoredConsent = (): StoredConsent | null => {
  const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return {
        analytics: !!parsed.analytics,
        personalization: !!parsed.personalization,
        // Older stored consents don't have this field — treat as not consented.
        health_data: !!parsed.health_data,
        date: parsed.date ?? '',
      };
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Convenience for feature code: only true when the user has explicitly consented
 * to the processing of health data (allergies, skin type, pregnancy) for
 * personalized analysis. Without it, the app must fall back to non-personalized
 * (general) analysis only.
 */
export const hasHealthDataConsent = (): boolean => {
  return !!getStoredConsent()?.health_data;
};

export const saveConsent = (consent: StoredConsent) => {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
};

const saveConsentToDb = async (
  userId: string,
  analytics: boolean,
  personalization: boolean,
  healthData: boolean,
) => {
  try {
    await supabase
      .from('profiles')
      .update({
        consent_analytics: analytics,
        consent_personalization: personalization,
        consent_health_data: healthData,
        consent_date: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } catch (error) {
    console.error('Error saving consent to database:', error);
  }
};

export const ConsentModal = ({ onAcceptEssential }: ConsentModalProps) => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // Explicit, non-premarked opt-in for health data processing.
  const [healthConsent, setHealthConsent] = useState(false);
  const { currentUser } = useAuth();
  const { t } = useUser();
  const location = useLocation();

  useEffect(() => {
    if (HIDE_ON_ROUTES.includes(location.pathname)) {
      setVisible(false);
      return;
    }
    const existingConsent = getStoredConsent();
    if (!existingConsent) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const persist = async (healthData: boolean) => {
    const consent: StoredConsent = {
      analytics: false,
      personalization: true,
      health_data: healthData,
      date: new Date().toISOString(),
    };
    saveConsent(consent);
    if (currentUser?.id) {
      await saveConsentToDb(currentUser.id, false, true, healthData);
    }
    setVisible(false);
    setShowDetails(false);
    onAcceptEssential?.();
  };

  const handleQuickAccept = () => {
    // Banner "Aceptar" = essentials only, health data NOT consented.
    // Users must open details to opt in explicitly.
    void persist(false);
  };

  const handleDetailedAccept = () => {
    void persist(healthConsent);
  };

  if (!visible) return null;

  return (
    <>
      {/* Bottom banner */}
      <div
        role="dialog"
        aria-live="polite"
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 animate-fade-in"
      >
        <div className="mx-auto max-w-lg rounded-2xl border border-border/60 bg-card/95 backdrop-blur shadow-warm-lg px-4 py-3 flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary shrink-0" aria-hidden />
          <p className="text-xs text-foreground/85 leading-snug flex-1">
            Usamos datos mínimos para personalizar tu experiencia. Sin publicidad.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDetails(true)}
              className="text-xs font-medium text-muted-foreground underline underline-offset-2"
            >
              Más info
            </button>
            <button
              onClick={handleQuickAccept}
              className="text-xs font-semibold text-primary-foreground bg-primary rounded-full px-3 py-1.5"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>

      {/* Detailed dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md mx-auto p-0 overflow-hidden rounded-3xl border-0 bg-card">
          <DialogHeader className="p-6 pb-2">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-olive flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg font-display">
              {t('consentTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/30">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{t('consentPersonalizationTitle')}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t('consentPersonalizationDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/30">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{t('consentImprovementTitle')}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t('consentImprovementDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/30">
              <Lock className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">{t('consentPrivacyTitle')}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t('consentPrivacyDesc')}</p>
              </div>
            </div>

            {/* Explicit, non-premarked opt-in for health data (GDPR art. 9) */}
            <label
              htmlFor="consent-health-data"
              className="flex items-start gap-3 p-3 rounded-2xl border-2 border-primary/30 bg-primary/5 cursor-pointer"
            >
              <HeartPulse className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="consent-health-data"
                    checked={healthConsent}
                    onCheckedChange={(v) => setHealthConsent(v === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground leading-snug">
                      Acepto el tratamiento de mis datos de salud (alergias, tipo de piel, embarazo) para personalizar los análisis.
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      Sin este consentimiento la app sigue funcionando, pero solo con análisis generales (sin personalización). Puedes cambiarlo en cualquier momento.{' '}
                      <a
                        href="/privacy"
                        className="underline underline-offset-2"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Política de privacidad
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </label>

            <button
              onClick={handleDetailedAccept}
              className="w-full h-12 rounded-2xl bg-gradient-olive text-primary-foreground font-medium"
            >
              Guardar mis preferencias
            </button>
            <p className="text-center text-xs text-muted-foreground">
              {t('consentChangeAnytime')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConsentModal;
