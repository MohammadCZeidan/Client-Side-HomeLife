// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  householdId: string | null;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  members: User[];
  createdAt: string;
}

// Pantry Types
export interface PantryItem {
  id: string;
  ingredient: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  location: 'Fridge' | 'Freezer' | 'Pantry' | 'Other';
  dateBought: string;
  householdId: string;
  createdAt: string;
  updatedAt: string;
}

// Recipe Types
export interface RecipeIngredient {
  ingredient: string;
  amount: number;
  unit: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface Recipe {
  id: string;
  title: string;
  instructions: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  householdId: string;
  createdAt: string;
  updatedAt: string;
}

// Meal Planning Types
export type MealSlot = 'breakfast' | 'lunch' | 'dinner';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface PlannedMeal {
  id: string;
  recipeId: string;
  recipe: Recipe;
  day: DayOfWeek;
  slot: MealSlot;
  weekStartDate: string;
  householdId: string;
}

export interface WeeklyPlan {
  id: string;
  weekStartDate: string;
  householdId: string;
  meals: PlannedMeal[];
  createdAt: string;
}

// Shopping List Types
export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  bought: boolean;
  listId: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  householdId: string;
  createdAt: string;
  updatedAt: string;
}

// Budget Types
export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: string;
  note: string;
  store?: string;
  receiptLink?: string;
  householdId: string;
  createdAt: string;
}

export interface BudgetSummary {
  thisWeek: number;
  thisMonth: number;
  averagePerWeek: number;
}

// AI Features Types
export interface RecipeSuggestion {
  recipe: Recipe;
  reason: string;
  missingIngredients: string[];
}

export interface WeeklyInsight {
  week: {
    start_date: string;
    end_date: string;
  };
  spending: {
    total: number;
    count: number;
    average_per_transaction: number;
    by_category: Record<string, number>;
  };
  waste: {
    count: number;
    items: Array<{
      ingredient: string;
      quantity: number;
      expiry_date: string;
    }>;
  };
  planning: {
    meals_planned: number;
    by_slot: {
      breakfast: number;
      lunch: number;
      dinner: number;
      snack: number;
    };
    coverage: number;
  };
  expiring_soon: Array<{
    ingredient: string;
    quantity: number;
    expiry_date: string;
    days_until_expiry: number;
  }>;
  ai_summary: string | null;
}

