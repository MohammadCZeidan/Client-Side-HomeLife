// React Query cache keys - helps organize and invalidate queries
// Each resource gets its own set of keys so we can cache and refresh data properly

// Helper to create standard query key structure for each resource
// Saves me from writing the same pattern over and over
// Pattern: all, lists(), list(id), details(), detail(id)
function createResourceKeys(resourceName: string) {
  // Return an object with methods that build the key arrays
  const base = {
    // Root key for this resource: ['resourceName']
    all: [resourceName] as const,
    
    lists: () => [resourceName, 'list'] as const,

    list: (householdId: string) => [resourceName, 'list', householdId] as const,
    

    details: () => [resourceName, 'detail'] as const,

    detail: (id: string) => [resourceName, 'detail', id] as const,
  };
  
  return base;
}

export const queryKeys = {

  pantry: {

    ...createResourceKeys('pantry'),

    expiring: (householdId: string) => ['pantry', 'expiring', householdId] as const,
  },
  

  recipes: {

    ...createResourceKeys('recipes'),
    

    suggestions: (householdId: string, useAI: boolean, limit: number) => 
      ['recipes', 'suggestions', householdId, useAI, limit] as const,

    substitutions: (id: string) => ['recipes', 'substitutions', id] as const,
  },

  shoppingLists: {

    ...createResourceKeys('shoppingLists'),
    

    default: (householdId: string) => ['shoppingLists', 'default', householdId] as const,
  },

  expenses: {

    ...createResourceKeys('expenses'),
    

    summary: (householdId: string) => ['expenses', 'summary', householdId] as const,
  },

  mealPlans: {

    all: ['mealPlans'] as const,

    weekly: (householdId: string, weekStartDate: string) => 
      [...queryKeys.mealPlans.all, 'weekly', householdId, weekStartDate] as const,
  },

  ingredients: {

    ...createResourceKeys('ingredients'),
    

    list: (householdId: string, search?: string) => 
      ['ingredients', 'list', householdId, search] as const,
  },

  units: {

    all: ['units'] as const,
    
 
    list: () => [...queryKeys.units.all, 'list'] as const,
  },
} as const; 

