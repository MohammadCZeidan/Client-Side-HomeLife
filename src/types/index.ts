// ============================================
// User & Authentication Types
// ============================================

// User interface - represents an authenticated user in the system
export interface User {
  // Unique identifier for the user
  id: string;
  // User's email address (used for login)
  email: string;
  // User's display name
  name: string;
  // User's role - determines permissions and access level
  role: 'admin' | 'member';
  // ID of household user belongs to (null if not in a household)
  householdId: string | null;
}

// Household interface - represents a household/group that users can join
export interface Household {
  // Unique identifier for the household
  id: string;
  // Display name of the household
  name: string;
  // Invite code for joining the household
  inviteCode: string;
  // Array of users who are members of this household
  members: User[];
  // ISO date string when household was created
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

