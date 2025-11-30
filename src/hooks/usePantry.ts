import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pantryAPI } from '../services';
import type { PantryItem } from '../types';
import { queryKeys } from './queryKeys';

// Get all pantry items
export const usePantryItems = (householdId: string) => {
  return useQuery({
    queryKey: queryKeys.pantry.list(householdId),
    queryFn: () => pantryAPI.getAll(householdId),
    enabled: !!householdId,
    staleTime: 30000, // 30 seconds
  });
};

// Get expiring items
export const useExpiringItems = (householdId: string, days: number = 7) => {
  return useQuery({
    queryKey: [...queryKeys.pantry.expiring(householdId), days],
    queryFn: () => pantryAPI.getExpiringSoon(householdId, days),
    enabled: !!householdId,
    staleTime: 60000, // 1 minute
  });
};

// Create pantry item
export const useCreatePantryItem = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (item: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'>) =>
      pantryAPI.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.expiring(householdId) });
    },
  });
};

// Update pantry item
export const useUpdatePantryItem = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PantryItem> }) =>
      pantryAPI.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.expiring(householdId) });
    },
  });
};

// Delete pantry item
export const useDeletePantryItem = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => pantryAPI.delete(id, householdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.expiring(householdId) });
    },
  });
};

// Consume pantry item
export const useConsumePantryItem = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      pantryAPI.consume(id, quantity, householdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantry.list(householdId) });
    },
  });
};

