import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const AUTH_STORAGE_KEY = 'maseya-auth';
const USERS_STORAGE_KEY = 'maseya-users';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthState {
  currentUserId: string | null;
  users: AuthUser[];
}

interface AuthContextType {
  currentUser: AuthUser | null;
  allUsers: AuthUser[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signUp: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  switchAccount: () => void;
}

const getStoredAuth = (): AuthState => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to read auth from localStorage');
  }
  return { currentUserId: null, users: [] };
};

const getStoredPasswords = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to read users from localStorage');
  }
  return {};
};

const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>(getStoredAuth);
  const [passwords, setPasswords] = useState<Record<string, string>>(getStoredPasswords);

  // Persist auth state
  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
    } catch (e) {
      console.warn('Failed to save auth to localStorage');
    }
  }, [authState]);

  // Persist passwords (in real app, this would be hashed on backend)
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(passwords));
    } catch (e) {
      console.warn('Failed to save users to localStorage');
    }
  }, [passwords]);

  const currentUser = authState.users.find(u => u.id === authState.currentUserId) || null;

  const login = (email: string, password: string): { success: boolean; error?: string } => {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user exists
    const existingUser = authState.users.find(u => u.email === normalizedEmail);
    if (!existingUser) {
      return { success: false, error: 'No account found with this email' };
    }

    // Check password
    if (passwords[existingUser.id] !== password) {
      return { success: false, error: 'Incorrect password' };
    }

    // Login successful
    setAuthState(prev => ({ ...prev, currentUserId: existingUser.id }));
    return { success: true };
  };

  const signUp = (email: string, password: string): { success: boolean; error?: string } => {
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    // Validate password length
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Check if email already exists
    const existingUser = authState.users.find(u => u.email === normalizedEmail);
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // Create new user
    const newUser: AuthUser = {
      id: generateUserId(),
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
    };

    setPasswords(prev => ({ ...prev, [newUser.id]: password }));
    setAuthState(prev => ({
      currentUserId: newUser.id,
      users: [...prev.users, newUser],
    }));

    return { success: true };
  };

  const logout = () => {
    setAuthState(prev => ({ ...prev, currentUserId: null }));
  };

  const switchAccount = () => {
    // Just logout - user can then login with different account
    logout();
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      allUsers: authState.users,
      isAuthenticated: !!currentUser,
      login,
      signUp,
      logout,
      switchAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
