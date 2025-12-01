import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Household } from '../types';
import { authAPI, householdAPI } from '../services';

interface AuthContextType {
  user: User | null;
  household: Household | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (inviteCode: string) => Promise<void>;
  updateProfile: (updates: { email?: string; name?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session and verify token with backend
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Verify token by fetching current user from backend
      authAPI
        .getMe()
        .then((user) => {
          console.log('AuthContext - getMe - User received:', user);
          console.log('AuthContext - getMe - User role:', user.role);
          setUser(user);
          localStorage.setItem('user', JSON.stringify(user));
          loadHousehold();
        })
        .catch((error) => {
          // Token is invalid or expired, clear it
          console.error('Token verification failed:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const loadHousehold = async () => {
    try {
      const h = await householdAPI.get();
      if (h) setHousehold(h);
    } catch (error) {
      console.error('Failed to load household:', error);
    }
  };

  const login = async (email: string, password: string) => {
    const { user: loggedInUser } = await authAPI.login(email, password);
    console.log('AuthContext - Login - User received:', loggedInUser);
    console.log('AuthContext - Login - User role:', loggedInUser.role);
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    await loadHousehold();
  };

  const register = async (email: string, password: string, name: string) => {
    const { user: newUser } = await authAPI.register(email, password, name);
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
    setHousehold(null);
    localStorage.removeItem('user');
  };

  const createHousehold = async (name: string) => {
    const newHousehold = await householdAPI.create(name);
    setHousehold(newHousehold);
    if (user) {
      const updatedUser = { ...user, householdId: newHousehold.id };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const   joinHousehold = async (inviteCode: string) => {
    const joinedHousehold = await householdAPI.join(inviteCode);
    setHousehold(joinedHousehold);
    if (user) {
      const updatedUser = { ...user, householdId: joinedHousehold.id };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const updateProfile = async (updates: { email?: string; name?: string }) => {
    if (!user) throw new Error('User not logged in');
    const updatedUser = await authAPI.updateProfile(user.id, updates);
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        household,
        loading,
        login,
        register,
        logout,
        createHousehold,
        joinHousehold,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

