// Helper function to parse ingredient quantity from backend response
export const parseIngredientQuantity = (ing: any): number => {
  // Check quantity field first - allow 0 as valid value
  if (typeof ing.quantity === 'number' && !isNaN(ing.quantity) && ing.quantity >= 0) {
    return ing.quantity;
  }
  
  // Try parsing as string - allow 0 as valid value
  if (ing.quantity != null && ing.quantity !== '' && ing.quantity !== undefined) {
    const parsed = parseFloat(String(ing.quantity));
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  
  // Only log warning if quantity is invalid (not just missing/null, which might be expected)
  // Log once per unique ingredient to avoid console spam
  if (ing.quantity != null && ing.quantity !== '' && ing.quantity !== undefined) {
    const parsed = parseFloat(String(ing.quantity));
    if (isNaN(parsed)) {
      console.warn(`Warning: Invalid quantity value for ingredient "${ing.name || ing.ingredient_name || 'unknown'}". Value:`, ing.quantity, 'Type:', typeof ing.quantity);
    }
  }
  
  // Return 0 as default (valid value according to API spec: min: 0)
  // Missing/null quantities are silently defaulted to 0
  return 0;
};

