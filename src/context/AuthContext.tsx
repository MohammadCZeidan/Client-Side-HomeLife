// React hooks for context, state management, and side effects
import { createContext, useContext, useState, useEffect } from 'react';
// TypeScript type for React children prop
import type { ReactNode } from 'react';
// TypeScript types for user and household data structures
import type { User, Household } from '../types';
// API service functions for authentication and household operations
import { authAPI, householdAPI } from '../services';

// TypeScript interface defining the authentication context structure
interface AuthContextType {
  // Currently authenticated user object, or null if not logged in
  user: User | null;
  // Current household the user belongs to, or null if not in a household
  household: Household | null;
  // Boolean indicating if authentication check is in progress
  loading: boolean;
  // Function to authenticate user with email and password
  login: (email: string, password: string) => Promise<void>;
  // Function to create a new user account
  register: (email: string, password: string, name: string) => Promise<void>;
  // Function to log out the current user
  logout: () => Promise<void>;
  // Function to create a new household
  createHousehold: (name: string) => Promise<void>;
  // Function to join an existing household using invite code
  joinHousehold: (inviteCode: string) => Promise<void>;
  // Function to update user profile information
  updateProfile: (updates: { email?: string; name?: string }) => Promise<void>;
}

// Create React context for authentication with undefined default to detect usage outside provider
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component that manages authentication state and provides it to all children
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // State for current authenticated user - null if not logged in
  const [user, setUser] = useState<User | null>(null);
  // State for current household - null if user hasn't joined/created one
  const [household, setHousehold] = useState<Household | null>(null);
  // State for loading status - true while checking if user is already logged in
  const [loading, setLoading] = useState(true);

  // Effect runs once on mount to check if user is already authenticated
  useEffect(() => {
    // Check if authentication token exists in browser localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Token found - verify it's still valid by fetching current user from server
      authAPI
        .getMe()
        .then((user) => {
          // Token is valid - user is authenticated
          console.log('AuthContext - getMe - User received:', user);
          console.log('AuthContext - getMe - User role:', user.role);
          // Update user state with fetched user data
          setUser(user);
          // Store user data in localStorage for persistence
          localStorage.setItem('user', JSON.stringify(user));
          // Load household data for this user
          loadHousehold();
        })
        .catch((error) => {
          // Token expired or invalid - clear authentication data
          console.error('Token verification failed:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        })
        .finally(() => {
          // Always set loading to false after check completes
          setLoading(false);
        });
    } else {
      // No token found - user is not logged in
      setLoading(false);
    }
  }, []); // Empty dependency array - runs only once on mount

  // Helper function to load household data for current user
  const loadHousehold = async () => {
    try {
      // Fetch household data from API
      const h = await householdAPI.get();
      // Update household state if data was returned
      if (h) setHousehold(h);
    } catch (error) {
      // Log error but don't throw - user might not be in a household yet
      console.error('Failed to load household:', error);
    }
  };

  // Login function - authenticates user and loads their data
  const login = async (email: string, password: string) => {
    // Call API to authenticate with email and password
    const { user: loggedInUser } = await authAPI.login(email, password);
    console.log('AuthContext - Login - User received:', loggedInUser);
    console.log('AuthContext - Login - User role:', loggedInUser.role);
    // Update user state with logged in user
    setUser(loggedInUser);
    // Store user data in localStorage for persistence across page refreshes
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    // Load household data for this user
    await loadHousehold();
  };

  // Register function - creates new user account
  const register = async (email: string, password: string, name: string) => {
    // Call API to create new user account
    const { user: newUser } = await authAPI.register(email, password, name);
    // Update user state with newly created user
    setUser(newUser);
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // Logout function - clears authentication and user data
  const logout = async () => {
    // Call API to invalidate session on server
    await authAPI.logout();
    // Clear user state
    setUser(null);
    // Clear household state
    setHousehold(null);
    // Remove user data from localStorage
    localStorage.removeItem('user');
  };

  // Create household function - creates a new household and assigns user to it
  const createHousehold = async (name: string) => {
    // Call API to create new household
    const newHousehold = await householdAPI.create(name);
    // Update household state with newly created household
    setHousehold(newHousehold);
    // Update user object to include household ID
    if (user) {
      const updatedUser = { ...user, householdId: newHousehold.id };
      setUser(updatedUser);
      // Store updated user in localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // Join household function - joins existing household using invite code
  const   joinHousehold = async (inviteCode: string) => {
    // Call API to join household with invite code
    const joinedHousehold = await householdAPI.join(inviteCode);
    // Update household state with joined household
    setHousehold(joinedHousehold);
    // Update user object to include household ID
    if (user) {
      const updatedUser = { ...user, householdId: joinedHousehold.id };
      setUser(updatedUser);
      // Store updated user in localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // Update profile function - updates user's email or name
  const updateProfile = async (updates: { email?: string; name?: string }) => {
    // Ensure user is logged in before updating
    if (!user) throw new Error('User not logged in');
    // Call API to update user profile
    const updatedUser = await authAPI.updateProfile(user.id, updates);
    // Update user state with new data
    setUser(updatedUser);
    // Store updated user in localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Provide authentication context to all child components
  return (
    <AuthContext.Provider
      value={{
        // Current user state
        user,
        // Current household state
        household,
        // Loading state
        loading,
        // Authentication functions
        login,
        register,
        logout,
        // Household management functions
        createHousehold,
        joinHousehold,
        // Profile management function
        updateProfile,
      }}
    >
      {/* Render all child components that will have access to auth context */}
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access authentication context - provides type safety and error handling
export const useAuth = () => {
  // Get context value - will be undefined if used outside AuthProvider
  const context = useContext(AuthContext);
  // Safety check: throw error if hook is used outside the provider
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Return context value with user, household, loading state, and all auth functions
  return context;
};

