import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslation, TranslationKey } from '@/lib/i18n';

const LANGUAGE_STORAGE_KEY = 'maseya-language';
const USER_STORAGE_KEY = 'maseya-user';

const getStoredLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && ['en', 'es', 'fr'].includes(stored)) {
      return stored as Language;
    }
  } catch (e) {
    console.warn('Failed to read language from localStorage');
  }
  return 'en';
};

const getStoredUser = (): Partial<UserProfile> => {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to read user from localStorage');
  }
  return {};
};

export interface UserProfile {
  name: string;
  skinConcerns: string[];
  hairType: string;
  hairConcerns: string[];
  goals: string[];
  isPremium: boolean;
  points: number;
  streak: number;
  glowScore: {
    skin: number;
    hair: number;
    nutrition: number;
  };
  onboardingComplete: boolean;
  language: Language;
}

interface UserContextType {
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => void;
}

const createDefaultUser = (): UserProfile => ({
  name: 'Asmae',
  skinConcerns: [],
  hairType: '',
  hairConcerns: [],
  goals: [],
  isPremium: false,
  points: 245,
  streak: 5,
  glowScore: {
    skin: 78,
    hair: 85,
    nutrition: 62,
  },
  onboardingComplete: false,
  language: getStoredLanguage(),
});

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    const defaultUser = createDefaultUser();
    const storedUser = getStoredUser();
    return { ...defaultUser, ...storedUser };
  });

  // Persist user data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(LANGUAGE_STORAGE_KEY, user.language);
    } catch (e) {
      console.warn('Failed to save user to localStorage');
    }
  }, [user]);

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const completeOnboarding = () => {
    setUser(prev => ({ ...prev, onboardingComplete: true }));
  };

  const t = (key: TranslationKey): string => {
    return getTranslation(user.language, key);
  };

  const setLanguage = (lang: Language) => {
    setUser(prev => ({ ...prev, language: lang }));
  };

  return (
    <UserContext.Provider value={{ user, updateUser, completeOnboarding, t, setLanguage }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
