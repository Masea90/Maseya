import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslation, TranslationKey } from '@/lib/i18n';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Slim user profile for the scanner pivot.
 * Detailed health attributes live in `health_profiles` and are loaded by feature hooks.
 */
export interface UserProfile {
  name: string;
  nickname: string;
  language: Language;
  onboardingComplete: boolean;
  avatarUrl: string | null;
  consentAnalytics: boolean;
  consentPersonalization: boolean;
  consentDate: string | null;
}

interface UserContextType {
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => void;
  isLoading: boolean;
}

const getStoredLanguage = (): Language => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('maseya_language') : null;
  if (stored === 'en' || stored === 'es' || stored === 'fr') return stored;
  return 'es'; // default Spanish
};

const createDefaultUser = (email?: string): UserProfile => ({
  name: email?.split('@')[0] || 'Guest',
  nickname: '',
  language: getStoredLanguage(),
  onboardingComplete: false,
  avatarUrl: null,
  consentAnalytics: false,
  consentPersonalization: false,
  consentDate: null,
});

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const userId = currentUser?.id || null;

  const [user, setUser] = useState<UserProfile>(() => createDefaultUser(currentUser?.email));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setUser(createDefaultUser());
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname, avatar_url, language, onboarding_complete, consent_analytics, consent_personalization, consent_date')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile:', error);
          setUser(createDefaultUser(currentUser?.email));
        } else if (data) {
          setUser({
            name: currentUser?.email?.split('@')[0] || 'Guest',
            nickname: data.nickname || '',
            language: (data.language as Language) || getStoredLanguage(),
            onboardingComplete: data.onboarding_complete || false,
            avatarUrl: data.avatar_url || null,
            consentAnalytics: data.consent_analytics || false,
            consentPersonalization: data.consent_personalization || false,
            consentDate: data.consent_date || null,
          });
        } else {
          setUser(createDefaultUser(currentUser?.email));
        }
      } catch (e) {
        console.error('Error loading profile:', e);
        setUser(createDefaultUser(currentUser?.email));
      }
      setIsLoading(false);
    };
    if (!authLoading) loadProfile();
  }, [userId, currentUser?.email, authLoading]);

  const saveProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname;
    if (updates.language !== undefined) dbUpdates.language = updates.language;
    if (updates.onboardingComplete !== undefined) dbUpdates.onboarding_complete = updates.onboardingComplete;
    if (updates.consentAnalytics !== undefined) dbUpdates.consent_analytics = updates.consentAnalytics;
    if (updates.consentPersonalization !== undefined) dbUpdates.consent_personalization = updates.consentPersonalization;
    if (updates.consentDate !== undefined) dbUpdates.consent_date = updates.consentDate;
    if (Object.keys(dbUpdates).length === 0) return;
    const { error } = await supabase.from('profiles').update(dbUpdates).eq('user_id', userId);
    if (error) console.error('Error saving profile:', error);
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updates }));
    saveProfile(updates);
  };

  const completeOnboarding = () => updateUser({ onboardingComplete: true });

  const t = (key: TranslationKey): string => getTranslation(user.language, key);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('maseya_language', lang);
    updateUser({ language: lang });
  };

  return (
    <UserContext.Provider value={{
      user,
      updateUser,
      completeOnboarding,
      t,
      setLanguage,
      isLoading: isLoading || authLoading,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};
