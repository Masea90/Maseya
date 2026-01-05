import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslation, TranslationKey } from '@/lib/i18n';
import { useAuth } from './AuthContext';

const getUserStorageKey = (userId: string) => `maseya-user-${userId}`;

const getStoredLanguage = (userId: string | null): Language => {
  if (!userId) return 'en';
  try {
    const stored = localStorage.getItem(getUserStorageKey(userId));
    if (stored) {
      const user = JSON.parse(stored);
      if (user.language && ['en', 'es', 'fr'].includes(user.language)) {
        return user.language;
      }
    }
  } catch (e) {
    console.warn('Failed to read language from localStorage');
  }
  return 'en';
};

const getStoredUser = (userId: string | null): Partial<UserProfile> => {
  if (!userId) return {};
  try {
    const stored = localStorage.getItem(getUserStorageKey(userId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to read user from localStorage');
  }
  return {};
};

export interface RoutineCompletion {
  morning: number[];
  night: number[];
  lastCompletedDate: string | null;
}

export interface UserProfile {
  name: string;
  skinConcerns: string[];
  hairType: string;
  hairConcerns: string[];
  goals: string[];
  isPremium: boolean;
  points: number;
  streak: number;
  // Glow score is now computed dynamically
  onboardingComplete: boolean;
  language: Language;
  routineCompletion: RoutineCompletion;
}

interface GlowScores {
  skin: number;
  hair: number;
  nutrition: number;
  overall: number;
}

interface UserContextType {
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => void;
  updateRoutineCompletion: (completion: RoutineCompletion) => void;
  glowScore: GlowScores;
}

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const createDefaultUser = (email?: string): UserProfile => ({
  name: email?.split('@')[0] || 'Guest',
  skinConcerns: [],
  hairType: '',
  hairConcerns: [],
  goals: [],
  isPremium: false,
  points: 0,
  streak: 0,
  onboardingComplete: false,
  language: 'en',
  routineCompletion: {
    morning: [],
    night: [],
    lastCompletedDate: null,
  },
});

// Calculate dynamic glow scores based on user actions
const calculateGlowScores = (user: UserProfile): GlowScores => {
  // Base scores
  let skinScore = 30;
  let hairScore = 30;
  let nutritionScore = 30;

  // Profile completion bonuses (up to +20 each)
  if (user.skinConcerns.length > 0) skinScore += 10;
  if (user.skinConcerns.length >= 2) skinScore += 10;
  if (user.hairType) hairScore += 10;
  if (user.hairConcerns.length > 0) hairScore += 10;
  if (user.goals.length > 0) nutritionScore += 10;
  if (user.goals.length >= 2) nutritionScore += 10;

  // Routine completion bonuses (up to +40 each)
  const morningSteps = user.routineCompletion?.morning?.length || 0;
  const nightSteps = user.routineCompletion?.night?.length || 0;
  
  // Skin benefits from cleansing & moisturizing (morning steps 1,2,3 and night steps 1,2,3,4)
  const skinRoutineSteps = Math.min(morningSteps, 3) + Math.min(nightSteps, 4);
  skinScore += Math.round((skinRoutineSteps / 7) * 40);

  // Hair benefits from night routine (steps 3,4 are hair-related)
  const hairRoutineSteps = nightSteps >= 3 ? 1 : 0;
  hairScore += hairRoutineSteps * 20;
  
  // Nutrition/wellness from consistency and completing full routines
  const routineCompletionRate = (morningSteps + nightSteps) / 8; // 4 morning + 4 night max
  nutritionScore += Math.round(routineCompletionRate * 30);

  // Streak bonus (up to +10 each)
  const streakBonus = Math.min(user.streak, 7) * 1.5;
  skinScore += Math.round(streakBonus);
  hairScore += Math.round(streakBonus);
  nutritionScore += Math.round(streakBonus);

  // Cap at 100
  skinScore = Math.min(100, Math.max(0, skinScore));
  hairScore = Math.min(100, Math.max(0, hairScore));
  nutritionScore = Math.min(100, Math.max(0, nutritionScore));

  const overall = Math.round((skinScore + hairScore + nutritionScore) / 3);

  return { skin: skinScore, hair: hairScore, nutrition: nutritionScore, overall };
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.id || null;

  const [user, setUser] = useState<UserProfile>(() => {
    const defaultUser = createDefaultUser(currentUser?.email);
    const storedUser = getStoredUser(userId);
    const mergedUser = { ...defaultUser, ...storedUser };
    
    // Reset routine completion if it's a new day
    if (mergedUser.routineCompletion?.lastCompletedDate !== getTodayDateString()) {
      mergedUser.routineCompletion = {
        morning: [],
        night: [],
        lastCompletedDate: null,
      };
    }
    
    return mergedUser;
  });

  // Reload user data when auth user changes
  useEffect(() => {
    const defaultUser = createDefaultUser(currentUser?.email);
    const storedUser = getStoredUser(userId);
    const mergedUser = { ...defaultUser, ...storedUser };
    
    // Reset routine completion if it's a new day
    if (mergedUser.routineCompletion?.lastCompletedDate !== getTodayDateString()) {
      mergedUser.routineCompletion = {
        morning: [],
        night: [],
        lastCompletedDate: null,
      };
    }
    
    setUser(mergedUser);
  }, [userId, currentUser?.email]);

  // Persist user data to localStorage (per user)
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(getUserStorageKey(userId), JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save user to localStorage');
    }
  }, [user, userId]);

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

  const updateRoutineCompletion = (completion: RoutineCompletion) => {
    setUser(prev => ({
      ...prev,
      routineCompletion: {
        ...completion,
        lastCompletedDate: getTodayDateString(),
      },
    }));
  };

  // Compute glow score dynamically
  const glowScore = calculateGlowScores(user);

  return (
    <UserContext.Provider value={{ 
      user, 
      updateUser, 
      completeOnboarding,
      t, 
      setLanguage,
      updateRoutineCompletion,
      glowScore,
    }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook to access user context - must be used within UserProvider
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
