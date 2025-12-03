import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetAPI } from '../services';
import type { Expense } from '../types';
import { queryKeys } from './queryKeys';

// Get all expenses
export const useExpenses = (householdId: string) => {
  return useQuery({
    queryKey: queryKeys.expenses.list(householdId),
    queryFn: () => budgetAPI.getAll(householdId),
      
    staleTime: 30000, // 30 seconds
  });
};

// Get expense summary
export const useExpenseSummary = (householdId: string) => {
  return useQuery({
    queryKey: queryKeys.expenses.summary(householdId),
    queryFn: () => budgetAPI.getSummary(householdId),
    enabled: !!householdId,
    staleTime: 60000, // 1 minute
  });
};

// Create expense
export const useCreateExpense = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) =>
      budgetAPI.create(expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.summary(householdId) });
    },
  });
};

// Update expense
export const useUpdateExpense = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Expense> }) =>
      budgetAPI.update(id, updates, householdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.summary(householdId) });
    },
  });
};

// Delete expense
export const useDeleteExpense = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => budgetAPI.delete(id, householdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.summary(householdId) });
    },
  });
};

