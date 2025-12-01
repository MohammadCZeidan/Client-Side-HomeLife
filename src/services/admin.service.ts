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
  // Get all users with their household information (admin only)
  // Backend endpoint: GET /api/v0.1/users
  // Backend should verify the logged-in user is an admin before returning data
  // If user is not admin, backend should return 403 Forbidden
  // Response format: { status: "success", payload: [{ id, name, email, role: {id, role}, household: {id, name} }] }
  getAllUsers: async (): Promise<AdminUser[]> => {
    try {
      const response = await apiCall<AdminUserResponse[]>('/users');
      console.log('Raw API response:', response);
      
      // Check if response is an array
      if (!Array.isArray(response)) {
        console.error('Expected array but got:', response);
        throw new Error('Invalid response format: expected array of users');
      }
      
      // Helper function to extract role string from nested or flat structure
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
      
      // Group users by household to get members
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
        
        // Group by household
        if (adminUser.householdId) {
          if (!householdMap.has(adminUser.householdId)) {
            householdMap.set(adminUser.householdId, []);
          }
          householdMap.get(adminUser.householdId)!.push(adminUser);
        }
        
        return adminUser;
      });
      
      // Add household members to each user
      users.forEach((user) => {
        if (user.householdId) {
          const householdMembers = householdMap.get(user.householdId) || [];
          // Exclude the current user from their own members list
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

  // Get all households with their members (admin only)
  // Since the /users endpoint already provides household info, we derive households from users
  getAllHouseholds: async (): Promise<Array<{
    id: string;
    name: string;
    members: AdminUser[];
    inviteCode?: string;
  }>> => {
    // Get all users first to extract household information
    const allUsers = await adminAPI.getAllUsers();
    
    // Group users by household
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

