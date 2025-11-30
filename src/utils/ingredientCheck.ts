import type { Recipe, RecipeIngredient, PantryItem, ShoppingListItem } from '../types';

export interface IngredientCheckResult {
  hasEnough: boolean;
  missingIngredients: Array<{
    ingredient: string;
    needed: number;
    unit: string;
    available: number;
    shortfall: number;
  }>;
}

/**
 * Check if pantry has enough ingredients for a recipe
 */
export const checkIngredientAvailability = (
  recipe: Recipe,
  pantryItems: PantryItem[]
): IngredientCheckResult => {
  const missingIngredients: IngredientCheckResult['missingIngredients'] = [];

  for (const recipeIngredient of recipe.ingredients) {
    // Skip if ingredient is missing or invalid
    if (!recipeIngredient || typeof recipeIngredient !== 'object') {
      console.warn('Invalid recipe ingredient:', recipeIngredient);
      continue;
    }
    
    // Skip if ingredient name is missing or invalid
    if (!recipeIngredient.ingredient || typeof recipeIngredient.ingredient !== 'string' || !recipeIngredient.ingredient.trim()) {
      console.warn('Recipe ingredient missing name:', recipeIngredient);
      continue;
    }
    
    // Validate amount
    const needed = typeof recipeIngredient.amount === 'number' 
      ? recipeIngredient.amount 
      : (recipeIngredient.amount ? parseFloat(String(recipeIngredient.amount)) : 0);
    
    if (isNaN(needed) || needed <= 0) {
      console.warn('Recipe ingredient has invalid amount:', recipeIngredient);
      continue;
    }
    
    // Validate unit
    const unit = typeof recipeIngredient.unit === 'string' && recipeIngredient.unit.trim()
      ? recipeIngredient.unit.trim()
      : 'g'; // Default to grams if unit is missing
    
    // Find matching pantry items (case-insensitive ingredient name match)
    const pantryMatches = pantryItems.filter(
      (item) => {
        // Skip items with missing ingredient names
        if (!item || !item.ingredient || typeof item.ingredient !== 'string') {
          return false;
        }
        if (!item.quantity || item.quantity <= 0) {
          return false;
        }
        return item.ingredient.toLowerCase().trim() === recipeIngredient.ingredient.toLowerCase().trim();
      }
    );

    // Calculate total available quantity (sum all matching items)
    const totalAvailable = pantryMatches.reduce((sum, item) => {
      // Skip items with missing unit or quantity
      if (!item.unit || !item.quantity) {
        return sum;
      }
      // Try to convert units if they match or are compatible
      if (typeof item.unit === 'string' && typeof unit === 'string' &&
          item.unit.toLowerCase() === unit.toLowerCase()) {
        return sum + (typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0);
      }
      // For now, only match exact units. In a real app, you'd have unit conversion logic
      return sum;
    }, 0);

    const shortfall = needed - totalAvailable;

    if (shortfall > 0) {
      missingIngredients.push({
        ingredient: recipeIngredient.ingredient.trim(),
        needed,
        unit: unit,
        available: totalAvailable,
        shortfall,
      });
    }
  }

  return {
    hasEnough: missingIngredients.length === 0,
    missingIngredients,
  };
};

/**
 * Convert missing ingredients to shopping list items
 */
export const convertToShoppingListItems = (
  missingIngredients: IngredientCheckResult['missingIngredients'],
  listId: string
): Omit<ShoppingListItem, 'id'>[] => {
  return missingIngredients
    .filter((missing) => {
      // Only include valid missing ingredients
      return missing && 
             missing.ingredient && 
             typeof missing.ingredient === 'string' &&
             missing.ingredient.trim() &&
             missing.shortfall > 0 &&
             missing.unit &&
             typeof missing.unit === 'string' &&
             missing.unit.trim();
    })
    .map((missing) => ({
      name: `${missing.ingredient.trim()} - ${missing.shortfall} ${missing.unit.trim()}`,
      quantity: missing.shortfall,
      unit: missing.unit.trim(),
      bought: false,
      listId,
    }));
};

