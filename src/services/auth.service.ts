import type { User } from '../types';
import { apiCall, API_BASE_URL } from './apiCall';
import axios, { AxiosError } from 'axios';

export const authAPI = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    try {
      // Login endpoint is public, so don't send auth header
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;
    
      // Handle different Laravel JWT response formats:
      // Format 1: { status: "success", payload: { token: "...", user: {...} } }
      // Format 2: { access_token: "...", token_type: "bearer", user: {...} }
      // Format 3: { token: "...", user: {...} }
      // Format 4: { data: { token: "...", user: {...} } }
      let token: string;
      let userData: any;

      // Check for payload wrapper first
      if (data.payload) {
        token = data.payload.token || data.payload.access_token;
        userData = data.payload.user || data.payload;
      } else if (data.access_token) {
        // Laravel Sanctum/Passport format
        token = data.access_token;
        userData = data.user || data.data?.user;
      } else if (data.token) {
        // Simple token format
        token = data.token;
        userData = data.user || data.data?.user;
      } else if (data.data) {
        // Nested data format
        token = data.data.token || data.data.access_token;
        userData = data.data.user;
      } else {
        throw new Error('Invalid response format from login endpoint');
      }

      if (!token || !userData) {
        throw new Error('Token or user data missing from login response');
      }

      // Backend sometimes sends role as an object { id: 1, role: "admin" }
      // Sometimes as a string "admin" - handle both
      let roleValue: 'admin' | 'member' = 'member';
      if (userData.role) {
        if (typeof userData.role === 'string') {
          roleValue = (userData.role === 'admin' || userData.role === 'member' ? userData.role : 'member') as 'admin' | 'member';
        } else if (typeof userData.role === 'object' && 'role' in userData.role) {
          roleValue = (userData.role.role === 'admin' || userData.role.role === 'member' ? userData.role.role : 'member') as 'admin' | 'member';
        }
      }

      // Convert to my frontend User type
      const user: User = {
        id: String(userData.id),
        email: userData.email,
        name: userData.name,
        role: roleValue,
        householdId: userData.household_id ? String(userData.household_id) : null,
      };

      console.log('Login - Extracted user:', user);
      console.log('Login - Role extracted:', roleValue, 'from:', userData.role);

      // Save token for future requests
      localStorage.setItem('auth_token', token);
      
      return { user, token };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{
          message?: string;
          errors?: Record<string, string[]>;
        }>;
        
        // Show validation errors if they exist
        const errorMessage = axiosError.response?.data?.message || 
                            (axiosError.response?.data?.errors && 
                             Object.values(axiosError.response.data.errors).flat().join(', ')) ||
                            `Login failed: ${axiosError.message}`;
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  register: async (email: string, password: string, name: string): Promise<{ user: User; token: string }> => {
    try {
      // Public endpoint - no auth header needed
      // IMPORTANT: Don't send role - backend should default new users to 'member'
      // Only admins should be able to change roles
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        name,
        // Not sending role - backend handles default
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;
    
      // Handle different Laravel JWT response formats:
      // Format 1: { status: "success", payload: { token: "...", user: {...} } }
      // Format 2: { access_token: "...", token_type: "bearer", user: {...} }
      // Format 3: { token: "...", user: {...} }
      // Format 4: { data: { token: "...", user: {...} } }
      let token: string;
      let userData: any;

      // Check for payload wrapper first
      if (data.payload) {
        token = data.payload.token || data.payload.access_token;
        userData = data.payload.user || data.payload;
      } else if (data.access_token) {
        token = data.access_token;
        userData = data.user || data.data?.user;
      } else if (data.token) {
        token = data.token;
        userData = data.user || data.data?.user;
      } else if (data.data) {
        token = data.data.token || data.data.access_token;
        userData = data.data.user;
      } else {
        throw new Error('Invalid response format from register endpoint');
      }

      if (!token || !userData) {
        throw new Error('Token or user data missing from register response');
      }

      // Extract role - should be 'member' for new users
      let roleValue: 'admin' | 'member' = 'member';
      if (userData.role) {
        if (typeof userData.role === 'string') {
          roleValue = (userData.role === 'admin' || userData.role === 'member' ? userData.role : 'member') as 'admin' | 'member';
        } else if (typeof userData.role === 'object' && 'role' in userData.role) {
          roleValue = (userData.role.role === 'admin' || userData.role.role === 'member' ? userData.role.role : 'member') as 'admin' | 'member';
        }
      }

      const user: User = {
        id: String(userData.id),
        email: userData.email,
        name: userData.name,
        role: roleValue,
        householdId: userData.household_id ? String(userData.household_id) : null,
      };

      localStorage.setItem('auth_token', token);
      
      return { user, token };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{
          message?: string;
          errors?: Record<string, string[]>;
        }>;
        
        // Handle Laravel validation errors
        const errorMessage = axiosError.response?.data?.message || 
                            (axiosError.response?.data?.errors && 
                             Object.values(axiosError.response.data.errors).flat().join(', ')) ||
                            `Registration failed: ${axiosError.message}`;
        throw new Error(errorMessage);
      }
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    await apiCall('/auth/logout', {
      method: 'POST',
    });
    localStorage.removeItem('auth_token');
  },

  getMe: async (): Promise<User> => {
    const response = await apiCall<{
      id: number | string;
      email: string;
      name: string;
      role?: string | {
        id: number | string;
        role: string;
      };
      household_id?: number | string | null;
    }>('/auth/me');
    
    console.log('getMe - Raw API response:', JSON.stringify(response, null, 2));
    console.log('getMe - Response role value:', response.role);
    console.log('getMe - Response role type:', typeof response.role);
    
    // Extract role - handle both object and string formats
    let roleValue: 'admin' | 'member' = 'member';
    if (response.role) {
      if (typeof response.role === 'string') {
        roleValue = (response.role === 'admin' || response.role === 'member' ? response.role : 'member') as 'admin' | 'member';
      } else if (typeof response.role === 'object' && 'role' in response.role) {
        roleValue = (response.role.role === 'admin' || response.role.role === 'member' ? response.role.role : 'member') as 'admin' | 'member';
      }
    }
    
    console.log('getMe - Role extracted:', roleValue, 'from:', response.role);
    
    const user: User = {
      id: String(response.id),
      email: response.email,
      name: response.name,
      role: roleValue,
      householdId: response.household_id ? String(response.household_id) : null,
    };
    
    console.log('getMe - Final user object:', user);
    
    return user;
  },

  refreshToken: async (): Promise<{ token: string }> => {
    try {
      // Handle token refresh manually since it might have payload wrapper
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = response.data;
    
      // Extract token from various possible formats
      let newToken: string;
      if (data.payload) {
        newToken = data.payload.token || data.payload.access_token;
      } else if (data.access_token) {
        newToken = data.access_token;
      } else if (data.token) {
        newToken = data.token;
      } else if (data.data?.token) {
        newToken = data.data.token;
      } else {
        throw new Error('Token missing from refresh response');
      }
    
      // Update stored token
      localStorage.setItem('auth_token', newToken);
      
      return { token: newToken };
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  },

  updateProfile: async (_userId: string, updates: { email?: string; name?: string }): Promise<User> => {
    // Update user profile - backend expects email and name
    const response = await apiCall<{
      id: number | string;
      email: string;
      name: string;
      role?: string;
      household_id?: number | string | null;
    }>('/auth/profile/update', {
      method: 'POST',
      body: JSON.stringify(updates),
    });
    
    // Convert backend format to frontend format
    return {
      id: String(response.id),
      email: response.email,
      name: response.name,
      role: (response.role === 'admin' || response.role === 'member' ? response.role : 'member') as 'admin' | 'member',
      householdId: response.household_id ? String(response.household_id) : null,
    };
  },
};

