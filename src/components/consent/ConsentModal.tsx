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

const COPY = {
  es: {
    bannerText: 'Usamos datos mínimos para personalizar tu experiencia. Sin publicidad.',
    moreInfo: 'Más info',
    accept: 'Aceptar',
    reject: 'Rechazar',
    healthConsentLabel: 'Acepto el tratamiento de mis datos de salud (alergias, tipo de piel, embarazo) para personalizar los análisis.',
    healthConsentHint: 'Sin este consentimiento la app sigue funcionando, pero solo con análisis generales (sin personalización). Puedes cambiarlo en cualquier momento.',
    privacyPolicy: 'Política de privacidad',
    savePreferences: 'Guardar mis preferencias',
  },
  en: {
    bannerText: 'We use minimal data to personalize your experience. No ads.',
    moreInfo: 'More info',
    accept: 'Accept',
    reject: 'Reject',
    healthConsentLabel: 'I agree to the processing of my health data (allergies, skin type, pregnancy) to personalize the analyses.',
    healthConsentHint: 'Without this consent the app still works, but only with general analyses (no personalization). You can change this anytime.',
    privacyPolicy: 'Privacy policy',
    savePreferences: 'Save my preferences',
  },
  fr: {
    bannerText: 'Nous utilisons un minimum de données pour personnaliser ton expérience. Sans publicité.',
    moreInfo: "Plus d'infos",
    accept: 'Accepter',
    reject: 'Refuser',
    healthConsentLabel: "J'accepte le traitement de mes données de santé (allergies, type de peau, grossesse) pour personnaliser les analyses.",
    healthConsentHint: "Sans ce consentement, l'app fonctionne toujours, mais avec des analyses générales uniquement (sans personnalisation). Tu peux changer cela à tout moment.",
    privacyPolicy: 'Politique de confidentialité',
    savePreferences: 'Enregistrer mes préférences',
  },
};

interface StoredConsent {
  analytics: boolean;
  personalization: boolean;
  health_data: boolean;
  date: string;
}

const CONSENT_STORAGE_KEY = 'maseya_consent';
/** AEPD: consent must be renewed periodically (max 24 months). We use 12. */
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
// Routes where the consent banner must NOT appear (welcome / pre-onboarding)
const HIDE_ON_ROUTES = ['/', '/welcome'];

export const getStoredConsent = (): StoredConsent | null => {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const date = parsed.date ?? '';
      // Expired consent (>12 months) counts as no consent: the banner returns.
      const ts = date ? Date.parse(date) : NaN;
      if (!Number.isFinite(ts) || Date.now() - ts > CONSENT_MAX_AGE_MS) return null;
      return {
        analytics: !!parsed.analytics,
        personalization: !!parsed.personalization,
        // Older stored consents don't have this field — treat as not consented.
        health_data: !!parsed.health_data,
        date,
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

/**
 * Sets (or withdraws) the health-data consent everywhere: localStorage + the
 * `profiles` row, and notifies listeners so open screens re-render instantly.
 * Used by the signup flow (granted with the informed notice shown next to the
 * signup button) and by the Profile screen (withdrawal, GDPR art. 7.3).
 */
export const setHealthDataConsent = async (granted: boolean, userId?: string | null) => {
  const current = getStoredConsent();
  saveConsent({
    analytics: !!current?.analytics,
    personalization: current?.personalization ?? true,
    health_data: granted,
    date: new Date().toISOString(),
  });
  if (userId) {
    await saveConsentToDb(userId, !!current?.analytics, current?.personalization ?? true, granted);
  }
  window.dispatchEvent(new Event('maseya:consent-updated'));
};

/** Removes the anonymous analytics id so nothing is tracked after a refusal. */
export const clearAnalyticsId = () => {
  try {
    localStorage.removeItem('maseya_sid');
  } catch {
    /* ignore */
  }
};

/**
 * Sets (or withdraws) the anonymous-analytics consent (AEPD: the user must be
 * able to change their choice at any time, as easily as they gave it).
 */
export const setAnalyticsConsent = async (granted: boolean, userId?: string | null) => {
  const current = getStoredConsent();
  saveConsent({
    analytics: granted,
    personalization: current?.personalization ?? true,
    health_data: !!current?.health_data,
    date: new Date().toISOString(),
  });
  if (!granted) clearAnalyticsId();
  if (userId) {
    await saveConsentToDb(userId, granted, current?.personalization ?? true, !!current?.health_data);
  }
  window.dispatchEvent(new Event('maseya:consent-updated'));
};


export const ConsentModal = ({ onAcceptEssential }: ConsentModalProps) => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // Explicit, non-premarked opt-in for health data processing.
  const [healthConsent, setHealthConsent] = useState(false);
  const { currentUser } = useAuth();
  const { t, user } = useUser();
  const c = COPY[user.language] ?? COPY.es;
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

  const persist = async (healthData: boolean, analytics: boolean) => {
    const consent: StoredConsent = {
      analytics,
      personalization: analytics,
      health_data: healthData,
      date: new Date().toISOString(),
    };
    saveConsent(consent);
    if (!analytics) clearAnalyticsId();
    if (currentUser?.id) {
      await saveConsentToDb(currentUser.id, analytics, analytics, healthData);
    }
    window.dispatchEvent(new Event('maseya:consent-updated'));
    setVisible(false);
    setShowDetails(false);
    onAcceptEssential?.();
  };

  // First layer: Reject and Accept have identical visual weight (AEPD).
  const handleReject = () => { void persist(false, false); };
  const handleQuickAccept = () => { void persist(false, true); };


  const handleDetailedAccept = () => {
    void persist(healthConsent, !!getStoredConsent()?.analytics);
  };

  if (!visible) return null;

  return (
    <>
      {/* Bottom banner */}
      <div
        role="dialog"
        aria-live="polite"
        aria-modal="false"
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+80px)] pt-2 animate-fade-in"
      >
        <div className="mx-auto max-w-lg rounded-2xl border border-border/60 bg-card/95 backdrop-blur shadow-warm-lg px-4 py-3 space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-foreground/85 leading-snug flex-1">
              {c.bannerText}
            </p>
          </div>
          {/* AEPD: reject and accept, same size, same weight, same layer. */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleReject}
              className="h-10 rounded-full border border-primary text-primary text-sm font-semibold"
            >
              {c.reject}
            </button>
            <button
              onClick={handleQuickAccept}
              className="h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              {c.accept}
            </button>
          </div>
          <button
            onClick={() => setShowDetails(true)}
            className="w-full text-xs font-medium text-muted-foreground underline underline-offset-2"
          >
            {c.moreInfo}
          </button>
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
                      {c.healthConsentLabel}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      {c.healthConsentHint}{' '}
                      <a
                        href="/privacy"
                        className="underline underline-offset-2"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {c.privacyPolicy}
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
              {c.savePreferences}
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
