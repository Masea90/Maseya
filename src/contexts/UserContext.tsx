import React, { createContext, useContext, useState, ReactNode } from 'react';

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
}

interface UserContextType {
  user: UserProfile;
  updateUser: (updates: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
}

const defaultUser: UserProfile = {
  name: 'Sarah',
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
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const completeOnboarding = () => {
    setUser(prev => ({ ...prev, onboardingComplete: true }));
  };

  return (
    <UserContext.Provider value={{ user, updateUser, completeOnboarding }}>
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
