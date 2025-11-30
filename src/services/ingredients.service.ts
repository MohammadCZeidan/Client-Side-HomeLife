import { apiCall } from './apiCall';

export const ingredientsAPI = {
  getAll: async (search?: string): Promise<Array<{ 
    id: number; 
    name: string; 
    calories?: number; 
    protein?: number; 
    carbs?: number; 
    fat?: number;
    unit_id?: number | null;
    unit?: {
      id: number;
      name: string;
      abbreviation: string;
    } | null;
  }>> => {
    const endpoint = search ? `/ingredients?search=${encodeURIComponent(search)}` : '/ingredients';
    const response = await apiCall<Array<{ 
      id: number; 
      name: string; 
      calories?: number; 
      protein?: number; 
      carbs?: number; 
      fat?: number;
      unit_id?: number | null;
      unit?: {
        id: number;
        name: string;
        abbreviation: string;
      } | null;
    }>>(endpoint);
    
    // Deduplicate ingredients by name (case-insensitive)
    // If multiple ingredients have the same name, keep only the first one
    const seen = new Map<string, { 
      id: number; 
      name: string; 
      calories?: number; 
      protein?: number; 
      carbs?: number; 
      fat?: number;
      unit_id?: number | null;
      unit?: {
        id: number;
        name: string;
        abbreviation: string;
      } | null;
    }>();
    response.forEach((ingredient) => {
      const key = ingredient.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, ingredient);
      }
    });
    
    return Array.from(seen.values());
  },

  getById: async (id: string): Promise<{ 
    id: number; 
    name: string; 
    calories?: number; 
    protein?: number; 
    carbs?: number; 
    fat?: number;
    unit_id?: number | null;
    unit?: {
      id: number;
      name: string;
      abbreviation: string;
    } | null;
  }> => {
    return apiCall<{ 
      id: number; 
      name: string; 
      calories?: number; 
      protein?: number; 
      carbs?: number; 
      fat?: number;
      unit_id?: number | null;
      unit?: {
        id: number;
        name: string;
        abbreviation: string;
      } | null;
    }>(`/ingredients/${id}`);
  },

  create: async (ingredient: { 
    name: string; 
    calories?: number; 
    protein?: number; 
    carbs?: number; 
    fat?: number;
    unit_id?: number;
  }): Promise<{ 
    id: number; 
    name: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    unit_id?: number | null;
    unit?: {
      id: number;
      name: string;
      abbreviation: string;
    } | null;
  }> => {
    return apiCall<{ 
      id: number; 
      name: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      unit_id?: number | null;
      unit?: {
        id: number;
        name: string;
        abbreviation: string;
      } | null;
    }>('/ingredients', {
      method: 'POST',
      body: JSON.stringify(ingredient),
    });
  },
};

