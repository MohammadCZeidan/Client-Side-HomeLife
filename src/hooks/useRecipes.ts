import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipeAPI } from '../services';
import type { Recipe, RecipeSuggestion } from '../types';
import { queryKeys } from './queryKeys';

// Get all recipes
export const useRecipes = (householdId: string) => {
  return useQuery({
    queryKey: queryKeys.recipes.list(householdId),
    queryFn: () => recipeAPI.getAll(householdId),
    enabled: !!householdId,
    staleTime: 30000, // 30 seconds
  });
};

// Get single recipe by ID
export const useRecipe = (id: string, householdId: string) => {
  return useQuery({
    queryKey: queryKeys.recipes.detail(id),
    queryFn: () => recipeAPI.getById(id, householdId),
    enabled: !!id && !!householdId,
    staleTime: 60000, // 1 minute
  });
};

// Create recipe
export const useCreateRecipe = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) =>
      recipeAPI.create(recipe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) });
    },
  });
};

// Update recipe
export const useUpdateRecipe = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Recipe> }) =>
      recipeAPI.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.detail(data.id) });
    },
  });
};

// Delete recipe
export const useDeleteRecipe = (householdId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id }: { id: string }) => recipeAPI.delete(id, householdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes.list(householdId) });
    },
  });
};

// Get recipe suggestions
export const useRecipeSuggestions = (
  householdId: string,
  useAI: boolean = false,
  limit: number = 5
) => {
  return useQuery({
    queryKey: queryKeys.recipes.suggestions(householdId, useAI, limit),
    queryFn: () => recipeAPI.getSuggestionsFromPantry(householdId, useAI, limit),
    enabled: !!householdId,
    staleTime: 120000, // 2 minutes
  });
};

// Get recipe substitutions
export const useRecipeSubstitutions = (id: string) => {
  return useQuery({
    queryKey: queryKeys.recipes.substitutions(id),
    queryFn: () => recipeAPI.getSubstitutions(id),
    enabled: !!id,
    staleTime: 300000, // 5 minutes
  });
};

