// React Query hooks for data fetching and mutations
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Pantry API service functions
import { pantryAPI } from '../services';
// TypeScript type for PantryItem
import type { PantryItem } from '../types';
// Query key factory for consistent cache key generation
import { queryKeys } from './queryKeys';

// Hook to fetch all pantry items for a household
// Returns React Query object with data, loading, error states
export const usePantryItems = (householdId: string) => {
  return useQuery({
    // Unique cache key for this query - includes householdId for proper caching
    queryKey: queryKeys.pantry.list(householdId),
    // Function that fetches pantry items from API
    queryFn: () => pantryAPI.getAll(householdId),
    // Only run query if householdId exists (prevents unnecessary API calls)
    enabled: !!householdId,
    // Data is considered fresh for 30 seconds before refetching
    staleTime: 30000, // 30 seconds
  });
};

// Hook to fetch pantry items expiring within specified days
// Returns React Query object with expiring items data
export const useExpiringItems = (householdId: string, days: number = 7) => {
  return useQuery({
    // Cache key includes householdId and days parameter
    queryKey: [...queryKeys.pantry.expiring(householdId), days],
    // Function that fetches expiring items from API
    queryFn: () => pantryAPI.getExpiringSoon(householdId, days),
    // Only run query if householdId exists
    enabled: !!householdId,
    // Expiring items data is fresh for 1 minute (more stable than full list)
    staleTime: 60000, // 1 minute
  });
};

// Hook to create a new pantry item
// Returns mutation object with mutate function and loading/error states
export const useCreatePantryItem = (householdId: string) => {
  // Get query client to invalidate cache after mutation
  const queryClient = useQueryClient();
  
  return useMutation({
    // Mutation function - creates pantry item via API
    // Omit id, createdAt, updatedAt since backend generates these
    mutationFn: (item: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'>) =>
      pantryAPI.create(item),
    // After successful creation, invalidate related queries to refetch fresh data
    onSuccess: () => {
      // Invalidate full pantry list to show new item
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.list(householdId) });
      // Invalidate expiring items list in case new item affects it
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.expiring(householdId) });
    },
  });
};

// Hook to update an existing pantry item
// Returns mutation object with mutate function and loading/error states
export const useUpdatePantryItem = (householdId: string) => {
  // Get query client to invalidate cache after mutation
  const queryClient = useQueryClient();
  
  return useMutation({
    // Mutation function - updates pantry item via API
    // Takes item ID and partial updates object
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PantryItem> }) =>
      pantryAPI.update(id, updates),
    // After successful update, invalidate related queries to refetch fresh data
    onSuccess: () => {
      // Invalidate full pantry list to show updated item
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.list(householdId) });
      // Invalidate expiring items list in case update affects expiration
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.expiring(householdId) });
    },
  });
};

// Hook to delete a pantry item
// Returns mutation object with mutate function and loading/error states
export const useDeletePantryItem = (householdId: string) => {
  // Get query client to invalidate cache after mutation
  const queryClient = useQueryClient();
  
  return useMutation({
    // Mutation function - deletes pantry item via API
    mutationFn: (id: string) => pantryAPI.delete(id, householdId),
    // After successful deletion, invalidate related queries to refetch fresh data
    onSuccess: () => {
      // Invalidate full pantry list to remove deleted item
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.list(householdId) });
      // Invalidate expiring items list in case deleted item was expiring
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.expiring(householdId) });
    },
  });
};

// Hook to consume (reduce quantity) of a pantry item
// Returns mutation object with mutate function and loading/error states
export const useConsumePantryItem = (householdId: string) => {
  // Get query client to invalidate cache after mutation
  const queryClient = useQueryClient();
  
  return useMutation({
    // Mutation function - consumes specified quantity of pantry item via API
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      pantryAPI.consume(id, quantity, householdId),
    // After successful consumption, invalidate pantry list to show updated quantity
    onSuccess: () => {
      // Invalidate full pantry list to show reduced quantity
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.list(householdId) });
    },
  });
};

