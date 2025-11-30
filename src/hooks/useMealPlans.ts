import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mealPlanAPI } from '../services';
import type { WeeklyPlan } from '../types';
import { queryKeys } from './queryKeys';

// Get weekly meal plan
export const useWeeklyPlan = (householdId: string, weekStartDate: string) => {
  return useQuery({
    queryKey: queryKeys.mealPlans.weekly(householdId, weekStartDate),
    queryFn: () => mealPlanAPI.getWeeklyPlan(householdId, weekStartDate),
    enabled: !!householdId && !!weekStartDate,
    staleTime: 60000, // 1 minute
  });
};

// Create or update weekly plan
export const useCreateWeeklyPlan = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (plan: Omit<WeeklyPlan, 'id' | 'createdAt' | 'updatedAt'>) =>
      mealPlanAPI.createWeeklyPlan(plan),
    onSuccess: (data) => {
      // Invalidate the specific week's plan
      if (data.startDate) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.mealPlans.weekly(householdId, data.startDate),
        });
      }
    },
  });
};

// Add meal to weekly plan
export const useAddMeal = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      planId,
      meal,
    }: {
      planId: string;
      meal: { recipeId: string; day: string; mealType: 'breakfast' | 'lunch' | 'dinner' };
    }) => mealPlanAPI.addMeal(planId, meal),
    onSuccess: (data) => {
      // Invalidate all weekly plans since we don't know which week
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans.all });
    },
  });
};

// Remove meal from weekly plan
export const useRemoveMeal = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ planId, mealId }: { planId: string; mealId: string }) =>
      mealPlanAPI.removeMeal(planId, mealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans.all });
    },
  });
};

