// Query keys for React Query
export const queryKeys = {
  // Pantry
  pantry: {
    all: ['pantry'] as const,
    lists: () => [...queryKeys.pantry.all, 'list'] as const,
    list: (householdId: string) => [...queryKeys.pantry.lists(), householdId] as const,
    details: () => [...queryKeys.pantry.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.pantry.details(), id] as const,
    expiring: (householdId: string) => [...queryKeys.pantry.all, 'expiring', householdId] as const,
  },
  
  // Recipes
  recipes: {
    all: ['recipes'] as const,
    lists: () => [...queryKeys.recipes.all, 'list'] as const,
    list: (householdId: string) => [...queryKeys.recipes.lists(), householdId] as const,
    details: () => [...queryKeys.recipes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.recipes.details(), id] as const,
    suggestions: (householdId: string, useAI: boolean, limit: number) => 
      [...queryKeys.recipes.all, 'suggestions', householdId, useAI, limit] as const,
    substitutions: (id: string) => [...queryKeys.recipes.all, 'substitutions', id] as const,
  },
  
  // Shopping Lists
  shoppingLists: {
    all: ['shoppingLists'] as const,
    lists: () => [...queryKeys.shoppingLists.all, 'list'] as const,
    list: (householdId: string) => [...queryKeys.shoppingLists.lists(), householdId] as const,
    details: () => [...queryKeys.shoppingLists.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.shoppingLists.details(), id] as const,
    default: (householdId: string) => [...queryKeys.shoppingLists.all, 'default', householdId] as const,
  },
  
  // Expenses
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    list: (householdId: string) => [...queryKeys.expenses.lists(), householdId] as const,
    details: () => [...queryKeys.expenses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.expenses.details(), id] as const,
    summary: (householdId: string) => [...queryKeys.expenses.all, 'summary', householdId] as const,
  },
  
  // Meal Plans
  mealPlans: {
    all: ['mealPlans'] as const,
    weekly: (householdId: string, weekStartDate: string) => 
      [...queryKeys.mealPlans.all, 'weekly', householdId, weekStartDate] as const,
  },
  
  // Ingredients
  ingredients: {
    all: ['ingredients'] as const,
    lists: () => [...queryKeys.ingredients.all, 'list'] as const,
    list: (householdId: string, search?: string) => 
      [...queryKeys.ingredients.lists(), householdId, search] as const,
    details: () => [...queryKeys.ingredients.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.ingredients.details(), id] as const,
  },
  
  // Units
  units: {
    all: ['units'] as const,
    list: () => [...queryKeys.units.all, 'list'] as const,
  },
} as const;

