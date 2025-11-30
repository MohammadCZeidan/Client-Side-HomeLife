import { apiCall } from './apiCall';

export const nutritionAPI = {
  getRecipeNutrition: async (recipeId: string): Promise<any> => {
    return apiCall(`/nutrition/recipes/${recipeId}`);
  },

  getWeekNutrition: async (weekId: string): Promise<any> => {
    return apiCall(`/nutrition/weeks/${weekId}`);
  },
};

