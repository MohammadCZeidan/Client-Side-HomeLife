import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePantryItems,
  useRecipes,
  useShoppingLists,
  useExpenses,
} from '../hooks';
import { queryKeys } from '../hooks/queryKeys';

interface AppContextType {
  pantryItems: ReturnType<typeof usePantryItems>['data'];
  recipes: ReturnType<typeof useRecipes>['data'];
  shoppingLists: ReturnType<typeof useShoppingLists>['data'];
  expenses: ReturnType<typeof useExpenses>['data'];
  loading: boolean;
  householdId: string;
  refreshPantry: () => Promise<void>;
  refreshRecipes: () => Promise<void>;
  refreshShoppingLists: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
  householdId: string;
}

export const AppProvider = ({ children, householdId }: AppProviderProps) => {
  // Use React Query hooks
  const pantryQuery = usePantryItems(householdId);
  const recipesQuery = useRecipes(householdId);
  const shoppingListsQuery = useShoppingLists(householdId);
  const expensesQuery = useExpenses(householdId);
  
  const queryClient = useQueryClient();

  // Calculate loading state
  const loading = useMemo(
    () =>
      pantryQuery.isLoading ||
      recipesQuery.isLoading ||
      shoppingListsQuery.isLoading ||
      expensesQuery.isLoading,
    [
      pantryQuery.isLoading,
      recipesQuery.isLoading,
      shoppingListsQuery.isLoading,
      expensesQuery.isLoading,
    ]
  );

  // Refresh functions using React Query
  const refreshPantry = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.pantry.list(householdId) });
  };

  const refreshRecipes = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) });
  };

  const refreshShoppingLists = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.list(householdId) });
  };

  const refreshExpenses = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list(householdId) });
  };

  return (
    <AppContext.Provider
      value={{
        pantryItems: pantryQuery.data || [],
        recipes: recipesQuery.data || [],
        shoppingLists: shoppingListsQuery.data || [],
        expenses: expensesQuery.data || [],
        loading,
        householdId,
        refreshPantry,
        refreshRecipes,
        refreshShoppingLists,
        refreshExpenses,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

