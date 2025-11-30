import type { User } from '../types';
import { apiCall, API_BASE_URL } from './apiCall';

export const authAPI = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    // Make login request without Authorization header (public endpoint)
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      // Don't include token for login
    };

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      // Handle Laravel validation errors
      const errorMessage = errorData.message || 
                          (errorData.errors && Object.values(errorData.errors).flat().join(', ')) ||
                          `Login failed: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Handle different Laravel JWT response formats:
    // Format 1: { status: "success", payload: { token: "...", user: {...} } }
    // Format 2: { access_token: "...", token_type: "bearer", user: {...} }
    // Format 3: { token: "...", user: {...} }
    // Format 4: { data: { token: "...", user: {...} } }
    let token: string;
    let user: User;

    // Check for payload wrapper first
    if (data.payload) {
      token = data.payload.token || data.payload.access_token;
      user = data.payload.user || data.payload;
    } else if (data.access_token) {
      // Laravel Sanctum/Passport format
      token = data.access_token;
      user = data.user || data.data?.user;
    } else if (data.token) {
      // Direct token format
      token = data.token;
      user = data.user || data.data?.user;
    } else if (data.data) {
      // Nested data format
      token = data.data.token || data.data.access_token;
      user = data.data.user;
    } else {
      throw new Error('Invalid response format from login endpoint');
    }

    if (!token || !user) {
      throw new Error('Token or user data missing from login response');
    }

    // Store token
    localStorage.setItem('auth_token', token);
    
    return { user, token };
  },

  register: async (email: string, password: string, name: string): Promise<{ user: User; token: string }> => {
    // Make register request without Authorization header (public endpoint)
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      // Handle Laravel validation errors
      const errorMessage = errorData.message || 
                          (errorData.errors && Object.values(errorData.errors).flat().join(', ')) ||
                          `Registration failed: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Handle different Laravel JWT response formats:
    // Format 1: { status: "success", payload: { token: "...", user: {...} } }
    // Format 2: { access_token: "...", token_type: "bearer", user: {...} }
    // Format 3: { token: "...", user: {...} }
    // Format 4: { data: { token: "...", user: {...} } }
    let token: string;
    let user: User;

    // Check for payload wrapper first
    if (data.payload) {
      token = data.payload.token || data.payload.access_token;
      user = data.payload.user || data.payload;
    } else if (data.access_token) {
      token = data.access_token;
      user = data.user || data.data?.user;
    } else if (data.token) {
      token = data.token;
      user = data.user || data.data?.user;
    } else if (data.data) {
      token = data.data.token || data.data.access_token;
      user = data.data.user;
    } else {
      throw new Error('Invalid response format from register endpoint');
    }

    if (!token || !user) {
      throw new Error('Token or user data missing from register response');
    }

    // Store token
    localStorage.setItem('auth_token', token);
    
    return { user, token };
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
      role?: string;
      household_id?: number | string | null;
    }>('/auth/me');
    
    // Transform backend response to frontend format
    return {
      id: String(response.id),
      email: response.email,
      name: response.name,
      role: (response.role === 'admin' || response.role === 'member' ? response.role : 'member') as 'admin' | 'member',
      householdId: response.household_id ? String(response.household_id) : null,
    };
  },

  refreshToken: async (): Promise<{ token: string }> => {
    // Refresh endpoint might return payload wrapper, so we handle it manually
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    // Handle different token response formats
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
  },

  updateProfile: async (_userId: string, updates: { email?: string; name?: string }): Promise<User> => {
    // Update profile using /auth/profile/update endpoint
    // Backend expects email and name in the request body
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
    
    // Transform backend response to frontend format
    return {
      id: String(response.id),
      email: response.email,
      name: response.name,
      role: (response.role === 'admin' || response.role === 'member' ? response.role : 'member') as 'admin' | 'member',
      householdId: response.household_id ? String(response.household_id) : null,
    };
  },
};

