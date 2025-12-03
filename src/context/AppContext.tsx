// React core hooks for context management and performance optimization
import { createContext, useContext, useMemo } from 'react';
// Type definition for React children prop
import type { ReactNode } from 'react';
// React Query hook to access the query client for cache management
import { useQueryClient } from '@tanstack/react-query';
// Custom hooks that fetch data using React Query for each resource type
// WHY THESE SPECIFIC HOOKS?
// These 4 hooks represent the CORE DATA that's needed across MULTIPLE pages:
// - usePantryItems: Used on HomePage (stats), PantryPage, RecipesPage (ingredient checking), ShoppingListPage
// - useRecipes: Used on HomePage (stats), RecipesPage, ShoppingListPage (meal plan generation)
// - useShoppingLists: Used on HomePage (stats), ShoppingListPage
// - useExpenses: Used on HomePage (stats), BudgetPage
// 
// NOT INCLUDED:
// - useMealPlans: Only used on WeeklyPlanPage, requires specific weekStartDate parameter (date-specific, not global)
// - useAdmin: Utility hook (not data-fetching), already available via AuthContext, only needed on admin pages
// - Other hooks: More specialized, used only on specific pages, or are mutation hooks (not list queries)
import {  usePantryItems,  useRecipes,  useShoppingLists,  useExpenses,} from '../hooks';
// Query key factory for consistent cache key generation
import { queryKeys } from '../hooks/queryKeys';

// TypeScript interface defining the shape of data available through the context
interface AppContextType {
  // Array of pantry items - extracted data type from usePantryItems hook
  pantryItems: ReturnType<typeof usePantryItems>['data'];
  // Array of recipes - extracted data type from useRecipes hook
  recipes: ReturnType<typeof useRecipes>['data'];
  // Array of shopping lists - extracted data type from useShoppingLists hook
  shoppingLists: ReturnType<typeof useShoppingLists>['data'];
  // Array of expenses - extracted data type from useExpenses hook
  expenses: ReturnType<typeof useExpenses>['data'];
  // Boolean indicating if any of the queries are currently loading
  loading: boolean;
  // Current household identifier for filtering data
  householdId: string;
  // Async function to refresh pantry items by invalidating React Query cache
  refreshPantry: () => Promise<void>;
  // Async function to refresh recipes by invalidating React Query cache
  refreshRecipes: () => Promise<void>;
  // Async function to refresh shopping lists by invalidating React Query cache
  refreshShoppingLists: () => Promise<void>;
  // Async function to refresh expenses by invalidating React Query cache
  refreshExpenses: () => Promise<void>;
}

// Create React context with undefined as default to detect usage outside provider
const AppContext = createContext<AppContextType | undefined>(undefined);

// Props interface for the AppProvider component
interface AppProviderProps {
  // React components that will have access to the context
  children: ReactNode;
  // Household ID to filter and fetch data for specific household
  householdId: string;
}

// Main provider component that wraps the app and provides data to all children
// ARCHITECTURE EXPLANATION:
// - AppContext is GENERAL - it wraps the ENTIRE app (see main.tsx)
// - These hooks are called ONCE here at the app level (not in individual pages)
// - All pages access the SAME data through useApp() hook
// - This means: ONE fetch per data type, shared across ALL pages
// - Pages use: const { pantryItems, recipes } = useApp() (NOT usePantryItems directly)
// - Benefits: No duplicate API calls, consistent data across pages, centralized loading states
export const AppProvider = ({ children, householdId }: AppProviderProps) => {
  // Fetch pantry items using React Query hook - automatically handles caching and refetching
  // Called ONCE here - all pages share this same data instance
  const pantryQuery = usePantryItems(householdId);
  // Fetch recipes using React Query hook - automatically handles caching and refetching
  // Called ONCE here - all pages share this same data instance
  const recipesQuery = useRecipes(householdId);
  // Fetch shopping lists using React Query hook - automatically handles caching and refetching
  // Called ONCE here - all pages share this same data instance
  const shoppingListsQuery = useShoppingLists(householdId);
  // Fetch expenses using React Query hook - automatically handles caching and refetching
  // Called ONCE here - all pages share this same data instance
  const expensesQuery = useExpenses(householdId);
  
  // Get React Query client instance to manually manage cache invalidation
  const queryClient = useQueryClient();

  // Memoized loading state - recalculates only when any query loading state changes
  // Returns true if ANY of the four queries are currently loading
  const loading = useMemo(
    () =>
      pantryQuery.isLoading ||
      recipesQuery.isLoading ||
      shoppingListsQuery.isLoading ||
      expensesQuery.isLoading,
    // Dependencies array - useMemo will recalculate when any of these change
    [
      pantryQuery.isLoading,
      recipesQuery.isLoading,
      shoppingListsQuery.isLoading,
      expensesQuery.isLoading,
    ]
  );

  // Async function to refresh pantry items by invalidating their cache entry
  // This triggers React Query to refetch the data automatically
  const refreshPantry = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.pantry.list(householdId) });
  };

  // Async function to refresh recipes by invalidating their cache entry
  // This triggers React Query to refetch the data automatically
  const refreshRecipes = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) });
  };

  // Async function to refresh shopping lists by invalidating their cache entry
  // This triggers React Query to refetch the data automatically
  const refreshShoppingLists = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.list(householdId) });
  };

  // Async function to refresh expenses by invalidating their cache entry
  // This triggers React Query to refetch the data automatically
  const refreshExpenses = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list(householdId) });
  };

  // Render the context provider with all data, loading state, and refresh functions
  return (
    <AppContext.Provider
      value={{
        // Provide pantry items data, default to empty array if undefined
        pantryItems: pantryQuery.data || [],
        // Provide recipes data, default to empty array if undefined
        recipes: recipesQuery.data || [],
        // Provide shopping lists data, default to empty array if undefined
        shoppingLists: shoppingListsQuery.data || [],
        // Provide expenses data, default to empty array if undefined
        expenses: expensesQuery.data || [],
        // Provide computed loading state
        loading,
        // Provide household ID for components that need it
        householdId,
        // Provide refresh functions so components can trigger data refetch
        refreshPantry,
        refreshRecipes,
        refreshShoppingLists,
        refreshExpenses,
      }}
    >
      {/* Render all child components that will have access to this context */}
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to access the AppContext - provides type safety and error handling
export const useApp = () => {
  // Get the context value - will be undefined if used outside AppProvider
  const context = useContext(AppContext);
  // Safety check: throw error if hook is used outside the provider
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  // Return the context value with all data, loading state, and refresh functions
  return context;
};

