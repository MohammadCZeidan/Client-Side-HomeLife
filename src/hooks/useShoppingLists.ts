import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shoppingListAPI } from '../services';
import type { ShoppingList, ShoppingListItem } from '../types';
import { queryKeys } from './queryKeys';

// Get all shopping lists
export const useShoppingLists = (householdId: string) => {
  return useQuery({
    queryKey: queryKeys.shoppingLists.list(householdId),
    queryFn: () => shoppingListAPI.getAll(householdId),
    enabled: !!householdId,
    staleTime: 30000, // 30 seconds
  });
};

// Get single shopping list by ID
export const useShoppingList = (id: string, householdId: string) => {
  return useQuery({
    queryKey: queryKeys.shoppingLists.detail(id),
    queryFn: () => shoppingListAPI.getById(id, householdId),
    enabled: !!id && !!householdId,
    staleTime: 30000, // 30 seconds
  });
};

// Get or create default shopping list
export const useDefaultShoppingList = (householdId: string) => {
  return useQuery({
    queryKey: queryKeys.shoppingLists.default(householdId),
    queryFn: () => shoppingListAPI.getOrCreateDefaultList(householdId),
    enabled: !!householdId,
    staleTime: 60000, // 1 minute
  });
};

// Create shopping list
export const useCreateShoppingList = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (list: Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt'>) =>
      shoppingListAPI.create(list),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.list(householdId) });
    },
  });
};

// Update shopping list
export const useUpdateShoppingList = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ShoppingList> }) =>
      shoppingListAPI.update(id, updates, householdId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.detail(data.id) });
    },
  });
};

// Delete shopping list
export const useDeleteShoppingList = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => shoppingListAPI.delete(id, householdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.list(householdId) });
    },
  });
};

// Add items to shopping list
export const useAddShoppingListItems = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      listId,
      items,
    }: {
      listId: string;
      items: Omit<ShoppingListItem, 'id'>[];
    }) => shoppingListAPI.addItems(listId, items, householdId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.detail(data.id) });
    },
  });
};

// Update shopping list item
export const useUpdateShoppingListItem = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      listId,
      itemId,
      updates,
    }: {
      listId: string;
      itemId: string;
      updates: Partial<ShoppingListItem>;
    }) => shoppingListAPI.updateItem(listId, itemId, updates, householdId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.detail(variables.listId) });
    },
  });
};

// Delete shopping list item
export const useDeleteShoppingListItem = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      shoppingListAPI.deleteItem(listId, itemId, householdId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.detail(variables.listId) });
    },
  });
};

// Generate shopping list from meal plan
export const useGenerateShoppingList = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (weekStartDate: string) =>
      shoppingListAPI.generateFromMealPlan(householdId, weekStartDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.list(householdId) });
    },
  });
};

