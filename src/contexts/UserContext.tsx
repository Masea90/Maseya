import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslation, TranslationKey } from '@/lib/i18n';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface RoutineCompletion {
  morning: number[];
  night: number[];
  lastCompletedDate: string | null;
}

export interface UserProfile {
  name: string;
  nickname: string;
  skinConcerns: string[];
  hairType: string;
  hairConcerns: string[];
  goals: string[];
  isPremium: boolean;
  points: number;
  streak: number;
  onboardingComplete: boolean;
  guideCompleted: boolean;
  language: Language;
  routineCompletion: RoutineCompletion;
  // Privacy-safe insight fields
  ageRange: string;
  avatarUrl: string | null;
  sensitivities: string[];
  country: string;
  climateType: string;
  // Completeness tracking
  emailConfirmed: boolean;
  hasProfilePhoto: boolean;
  firstRoutineCompleted: boolean;
  // Consent tracking
  consentAnalytics: boolean;
  consentPersonalization: boolean;
  consentDate: string | null;
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
  setGuideCompleted: (completed: boolean) => void;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => void;
  updateRoutineCompletion: (completion: RoutineCompletion) => void;
  glowScore: GlowScores;
  isLoading: boolean;
}

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const createDefaultUser = (email?: string): UserProfile => ({
  name: email?.split('@')[0] || 'Guest',
  nickname: '',
  skinConcerns: [],
  hairType: '',
  hairConcerns: [],
  goals: [],
  isPremium: false,
  points: 0,
  streak: 0,
  onboardingComplete: false,
  guideCompleted: false,
  language: 'en',
  routineCompletion: {
    morning: [],
    night: [],
    lastCompletedDate: null,
  },
  // Privacy-safe insight fields
  ageRange: '',
  avatarUrl: null,
  sensitivities: [],
  country: '',
  climateType: '',
  // Completeness tracking
  emailConfirmed: false,
  hasProfilePhoto: false,
  firstRoutineCompleted: false,
  // Consent tracking
  consentAnalytics: false,
  consentPersonalization: false,
  consentDate: null,
});

// Calculate dynamic glow scores based on user actions
const calculateGlowScores = (user: UserProfile): GlowScores => {
  let skinScore = 30;
  let hairScore = 30;
  let nutritionScore = 30;

  if (user.skinConcerns.length > 0) skinScore += 10;
  if (user.skinConcerns.length >= 2) skinScore += 10;
  if (user.hairType) hairScore += 10;
  if (user.hairConcerns.length > 0) hairScore += 10;
  if (user.goals.length > 0) nutritionScore += 10;
  if (user.goals.length >= 2) nutritionScore += 10;

  const morningSteps = user.routineCompletion?.morning?.length || 0;
  const nightSteps = user.routineCompletion?.night?.length || 0;
  
  const skinRoutineSteps = Math.min(morningSteps, 3) + Math.min(nightSteps, 4);
  skinScore += Math.round((skinRoutineSteps / 7) * 40);

  const hairRoutineSteps = nightSteps >= 3 ? 1 : 0;
  hairScore += hairRoutineSteps * 20;
  
  const routineCompletionRate = (morningSteps + nightSteps) / 8;
  nutritionScore += Math.round(routineCompletionRate * 30);

  const streakBonus = Math.min(user.streak, 7) * 1.5;
  skinScore += Math.round(streakBonus);
  hairScore += Math.round(streakBonus);
  nutritionScore += Math.round(streakBonus);

  skinScore = Math.min(100, Math.max(0, skinScore));
  hairScore = Math.min(100, Math.max(0, hairScore));
  nutritionScore = Math.min(100, Math.max(0, nutritionScore));

  const overall = Math.round((skinScore + hairScore + nutritionScore) / 3);

  return { skin: skinScore, hair: hairScore, nutrition: nutritionScore, overall };
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const userId = currentUser?.id || null;

  const [user, setUser] = useState<UserProfile>(() => createDefaultUser(currentUser?.email));
  const [isLoading, setIsLoading] = useState(true);

  // Load profile from database when user logs in
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
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile:', error);
          setUser(createDefaultUser(currentUser?.email));
        } else if (data) {
          // Map database fields to UserProfile
          const profile: UserProfile = {
            name: currentUser?.email?.split('@')[0] || 'Guest',
            nickname: data.nickname || '',
            skinConcerns: data.skin_concerns || [],
            hairType: data.hair_type || '',
            hairConcerns: data.hair_concerns || [],
            goals: data.goals || [],
            isPremium: data.is_premium || false,
            points: data.points || 0,
            streak: data.streak || 0,
            onboardingComplete: data.onboarding_complete || false,
            guideCompleted: data.guide_completed || false,
            language: (data.language as Language) || 'en',
            routineCompletion: {
              morning: [],
              night: [],
              lastCompletedDate: null,
            },
            // Privacy-safe insight fields
            ageRange: (data as Record<string, unknown>).age_range as string || '',
            avatarUrl: (data as Record<string, unknown>).avatar_url as string || null,
            sensitivities: (data as Record<string, unknown>).sensitivities as string[] || [],
            country: (data as Record<string, unknown>).country as string || '',
            climateType: (data as Record<string, unknown>).climate_type as string || '',
            // Completeness tracking
            emailConfirmed: (data as Record<string, unknown>).email_confirmed as boolean || false,
            hasProfilePhoto: (data as Record<string, unknown>).has_profile_photo as boolean || false,
            firstRoutineCompleted: (data as Record<string, unknown>).first_routine_completed as boolean || false,
            // Consent tracking
            consentAnalytics: (data as Record<string, unknown>).consent_analytics as boolean || false,
            consentPersonalization: (data as Record<string, unknown>).consent_personalization as boolean || false,
            consentDate: (data as Record<string, unknown>).consent_date as string || null,
          };
          setUser(profile);
        } else {
          // No profile found, create one
          setUser(createDefaultUser(currentUser?.email));
        }
      } catch (e) {
        console.error('Error loading profile:', e);
        setUser(createDefaultUser(currentUser?.email));
      }
      
      setIsLoading(false);
    };

    if (!authLoading) {
      loadProfile();
    }
  }, [userId, currentUser?.email, authLoading]);

  // Save profile to database when it changes
  const saveProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) return;

    try {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname;
      if (updates.skinConcerns !== undefined) dbUpdates.skin_concerns = updates.skinConcerns;
      if (updates.hairType !== undefined) dbUpdates.hair_type = updates.hairType;
      if (updates.hairConcerns !== undefined) dbUpdates.hair_concerns = updates.hairConcerns;
      if (updates.goals !== undefined) dbUpdates.goals = updates.goals;
      if (updates.isPremium !== undefined) dbUpdates.is_premium = updates.isPremium;
      if (updates.points !== undefined) dbUpdates.points = updates.points;
      if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
      if (updates.onboardingComplete !== undefined) dbUpdates.onboarding_complete = updates.onboardingComplete;
      if (updates.guideCompleted !== undefined) dbUpdates.guide_completed = updates.guideCompleted;
      if (updates.language !== undefined) dbUpdates.language = updates.language;
      // Privacy-safe insight fields
      if (updates.ageRange !== undefined) dbUpdates.age_range = updates.ageRange;
      if (updates.sensitivities !== undefined) dbUpdates.sensitivities = updates.sensitivities;
      if (updates.country !== undefined) dbUpdates.country = updates.country;
      if (updates.climateType !== undefined) dbUpdates.climate_type = updates.climateType;
      // Completeness tracking
      if (updates.emailConfirmed !== undefined) dbUpdates.email_confirmed = updates.emailConfirmed;
      if (updates.hasProfilePhoto !== undefined) dbUpdates.has_profile_photo = updates.hasProfilePhoto;
      if (updates.firstRoutineCompleted !== undefined) dbUpdates.first_routine_completed = updates.firstRoutineCompleted;
      // Consent tracking
      if (updates.consentAnalytics !== undefined) dbUpdates.consent_analytics = updates.consentAnalytics;
      if (updates.consentPersonalization !== undefined) dbUpdates.consent_personalization = updates.consentPersonalization;
      if (updates.consentDate !== undefined) dbUpdates.consent_date = updates.consentDate;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(dbUpdates)
          .eq('user_id', userId);

        if (error) {
          console.error('Error saving profile:', error);
        }
      }
    } catch (e) {
      console.error('Error saving profile:', e);
    }
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updates }));
    saveProfile(updates);
  };

  const completeOnboarding = () => {
    updateUser({ onboardingComplete: true });
  };

  const setGuideCompleted = (completed: boolean) => {
    updateUser({ guideCompleted: completed });
  };

  const t = (key: TranslationKey): string => {
    return getTranslation(user.language, key);
  };

  const setLanguage = (lang: Language) => {
    updateUser({ language: lang });
  };

  const updateRoutineCompletion = (completion: RoutineCompletion) => {
    setUser(prev => ({
      ...prev,
      routineCompletion: {
        ...completion,
        lastCompletedDate: getTodayDateString(),
      },
    }));
    // Note: Routine completion is not persisted to DB yet (could be added later)
  };

  const glowScore = calculateGlowScores(user);

  return (
    <UserContext.Provider value={{ 
      user, 
      updateUser, 
      completeOnboarding,
      setGuideCompleted,
      t, 
      setLanguage,
      updateRoutineCompletion,
      glowScore,
      isLoading: isLoading || authLoading,
    }}>
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
