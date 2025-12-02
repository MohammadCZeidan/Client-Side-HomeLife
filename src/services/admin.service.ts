import { apiCall } from './apiCall';
import type { User } from '../types';

export interface AdminUser extends User {
  householdName?: string;
  householdMembers?: User[];
}

export interface AdminUserResponse {
  id: number | string;
  email: string;
  name: string;
  role?: string | {
    id: number | string;
    role: string;
  };
  household_id?: number | string | null;
  household?: {
    id: number | string;
    name: string;
    members?: Array<{
      id: number | string;
      name: string;
      email: string;
      role?: string | {
        id: number | string;
        role: string;
      };
    }>;
  };
  created_at?: string;
}

export const adminAPI = {
  // Get all users - admin only
  // Backend should check if user is admin and return 403 if not
  // Expected response: { status: "success", payload: [{ id, name, email, role: {id, role}, household: {id, name} }] }
  getAllUsers: async (): Promise<AdminUser[]> => {
    try {
      const response = await apiCall<AdminUserResponse[]>('/users');
      console.log('Raw API response:', response);
      
      // Make sure we got an array
      if (!Array.isArray(response)) {
        console.error('Expected array but got:', response);
        throw new Error('Invalid response format: expected array of users');
      }
      
      // Helper to extract role string - handles both { id: 1, role: "admin" } and "admin"
      const extractRole = (role: string | { id: number | string; role: string } | undefined): 'admin' | 'member' => {
        if (!role) return 'member';
        if (typeof role === 'string') {
          return (role === 'admin' || role === 'member' ? role : 'member') as 'admin' | 'member';
        }
        if (typeof role === 'object' && 'role' in role) {
          const roleValue = role.role;
          return (roleValue === 'admin' || roleValue === 'member' ? roleValue : 'member') as 'admin' | 'member';
        }
        return 'member';
      };
      
      // Group users by household so we can show who shares with whom
      const householdMap = new Map<string, AdminUser[]>();
      
      const users = response.map((user) => {
        const role = extractRole(user.role);
        const householdId = user.household?.id ? String(user.household.id) : (user.household_id ? String(user.household_id) : null);
        
        const adminUser: AdminUser = {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: role,
          householdId: householdId,
          householdName: user.household?.name,
        };
        
        // Add to household group
        if (adminUser.householdId) {
          if (!householdMap.has(adminUser.householdId)) {
            householdMap.set(adminUser.householdId, []);
          }
          householdMap.get(adminUser.householdId)!.push(adminUser);
        }
        
        return adminUser;
      });
      
      // Add household members list to each user (excluding themselves)
      users.forEach((user) => {
        if (user.householdId) {
          const householdMembers = householdMap.get(user.householdId) || [];
          // Don't show user in their own members list
          user.householdMembers = householdMembers.filter(m => m.id !== user.id);
        }
      });
      
      console.log('Processed users:', users);
      return users;
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  },

  // Get all households with their members
  // Since /users already gives us household info, just derive households from users
  getAllHouseholds: async (): Promise<Array<{
    id: string;
    name: string;
    members: AdminUser[];
    inviteCode?: string;
  }>> => {
    // Get users first to extract household data
    const allUsers = await adminAPI.getAllUsers();
    
    // Group by household
    const householdMap = new Map<string, {
      id: string;
      name: string;
      members: AdminUser[];
    }>();
    
    allUsers.forEach((user) => {
      if (user.householdId && user.householdName) {
        if (!householdMap.has(user.householdId)) {
          householdMap.set(user.householdId, {
            id: user.householdId,
            name: user.householdName,
            members: [],
          });
        }
        householdMap.get(user.householdId)!.members.push(user);
      }
    });
    
    // Convert map to array
    return Array.from(householdMap.values());
  },
};

