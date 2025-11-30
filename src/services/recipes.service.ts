import type { Recipe, RecipeSuggestion } from '../types';
import { apiCall } from './apiCall';
import { ingredientsAPI } from './ingredients.service';
import { unitsAPI } from './units.service';
import { parseIngredientQuantity } from './helpers';

export const recipeAPI = {
  getAll: async (householdId: string): Promise<Recipe[]> => {
    const response = await apiCall<Array<{
      id: number | string;
      title: string;
      instructions: string;
      tags: string[];
      servings?: number;
      prep_time?: number;
      cook_time?: number;
      ingredients?: Array<{
        id?: number;
        name?: string;
        ingredient_name?: string;
        ingredient?: { id: number; name: string } | string;
        quantity: number;
        unit_name?: string;
        unit_abbreviation?: string;
        unit?: {
          id: number;
          name: string;
          abbreviation?: string;
        };
        unit_id?: number;
      }>;
      created_at?: string;
      updated_at?: string;
    }>>('/recipes');
    
    // Transform backend response to frontend format
    return response.map((recipe) => ({
      id: String(recipe.id),
      title: recipe.title,
      instructions: recipe.instructions,
      tags: recipe.tags || [],
      servings: recipe.servings,
      prepTime: recipe.prep_time,
      cookTime: recipe.cook_time,
      ingredients: (recipe.ingredients || [])
        .filter((ing) => {
          // Filter out invalid ingredients
          if (!ing) return false;
          // Backend now returns name, ingredient_name, or in ingredient object
          const ingredientName = ing.name || ing.ingredient_name || 
            (typeof ing.ingredient === 'object' ? ing.ingredient?.name : ing.ingredient);
          return ingredientName && typeof ingredientName === 'string' && ingredientName.trim();
        })
        .map((ing) => {
          // Backend now returns name, ingredient_name, or in ingredient object
          const ingredientName = ing.name || ing.ingredient_name || 
            (typeof ing.ingredient === 'object' ? (ing.ingredient?.name || '') : (ing.ingredient || ''));
          
          // Backend now returns unit_abbreviation, unit_name, or full unit object
          const unitAbbreviation = ing.unit_abbreviation || ing.unit?.abbreviation || 
            ing.unit_name || ing.unit?.name || 'g';
          
          const parsedQuantity = parseIngredientQuantity(ing);
          
          return {
            ingredient: ingredientName,
            amount: parsedQuantity,
            unit: unitAbbreviation,
          };
        }),
      householdId,
      createdAt: recipe.created_at || new Date().toISOString(),
      updatedAt: recipe.updated_at || new Date().toISOString(),
    }));
  },

  getById: async (id: string, householdId: string): Promise<Recipe | null> => {
    try {
      const response = await apiCall<{
        id: number | string;
        title: string;
        instructions: string;
        tags: string[];
        servings?: number;
        prep_time?: number;
        cook_time?: number;
        ingredients?: Array<{
          id?: number;
          name?: string;
          ingredient_name?: string;
          ingredient?: { id: number; name: string } | string;
          quantity: number;
          unit_name?: string;
          unit_abbreviation?: string;
          unit?: {
            id: number;
            name: string;
            abbreviation?: string;
          };
          unit_id?: number;
        }>;
        created_at?: string;
        updated_at?: string;
      }>(`/recipes/${id}`);
      
      // Transform backend response to frontend format
      return {
        id: String(response.id),
        title: response.title,
        instructions: response.instructions,
        tags: response.tags || [],
        servings: response.servings,
        prepTime: response.prep_time,
        cookTime: response.cook_time,
        ingredients: (response.ingredients || [])
          .filter((ing) => {
            // Filter out invalid ingredients
            if (!ing) return false;
            // Backend now returns name, ingredient_name, or in ingredient object
            const ingredientName = ing.name || ing.ingredient_name || 
              (typeof ing.ingredient === 'object' ? ing.ingredient?.name : ing.ingredient);
            return ingredientName && typeof ingredientName === 'string' && ingredientName.trim();
          })
          .map((ing) => {
            // Backend returns name, ingredient_name, or in ingredient object
            const ingredientName = ing.name || ing.ingredient_name || 
              (typeof ing.ingredient === 'object' ? (ing.ingredient?.name || '') : (ing.ingredient || ''));
            
            // Backend now returns full unit object with name and abbreviation
            const unitAbbreviation = ing.unit_abbreviation || ing.unit?.abbreviation || 
              ing.unit_name || ing.unit?.name || 'g';
            
            const parsedQuantity = parseIngredientQuantity(ing);
            
            return {
              ingredient: ingredientName,
              amount: parsedQuantity,
              unit: unitAbbreviation,
            };
          }),
        householdId,
        createdAt: response.created_at || new Date().toISOString(),
        updatedAt: response.updated_at || new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  },

  create: async (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipe> => {
    // Validate ingredients exist
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      throw new Error('Recipe must have at least one ingredient');
    }
    
    // Get units and ingredients to look up unit_id
    const [units, allIngredients] = await Promise.all([
      unitsAPI.getAll(),
      ingredientsAPI.getAll()
    ]);

    // Convert recipe ingredients from frontend format to backend format
    const convertedIngredients = recipe.ingredients.map((ing) => {
      // Validate ingredient name
      if (!ing.ingredient || !ing.ingredient.trim()) {
        throw new Error('Ingredient name is required');
      }

      // Ensure quantity is a valid number
      const quantity = typeof ing.amount === 'number' ? ing.amount : parseFloat(String(ing.amount));
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for ingredient "${ing.ingredient}": ${ing.amount}`);
      }
      if (quantity > 1000000) {
        throw new Error(`Quantity too large for ingredient "${ing.ingredient}". Maximum is 1,000,000.`);
      }

      // Try to find unit by abbreviation first (explicit unit from frontend)
      let unitId: number | undefined;
      if (ing.unit) {
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
        
        const unitName = unitMap[ing.unit.toLowerCase()] || ing.unit;
        const existingUnit = units.find(
          (u) => u.abbreviation.toLowerCase() === ing.unit.toLowerCase() || 
                 u.name.toLowerCase() === unitName.toLowerCase()
        );
        
        if (existingUnit) {
          unitId = typeof existingUnit.id === 'string' ? parseInt(existingUnit.id, 10) : existingUnit.id;
          unitId = Number(unitId);
          if (isNaN(unitId) || unitId <= 0) {
            unitId = undefined;
          }
        }
      }

      // If no explicit unit found, try to use ingredient's default unit_id
      if (!unitId) {
        const ingredientName = ing.ingredient.trim().toLowerCase();
        const existingIngredient = allIngredients.find(
          (ingItem) => ingItem.name.toLowerCase() === ingredientName
        );
        
        if (existingIngredient && existingIngredient.unit_id) {
          unitId = existingIngredient.unit_id;
        }
      }

      // Build converted ingredient
      const converted: {
        ingredient: string;
        quantity: number;
        unit_id?: number;
      } = {
        ingredient: ing.ingredient.trim(),
        quantity: Number(quantity),
      };
      
      // Only include unit_id if we found one (explicit or from ingredient default)
      if (unitId) {
        converted.unit_id = Number(unitId);
      }
      
      return converted;
    });
    
    // Validate that we have ingredients
    if (convertedIngredients.length === 0) {
      throw new Error('No valid ingredients to send. Please check your ingredient list.');
    }
    
    // Build request body matching backend format
    const requestBody: {
      title: string;
      instructions: string;
      tags: string[];
      ingredients: Array<{ ingredient: string; quantity: number; unit_id: number }>;
      prep_time?: number;
      cook_time?: number;
      servings?: number;
    } = {
      title: recipe.title,
      instructions: recipe.instructions,
      tags: recipe.tags || [],
      ingredients: convertedIngredients,
    };
    
    // Validate each ingredient has required fields
    convertedIngredients.forEach((ing, index) => {
      if (!ing.ingredient || !ing.unit_id || !ing.quantity) {
        throw new Error(`Ingredient at index ${index} is missing required fields: ${JSON.stringify(ing)}`);
      }
      if (typeof ing.unit_id !== 'number' || typeof ing.quantity !== 'number') {
        throw new Error(`Ingredient at index ${index} has invalid type: unit_id=${typeof ing.unit_id}, quantity=${typeof ing.quantity}`);
      }
    });

    if (recipe.prepTime !== undefined) {
      requestBody.prep_time = recipe.prepTime;
    }

    if (recipe.cookTime !== undefined) {
      requestBody.cook_time = recipe.cookTime;
    }

    if (recipe.servings !== undefined) {
      requestBody.servings = recipe.servings;
    }

    let response: {
      id: number | string;
      title: string;
      instructions: string;
      tags: string[];
      servings?: number;
      prep_time?: number;
      cook_time?: number;
      ingredients?: Array<{
        id?: number;
        name?: string;
        ingredient_name?: string;
        ingredient?: { id: number; name: string } | string;
        quantity: number;
        unit_name?: string;
        unit_abbreviation?: string;
        unit?: {
          id: number;
          name: string;
          abbreviation?: string;
        };
        unit_id?: number;
      }>;
      created_at?: string;
      updated_at?: string;
    };
    
    try {
      response = await apiCall<typeof response>('/recipes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    } catch (error: any) {
      // Handle household-specific ingredient validation errors
      const errorMessage = error?.message || 'Failed to create recipe';
      if (errorMessage.includes('does not belong to your household') || 
          errorMessage.includes('does not exist or does not belong')) {
        throw new Error(
          'One or more ingredients do not belong to your household. ' +
          'Please use ingredients from your household\'s ingredient list. ' +
          'You can add new ingredients to your household first.'
        );
      }
      throw error;
    }
    
    // Always fetch the full recipe to ensure we have ingredients
    // The backend might not include ingredients in the create response
    let fullRecipe = response;
    try {
      // Use the getById method from this same object
      const fetchedRecipe = await recipeAPI.getById(String(response.id), recipe.householdId);
      if (fetchedRecipe && fetchedRecipe.ingredients && fetchedRecipe.ingredients.length > 0) {
        return fetchedRecipe;
      } else if (fetchedRecipe) {
        fullRecipe = response; // Use original response if fetched one has no ingredients
      }
    } catch (error) {
      // Continue with original response if fetch fails
    }
    
    // Transform backend response to frontend format
    return {
      id: String(fullRecipe.id),
      title: fullRecipe.title,
      instructions: fullRecipe.instructions,
      tags: fullRecipe.tags || [],
      servings: fullRecipe.servings,
      prepTime: fullRecipe.prep_time,
      cookTime: fullRecipe.cook_time,
      ingredients: (fullRecipe.ingredients || [])
        .filter((ing) => {
          // Filter out invalid ingredients
          if (!ing) return false;
          // Backend now returns name, ingredient_name, or in ingredient object
          const ingredientName = ing.name || ing.ingredient_name || 
            (typeof ing.ingredient === 'object' ? ing.ingredient?.name : ing.ingredient);
          return ingredientName && typeof ingredientName === 'string' && ingredientName.trim();
        })
        .map((ing) => {
          // Backend now returns name, ingredient_name, or in ingredient object
          const ingredientName = ing.name || ing.ingredient_name || 
            (typeof ing.ingredient === 'object' ? (ing.ingredient?.name || '') : (ing.ingredient || ''));
          
          // Backend now returns unit_abbreviation, unit_name, or full unit object
          const unitAbbreviation = ing.unit_abbreviation || ing.unit?.abbreviation || 
            ing.unit_name || ing.unit?.name || 'g';
          
          // Parse quantity from backend response
          const parsedQuantity = parseIngredientQuantity(ing);
          
          return {
            ingredient: ingredientName,
            amount: parsedQuantity,
            unit: unitAbbreviation,
          };
        }),
      householdId: recipe.householdId,
      createdAt: fullRecipe.created_at || new Date().toISOString(),
      updatedAt: fullRecipe.updated_at || new Date().toISOString(),
    };
  },

  update: async (id: string, updates: Partial<Recipe>): Promise<Recipe> => {
    // Convert frontend format to backend format
    const requestBody: {
      title?: string;
      instructions?: string;
      tags?: string[];
      prep_time?: number;
      cook_time?: number;
      servings?: number;
      ingredients?: Array<{ ingredient: string; quantity: number; unit_id?: number }>;
    } = {};

    if (updates.title !== undefined) {
      requestBody.title = updates.title;
    }

    if (updates.instructions !== undefined) {
      requestBody.instructions = updates.instructions;
    }

    if (updates.tags !== undefined) {
      requestBody.tags = updates.tags;
    }

    if (updates.prepTime !== undefined) {
      requestBody.prep_time = updates.prepTime;
    }

    if (updates.cookTime !== undefined) {
      requestBody.cook_time = updates.cookTime;
    }

    if (updates.servings !== undefined) {
      requestBody.servings = updates.servings;
    }

    // Convert ingredients if provided
    if (updates.ingredients !== undefined && updates.ingredients.length > 0) {
      // Get units and ingredients to look up unit_id
      const [units, allIngredients] = await Promise.all([
        unitsAPI.getAll(),
        ingredientsAPI.getAll()
      ]);

      // Backend now accepts ingredient names directly
      // Backend will use ingredient's default unit_id if we don't provide one
      requestBody.ingredients = updates.ingredients.map((ing) => {
        // Ensure quantity is a valid number
        const quantity = typeof ing.amount === 'number' ? ing.amount : parseFloat(String(ing.amount));
        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity for ingredient "${ing.ingredient}": ${ing.amount}`);
        }
        if (quantity > 1000000) {
          throw new Error(`Quantity too large for ingredient "${ing.ingredient}". Maximum is 1,000,000.`);
        }

        // Try to find unit by abbreviation first (explicit unit from frontend)
        let unitId: number | undefined;
        if (ing.unit) {
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
          
          const unitName = unitMap[ing.unit.toLowerCase()] || ing.unit;
          const existingUnit = units.find(
            (u) => u.abbreviation.toLowerCase() === ing.unit.toLowerCase() || 
                   u.name.toLowerCase() === unitName.toLowerCase()
          );
          
          if (existingUnit) {
            unitId = typeof existingUnit.id === 'string' ? parseInt(existingUnit.id, 10) : existingUnit.id;
            unitId = Number(unitId);
            if (isNaN(unitId) || unitId <= 0) {
              unitId = undefined;
            }
          }
        }

        // If no explicit unit found, try to use ingredient's default unit_id
        if (!unitId) {
          const ingredientName = ing.ingredient.trim().toLowerCase();
          const existingIngredient = allIngredients.find(
            (ingItem) => ingItem.name.toLowerCase() === ingredientName
          );
          
          if (existingIngredient && existingIngredient.unit_id) {
            unitId = existingIngredient.unit_id;
          }
        }
        
        // Build converted ingredient
        const converted: {
          ingredient: string;
          quantity: number;
          unit_id?: number;
        } = {
          ingredient: ing.ingredient.trim(),
          quantity: Number(quantity),
        };
        
        // Only include unit_id if we found one (explicit or from ingredient default)
        if (unitId) {
          converted.unit_id = Number(unitId);
        }
        
        return converted;
      });
    }

    const response = await apiCall<{
      id: number | string;
      title: string;
      instructions: string;
      tags: string[];
      servings?: number;
      prep_time?: number;
      cook_time?: number;
      ingredients?: Array<{
        id?: number;
        name?: string;
        ingredient_name?: string;
        ingredient?: { id: number; name: string } | string;
        quantity: number;
        unit_name?: string;
        unit_abbreviation?: string;
        unit?: {
          id: number;
          name: string;
          abbreviation?: string;
        };
        unit_id?: number;
      }>;
      created_at?: string;
      updated_at?: string;
    }>(`/recipes/${id}/update`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    
    // Transform backend response to frontend format
    return {
      id: String(response.id),
      title: response.title,
      instructions: response.instructions,
      tags: response.tags || [],
      servings: response.servings,
      prepTime: response.prep_time,
      cookTime: response.cook_time,
      ingredients: (response.ingredients || [])
        .filter((ing) => {
          // Filter out invalid ingredients
          if (!ing) return false;
          // Backend now returns name, ingredient_name, or in ingredient object
          const ingredientName = ing.name || ing.ingredient_name || 
            (typeof ing.ingredient === 'object' ? ing.ingredient?.name : ing.ingredient);
          return ingredientName && typeof ingredientName === 'string' && ingredientName.trim();
        })
        .map((ing) => {
          // Backend now returns name, ingredient_name, or in ingredient object
          const ingredientName = ing.name || ing.ingredient_name || 
            (typeof ing.ingredient === 'object' ? (ing.ingredient?.name || '') : (ing.ingredient || ''));
          
          // Backend now returns unit_abbreviation, unit_name, or full unit object
          const unitAbbreviation = ing.unit_abbreviation || ing.unit?.abbreviation || 
            ing.unit_name || ing.unit?.name || 'g';
          
          // Parse quantity from backend response
          // If quantity is missing/null, try to use the original amount from the update request as fallback
          let parsedQuantity = parseIngredientQuantity(ing);
          
          // Fallback: if backend didn't return quantity, try to find it in the original update data
          if (parsedQuantity === 0 && updates.ingredients) {
            const originalIngredient = updates.ingredients.find(
              (origIng) => origIng.ingredient.trim().toLowerCase() === ingredientName.trim().toLowerCase()
            );
            if (originalIngredient && originalIngredient.amount != null) {
              const fallbackAmount = typeof originalIngredient.amount === 'number' 
                ? originalIngredient.amount 
                : parseFloat(String(originalIngredient.amount));
              if (!isNaN(fallbackAmount) && fallbackAmount > 0) {
                parsedQuantity = fallbackAmount;
              }
            }
          }
          
          return {
            ingredient: ingredientName,
            amount: parsedQuantity,
            unit: unitAbbreviation,
          };
        }),
      householdId: updates.householdId || '',
      createdAt: response.created_at || new Date().toISOString(),
      updatedAt: response.updated_at || new Date().toISOString(),
    };
  },

  delete: async (id: string, householdId: string): Promise<void> => {
    await apiCall(`/recipes/${id}/delete`, {
      method: 'POST',
    });
  },

  getSuggestionsFromPantry: async (householdId: string, useAI: boolean = false, limit: number = 5): Promise<RecipeSuggestion[]> => {
    return apiCall<RecipeSuggestion[]>(`/recipes/suggestions?use_ai=${useAI}&limit=${limit}`);
  },

  getSubstitutions: async (id: string): Promise<Array<{ missing_ingredient: string; substitution: string }>> => {
    return apiCall<Array<{ missing_ingredient: string; substitution: string }>>(`/recipes/${id}/substitutions`);
  },
};

