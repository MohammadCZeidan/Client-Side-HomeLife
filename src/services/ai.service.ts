import type { WeeklyInsight } from '../types';
import { insightsAPI } from './insights.service';
import { apiCall } from './apiCall';

export const aiAPI = {
   // Generate seed data using AI (ingredients with nutrition, recipes, pantry items)
  generateSeedData: async (): Promise<{ message: string; created: { ingredients: number; recipes: number; pantry_items: number } }> => {
    return apiCall('/ai/generate-seed-data', {
      method: 'POST',
    });
  },

  // Get recipe suggestions from pantry (enhanced with full recipe details)
  
  getRecipeSuggestionsFromPantry: async (limit: number = 5, useAI: boolean = true): Promise<{ suggestions: string[]; source: string }> => {
    return apiCall(`/ai/recipe-suggestions?limit=${limit}&use_ai=${useAI}`);
  },

  // Get smart substitutions for missing ingredients
   
  getSmartSubstitutions: async (ingredientId: string): Promise<{ substitution: string }> => {
    return apiCall(`/ai/substitutions/${ingredientId}`);
  },
   // Get weekly insights (legacy - for backward compatibility)

  getWeeklyInsights: async (householdId: string, weekStartDate?: string): Promise<WeeklyInsight> => {
    // Use current week if not provided
    const weekStart = weekStartDate || (() => {
      const now = new Date();
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - now.getDay());
      return sunday.toISOString().split('T')[0];
    })();
    return insightsAPI.getWeeklyInsights(householdId, weekStart);
  },
};

