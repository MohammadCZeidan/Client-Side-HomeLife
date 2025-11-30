import type { PantryItem } from '../types';
import { apiCall } from './apiCall';
import { ingredientsAPI } from './ingredients.service';
import { unitsAPI } from './units.service';

export const pantryAPI = {
  getAll: async (householdId: string): Promise<PantryItem[]> => {
    const response = await apiCall<Array<{
      id: number | string;
      ingredient_id?: number;
      ingredient?: { id: number; name: string } | string;
      quantity: number | string;
      unit_id?: number;
      unit?: { id: number; name: string; abbreviation?: string } | string;
      expiry_date: string;
      location: string;
      date_bought?: string;
      created_at?: string;
      updated_at?: string;
    }>>('/pantry');
    
    // Get all ingredients and units to look up names if response only has IDs
    const [ingredients, units] = await Promise.all([
      ingredientsAPI.getAll(),
      unitsAPI.getAll(),
    ]);
    
    // Transform backend response to frontend format
    return response.map((item) => {
      // Handle ingredient name
      let ingredientName: string;
      if (item.ingredient) {
        ingredientName = typeof item.ingredient === 'object' ? item.ingredient.name : item.ingredient;
      } else if (item.ingredient_id) {
        const foundIngredient = ingredients.find(ing => ing.id === item.ingredient_id);
        ingredientName = foundIngredient ? foundIngredient.name : 'Unknown';
      } else {
        ingredientName = 'Unknown';
      }
      
      // Handle unit abbreviation
      let unitAbbreviation: string;
      if (item.unit) {
        unitAbbreviation = typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : item.unit;
      } else if (item.unit_id) {
        const foundUnit = units.find(u => u.id === item.unit_id);
        unitAbbreviation = foundUnit ? foundUnit.abbreviation : '';
      } else {
        unitAbbreviation = '';
      }
      
      return {
        id: String(item.id),
        ingredient: ingredientName,
        quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
        unit: unitAbbreviation,
        expiryDate: item.expiry_date,
        location: item.location as PantryItem['location'],
        dateBought: item.date_bought || item.created_at || new Date().toISOString(),
        householdId,
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.updated_at || new Date().toISOString(),
      };
    });
  },

  create: async (item: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<PantryItem> => {
    // Get all ingredients and units to look up IDs
    const [ingredients, units] = await Promise.all([
      ingredientsAPI.getAll(),
      unitsAPI.getAll(),
    ]);

    // Find unit by abbreviation FIRST (we need unitId to create ingredient with unit_id)
    const unitMap: Record<string, string> = {
      'kg': 'Kilogram',
      'g': 'Gram',
      'L': 'Liter',
      'mL': 'Milliliter',
      'ml': 'Milliliter',
      'cup': 'Cup',
      'pieces': 'Piece',
      'piece': 'Piece',
      'pc': 'Piece',
      'pack': 'Piece',
    };
    
    const unitName = unitMap[item.unit.toLowerCase()] || item.unit;
    const existingUnit = units.find(
      (u) => u.abbreviation.toLowerCase() === item.unit.toLowerCase() || 
             u.name.toLowerCase() === unitName.toLowerCase()
    );
    
    let unitId: number;
    if (existingUnit) {
      unitId = existingUnit.id;
    } else {
      // Create new unit if it doesn't exist
      const newUnit = await unitsAPI.create({ 
        name: unitName, 
        abbreviation: item.unit 
      });
      unitId = newUnit.id;
    }

    // Find or create ingredient (now we can pass unit_id)
    let ingredientId: number;
    const ingredientName = (item.ingredient as string).trim();
    const existingIngredient = ingredients.find(
      (ing) => ing.name.toLowerCase() === ingredientName.toLowerCase()
    );
    
    if (existingIngredient) {
      ingredientId = existingIngredient.id;
    } else {
      try {
        // Create new ingredient if it doesn't exist - pass unit_id so ingredient has default unit
        const newIngredient = await ingredientsAPI.create({ 
          name: ingredientName,
          unit_id: unitId  // Pass unit_id when creating ingredient
        });
        ingredientId = newIngredient.id;
      } catch (error: any) {
        // If creation fails due to uniqueness constraint (ingredient was created between check and create),
        // try to fetch it again
        if (error.message && (error.message.includes('unique') || error.message.includes('already exists') || error.message.includes('taken'))) {
          // Refresh ingredients list and try to find it
          const refreshedIngredients = await ingredientsAPI.getAll();
          const foundIngredient = refreshedIngredients.find(
            (ing) => ing.name.toLowerCase() === ingredientName.toLowerCase()
          );
          if (foundIngredient) {
            ingredientId = foundIngredient.id;
          } else {
            throw new Error(`Ingredient "${ingredientName}" already exists but could not be found. Please try again.`);
          }
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    }

    // Format date to YYYY-MM-DD if needed
    const formatDate = (date: string | Date): string => {
      if (typeof date === 'string') {
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return date;
        }
        // Otherwise parse and format
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      }
      return date.toISOString().split('T')[0];
    };

    // Build request body matching backend format
    const requestBody: {
      ingredient_id: number;
      quantity: number;
      unit_id: number;
      expiry_date: string;
      location: string;
      date_bought?: string;
    } = {
      ingredient_id: ingredientId,
      quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
      unit_id: unitId,
      expiry_date: formatDate(item.expiryDate),
      location: item.location,
    };
    
    // Add date_bought if provided
    if (item.dateBought) {
      requestBody.date_bought = formatDate(item.dateBought);
    }

    const response = await apiCall<{
      id: number | string;
      ingredient: { id: number; name: string } | string;
      quantity: number;
      unit: { id: number; name: string; abbreviation?: string } | string;
      expiry_date: string;
      location: string;
      date_bought?: string;
      created_at?: string;
      updated_at?: string;
    }>('/pantry', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    // Transform backend response to frontend format
    return {
      id: String(response.id),
      ingredient: typeof response.ingredient === 'object' ? response.ingredient.name : response.ingredient,
      quantity: response.quantity,
      unit: typeof response.unit === 'object' ? (response.unit.abbreviation || response.unit.name) : response.unit,
      expiryDate: response.expiry_date,
      location: response.location as PantryItem['location'],
      dateBought: response.date_bought || response.created_at || new Date().toISOString(),
      householdId: item.householdId,
      createdAt: response.created_at || new Date().toISOString(),
      updatedAt: response.updated_at || new Date().toISOString(),
    };
  },

  update: async (id: string, updates: Partial<PantryItem>): Promise<PantryItem> => {
    // Convert frontend format to backend format
    const formatDate = (date: string | Date | undefined): string | undefined => {
      if (!date) return undefined;
      if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return date;
        }
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      }
      return date.toISOString().split('T')[0];
    };

    const requestBody: {
      quantity?: number;
      expiry_date?: string;
      location?: string;
      date_bought?: string;
      ingredient_id?: number;
      unit_id?: number;
    } = {};
    
    if (updates.quantity !== undefined) {
      requestBody.quantity = typeof updates.quantity === 'string' ? parseFloat(updates.quantity) : updates.quantity;
    }
    
    if (updates.expiryDate !== undefined) {
      requestBody.expiry_date = formatDate(updates.expiryDate);
    }
    
    if (updates.location !== undefined) {
      requestBody.location = updates.location;
    }
    
    if (updates.dateBought !== undefined) {
      requestBody.date_bought = formatDate(updates.dateBought);
    }

    // Always process ingredient and unit to ensure they exist in backend
    // Get all ingredients and units to look them up
    const [ingredients, units] = await Promise.all([
      ingredientsAPI.getAll(),
      unitsAPI.getAll(),
    ]);

    // Process ingredient - always ensure it exists in backend
    if (updates.ingredient) {
      const existingIngredient = ingredients.find(
        (ing) => ing.name.toLowerCase() === (updates.ingredient as string).toLowerCase()
      );
      
      if (existingIngredient) {
        requestBody.ingredient_id = existingIngredient.id;
      } else {
        // Create new ingredient if it doesn't exist
        const newIngredient = await ingredientsAPI.create({ name: updates.ingredient as string });
        requestBody.ingredient_id = newIngredient.id;
      }
    }

    // Process unit - always ensure it exists in backend
    if (updates.unit) {
      const unitMap: Record<string, string> = {
        'kg': 'Kilogram',
        'g': 'Gram',
        'L': 'Liter',
        'mL': 'Milliliter',
        'ml': 'Milliliter',
        'cup': 'Cup',
        'pieces': 'Piece',
        'piece': 'Piece',
        'pc': 'Piece',
        'pack': 'Piece',
      };
      
      const unitName = unitMap[updates.unit.toLowerCase()] || updates.unit;
      const existingUnit = units.find(
        (u) => u.abbreviation.toLowerCase() === updates.unit.toLowerCase() || 
               u.name.toLowerCase() === unitName.toLowerCase()
      );
      
      if (existingUnit) {
        requestBody.unit_id = existingUnit.id;
      } else {
        const newUnit = await unitsAPI.create({ 
          name: unitName, 
          abbreviation: updates.unit 
        });
        requestBody.unit_id = newUnit.id;
      }
    }

    const response = await apiCall<{
      id: number | string;
      ingredient_id?: number;
      ingredient?: { id: number; name: string } | string;
      quantity: number | string;
      unit_id?: number;
      unit?: { id: number; name: string; abbreviation?: string } | string;
      expiry_date: string;
      location: string;
      date_bought?: string;
      created_at?: string;
      updated_at?: string;
    }>(`/pantry/${id}/update`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    // If response only has ingredient_id, fetch the ingredient name
    let ingredientName: string;
    if (response.ingredient) {
      ingredientName = typeof response.ingredient === 'object' ? response.ingredient.name : response.ingredient;
    } else if (response.ingredient_id) {
      // Fetch ingredient name from the ingredients we already loaded
      const ingredient = ingredients.find(ing => ing.id === response.ingredient_id);
      ingredientName = ingredient ? ingredient.name : (updates.ingredient as string || 'Unknown');
    } else {
      ingredientName = updates.ingredient as string || 'Unknown';
    }
    
    // If response only has unit_id, fetch the unit abbreviation
    let unitAbbreviation: string;
    if (response.unit) {
      unitAbbreviation = typeof response.unit === 'object' ? (response.unit.abbreviation || response.unit.name) : response.unit;
    } else if (response.unit_id) {
      // Fetch unit abbreviation from the units we already loaded
      const unit = units.find(u => u.id === response.unit_id);
      unitAbbreviation = unit ? unit.abbreviation : (updates.unit || '');
    } else {
      unitAbbreviation = updates.unit || '';
    }
    
    // Transform backend response to frontend format
    return {
      id: String(response.id),
      ingredient: ingredientName,
      quantity: typeof response.quantity === 'string' ? parseFloat(response.quantity) : response.quantity,
      unit: unitAbbreviation,
      expiryDate: response.expiry_date,
      location: response.location as PantryItem['location'],
      dateBought: response.date_bought || response.created_at || new Date().toISOString(),
      householdId: updates.householdId || '',
      createdAt: response.created_at || new Date().toISOString(),
      updatedAt: response.updated_at || new Date().toISOString(),
    };
  },

  delete: async (id: string, householdId: string): Promise<void> => {
    await apiCall(`/pantry/${id}/delete`, {
      method: 'POST',
    });
  },

  consume: async (id: string, amount: number, householdId: string): Promise<PantryItem> => {
    const response = await apiCall<{
      id: number | string;
      ingredient: { id: number; name: string } | string;
      quantity: number;
      unit: { id: number; name: string; abbreviation?: string } | string;
      expiry_date: string;
      location: string;
      date_bought?: string;
      created_at?: string;
      updated_at?: string;
    }>(`/pantry/${id}/consume`, {
      method: 'POST',
      body: JSON.stringify({ quantity: amount }),
    });
    
    // Transform backend response to frontend format
    return {
      id: String(response.id),
      ingredient: typeof response.ingredient === 'object' ? response.ingredient.name : response.ingredient,
      quantity: response.quantity,
      unit: typeof response.unit === 'object' ? (response.unit.abbreviation || response.unit.name) : response.unit,
      expiryDate: response.expiry_date,
      location: response.location as PantryItem['location'],
      dateBought: response.date_bought || response.created_at || new Date().toISOString(),
      householdId,
      createdAt: response.created_at || new Date().toISOString(),
      updatedAt: response.updated_at || new Date().toISOString(),
    };
  },

  getExpiringSoon: async (householdId: string, days: number = 7): Promise<PantryItem[]> => {
    const response = await apiCall<Array<{
      id: number | string;
      ingredient: { id: number; name: string } | string;
      quantity: number;
      unit: { id: number; name: string; abbreviation?: string } | string;
      expiry_date: string;
      location: string;
      date_bought?: string;
      created_at?: string;
      updated_at?: string;
      days_until_expiry?: number;
    }>>(`/pantry/expiring?days=${days}`);
    
    // Transform backend response to frontend format
    return response.map((item) => ({
      id: String(item.id),
      ingredient: typeof item.ingredient === 'object' ? item.ingredient.name : item.ingredient,
      quantity: item.quantity,
      unit: typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : item.unit,
      expiryDate: item.expiry_date,
      location: item.location as PantryItem['location'],
      dateBought: item.date_bought || item.created_at || new Date().toISOString(),
      householdId,
      createdAt: item.created_at || new Date().toISOString(),
      updatedAt: item.updated_at || new Date().toISOString(),
    }));
  },

  updateExpiry: async (id: string, expiryDate: string, householdId: string): Promise<PantryItem> => {
    const formatDate = (date: string | Date): string => {
      if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return date;
        }
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      }
      return date.toISOString().split('T')[0];
    };

    const response = await apiCall<{
      id: number | string;
      ingredient: { id: number; name: string } | string;
      quantity: number;
      unit: { id: number; name: string; abbreviation?: string } | string;
      expiry_date: string;
      location: string;
      date_bought?: string;
      created_at?: string;
      updated_at?: string;
    }>(`/pantry/${id}/expiry`, {
      method: 'POST',
      body: JSON.stringify({ expiry_date: formatDate(expiryDate) }),
    });
    
    // Transform backend response to frontend format
    return {
      id: String(response.id),
      ingredient: typeof response.ingredient === 'object' ? response.ingredient.name : response.ingredient,
      quantity: response.quantity,
      unit: typeof response.unit === 'object' ? (response.unit.abbreviation || response.unit.name) : response.unit,
      expiryDate: response.expiry_date,
      location: response.location as PantryItem['location'],
      dateBought: response.date_bought || response.created_at || new Date().toISOString(),
      householdId,
      createdAt: response.created_at || new Date().toISOString(),
      updatedAt: response.updated_at || new Date().toISOString(),
    };
  },

  mergeDuplicates: async (householdId: string): Promise<void> => {
    await apiCall('/pantry/merge-duplicates', {
      method: 'POST',
    });
  },
};

