import type { Household } from '../types';
import { apiCall } from './apiCall';

export const householdAPI = {
  get: async (): Promise<Household | null> => {
    try {
      const response = await apiCall<{
        id: number | string;
        name: string;
        invite_code?: string;
        inviteCode?: string;
        users?: Array<{
          id: number | string;
          name: string;
          email: string;
          role?: string;
        }>;
        members?: Array<{
          id: number | string;
          name: string;
          email: string;
          role?: string;
        }>;
        created_at?: string;
      }>('/household');
      
      // Transform backend response to frontend format
      return {
        id: String(response.id),
        name: response.name,
        inviteCode: response.invite_code || response.inviteCode || '',
        members: (response.users || response.members || []).map((user) => ({
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: (user.role === 'admin' || user.role === 'member' ? user.role : 'member') as 'admin' | 'member',
          householdId: String(response.id),
        })),
        createdAt: response.created_at || new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  },

  create: async (name: string): Promise<Household> => {
    const response = await apiCall<{
      id: number | string;
      name: string;
      invite_code?: string;
      inviteCode?: string;
      users?: Array<{
        id: number | string;
        name: string;
        email: string;
        role?: string;
      }>;
      members?: Array<{
        id: number | string;
        name: string;
        email: string;
        role?: string;
      }>;
      created_at?: string;
    }>('/household', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    
    // Transform backend response to frontend format
    return {
      id: String(response.id),
      name: response.name,
      inviteCode: response.invite_code || response.inviteCode || '',
      members: (response.users || response.members || []).map((user) => ({
        id: String(user.id),
        name: user.name,
        email: user.email,
        role: (user.role === 'admin' || user.role === 'member' ? user.role : 'member') as 'admin' | 'member',
        householdId: String(response.id),
      })),
      createdAt: response.created_at || new Date().toISOString(),
    };
  },

  join: async (inviteCode: string): Promise<Household> => {
    const response = await apiCall<{
      id: number | string;
      name: string;
      invite_code?: string;
      inviteCode?: string;
      users?: Array<{
        id: number | string;
        name: string;
        email: string;
        role?: string;
      }>;
      members?: Array<{
        id: number | string;
        name: string;
        email: string;
        role?: string;
      }>;
      created_at?: string;
    }>('/household/join', {
      method: 'POST',
      body: JSON.stringify({ code: inviteCode }),
    });
    
    // Transform backend response to frontend format
    return {
      id: String(response.id),
      name: response.name,
      inviteCode: response.invite_code || response.inviteCode || '',
      members: (response.users || response.members || []).map((user) => ({
        id: String(user.id),
        name: user.name,
        email: user.email,
        role: (user.role === 'admin' || user.role === 'member' ? user.role : 'member') as 'admin' | 'member',
        householdId: String(response.id),
      })),
      createdAt: response.created_at || new Date().toISOString(),
    };
  },

  generateInviteCode: async (): Promise<{ inviteCode: string }> => {
    const response = await apiCall<{
      invite_code?: string;
      inviteCode?: string;
      code?: string;
    }>('/household/invite', {
      method: 'POST',
    });
    
    // Handle different response formats
    const inviteCode = response.invite_code || response.inviteCode || response.code || '';
    return { inviteCode };
  },
};

