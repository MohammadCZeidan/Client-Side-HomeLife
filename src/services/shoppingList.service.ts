import type { ShoppingList, ShoppingListItem } from '../types';
import { apiCall } from './apiCall';
import { ingredientsAPI } from './ingredients.service';
import { unitsAPI } from './units.service';

export const shoppingListAPI = {
  getAll: async (householdId: string): Promise<ShoppingList[]> => {
    const response = await apiCall<Array<{
      id: number | string;
      title: string;
      name?: string;
      items?: Array<{
        id: number | string;
        ingredient?: { id: number; name: string } | string;
        quantity: number;
        unit?: { id: number; name: string; abbreviation?: string } | string;
        bought: boolean;
      }>;
      is_completed?: boolean;
      items_count?: number;
      created_at?: string;
      updated_at?: string;
    }>>('/shopping-lists');
    
    return response.map((list) => ({
      id: String(list.id),
      name: list.title || list.name || 'Shopping List',
      items: (list.items || []).map((item) => ({
        id: String(item.id),
        name: typeof item.ingredient === 'object' 
          ? `${item.ingredient.name} - ${item.quantity} ${typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : item.unit || ''}`
          : `${item.ingredient || 'Item'} - ${item.quantity} ${typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : item.unit || ''}`,
        quantity: item.quantity,
        unit: typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : (item.unit || ''),
        bought: item.bought,
        listId: String(list.id),
      })),
      householdId,
      createdAt: list.created_at || new Date().toISOString(),
      updatedAt: list.updated_at || new Date().toISOString(),
    }));
  },

  getById: async (id: string, householdId: string): Promise<ShoppingList | null> => {
    try {
      const response = await apiCall<{
        id: number | string;
        title: string;
        name?: string;
        items?: Array<{
          id: number | string;
          ingredient?: { id: number; name: string } | string;
          quantity: number;
          unit?: { id: number; name: string; abbreviation?: string } | string;
          bought: boolean;
        }>;
        is_completed?: boolean;
        created_at?: string;
        updated_at?: string;
      }>(`/shopping-lists/${id}`);
      
      return {
        id: String(response.id),
        name: response.title || response.name || 'Shopping List',
        items: (response.items || []).map((item) => ({
          id: String(item.id),
          name: typeof item.ingredient === 'object' 
            ? `${item.ingredient.name} - ${item.quantity} ${typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : item.unit || ''}`
            : `${item.ingredient || 'Item'} - ${item.quantity} ${typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : item.unit || ''}`,
          quantity: item.quantity,
          unit: typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : (item.unit || ''),
          bought: item.bought,
          listId: String(response.id),
        })),
        householdId,
        createdAt: response.created_at || new Date().toISOString(),
        updatedAt: response.updated_at || new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  },

  create: async (list: Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShoppingList> => {
    const response = await apiCall<{
      id: number | string;
      title: string;
      name?: string;
      items?: Array<{
        id: number | string;
        ingredient?: { id: number; name: string } | string;
        quantity: number;
        unit?: { id: number; name: string; abbreviation?: string } | string;
        bought: boolean;
      }>;
      is_completed?: boolean;
      created_at?: string;
      updated_at?: string;
    }>('/shopping-lists', {
      method: 'POST',
      body: JSON.stringify({ 
        title: list.name,
        ...((list as any).weekId && { week_id: (list as any).weekId })
      }),
    });
    
    return {
      id: String(response.id),
      name: response.title || response.name || 'Shopping List',
      items: (response.items || []).map((item) => ({
        id: String(item.id),
        name: typeof item.ingredient === 'object' 
          ? `${item.ingredient.name} - ${item.quantity} ${typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : item.unit || ''}`
          : `${item.ingredient || 'Item'} - ${item.quantity} ${typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : item.unit || ''}`,
        quantity: item.quantity,
        unit: typeof item.unit === 'object' ? (item.unit.abbreviation || item.unit.name) : (item.unit || ''),
        bought: item.bought,
        listId: String(response.id),
      })),
      householdId: list.householdId,
      createdAt: response.created_at || new Date().toISOString(),
      updatedAt: response.updated_at || new Date().toISOString(),
    };
  },

  update: async (listId: string, updates: Partial<ShoppingList>, householdId: string): Promise<ShoppingList> => {
    return apiCall<ShoppingList>(`/shopping-lists/${listId}/update`, {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  },

  delete: async (listId: string, householdId: string): Promise<void> => {
    await apiCall(`/shopping-lists/${listId}/delete`, {
      method: 'POST',
    });
  },

  addItems: async (
    listId: string,
    items: Omit<ShoppingListItem, 'id'>[],
    householdId: string
  ): Promise<ShoppingList> => {
    if (items.length === 0) {
      return await shoppingListAPI.getById(listId, householdId) as ShoppingList;
    }
    
    const [ingredients, units] = await Promise.all([
      ingredientsAPI.getAll(),
      unitsAPI.getAll(),
    ]);
    
    for (const item of items) {
      let ingredientId: number | undefined = (item as any).ingredient_id || (item as any).ingredient?.id;
      let unitId: number | undefined = (item as any).unit_id || (item as any).unit?.id;
      
      if (!unitId) {
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
        
        if (existingUnit) {
          unitId = existingUnit.id;
        } else {
          const newUnit = await unitsAPI.create({ 
            name: unitName, 
            abbreviation: item.unit 
          });
          unitId = newUnit.id;
        }
      }
      
      if (!ingredientId) {
        const ingredientName = item.name.split(' - ')[0].trim();
        
        const existingIngredient = ingredients.find(
          (ing) => ing.name.toLowerCase() === ingredientName.toLowerCase()
        );
        
        if (existingIngredient) {
          ingredientId = existingIngredient.id;
        } else {
          if (!unitId) {
            throw new Error(`Cannot create ingredient "${ingredientName}" without unit_id`);
          }
          const newIngredient = await ingredientsAPI.create({ 
            name: ingredientName,
            unit_id: unitId
          });
          ingredientId = newIngredient.id;
        }
      }
      
      const itemData = {
        ingredient_id: ingredientId,
        quantity: item.quantity,
        unit_id: unitId,
      };
      
      await apiCall(`/shopping-lists/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify(itemData),
      });
    }
    
    return await shoppingListAPI.getById(listId, householdId) as ShoppingList;
  },

  updateItem: async (
    listId: string,
    itemId: string,
    updates: Partial<ShoppingListItem>,
    householdId: string
  ): Promise<ShoppingListItem> => {
    const requestBody: {
      bought?: boolean;
      quantity?: number;
    } = {};
    
    if (updates.bought !== undefined) {
      requestBody.bought = updates.bought;
    }
    
    if (updates.quantity !== undefined) {
      requestBody.quantity = updates.quantity;
    }

    const response = await apiCall<{
      id: number | string;
      ingredient?: { id: number; name: string } | string;
      quantity: number;
      unit?: { id: number; name: string; abbreviation?: string } | string;
      bought: boolean;
    }>(`/shopping-lists/${listId}/items/${itemId}/update`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    return {
      id: String(response.id),
      name: typeof response.ingredient === 'object' 
        ? `${response.ingredient.name} - ${response.quantity} ${typeof response.unit === 'object' ? (response.unit.abbreviation || response.unit.name) : response.unit || ''}`
        : `${response.ingredient || 'Item'} - ${response.quantity} ${typeof response.unit === 'object' ? (response.unit.abbreviation || response.unit.name) : response.unit || ''}`,
      quantity: response.quantity,
      unit: typeof response.unit === 'object' ? (response.unit.abbreviation || response.unit.name) : (response.unit || ''),
      bought: response.bought,
      listId,
    };
  },

  deleteItem: async (listId: string, itemId: string, householdId: string): Promise<void> => {
    await apiCall(`/shopping-lists/${listId}/items/${itemId}/delete`, {
      method: 'POST',
    });
  },

  generateFromMealPlan: async (householdId: string, weekId: string, title: string = 'Weekly Shopping List'): Promise<ShoppingList> => {
    return apiCall<ShoppingList>('/shopping-lists/generate', {
      method: 'POST',
      body: JSON.stringify({ week_id: weekId, title }),
    });
  },

  getOrCreateDefaultList: async (householdId: string): Promise<ShoppingList> => {
    const lists = await shoppingListAPI.getAll(householdId);
    let defaultList = lists.find((l) => l.name === 'Weekly Groceries');

    if (!defaultList) {
      defaultList = await shoppingListAPI.create({
        name: 'Weekly Groceries',
        items: [],
        householdId,
      });
    }

    return defaultList;
  },
};

