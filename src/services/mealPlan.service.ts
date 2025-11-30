import type { Recipe, WeeklyPlan, PlannedMeal } from '../types';
import { apiCall } from './apiCall';
import { recipeAPI } from './recipes.service';

export const mealPlanAPI = {
  getWeeklyPlan: async (householdId: string, weekStartDate: string): Promise<WeeklyPlan | null> => {
    try {
      const response = await apiCall<{
        id: number | string | null;
        start_date: string;
        end_date?: string;
        meals?: Array<{
          id: number | string;
          recipe_id: number | string;
          recipe?: Recipe;
          day: string | number;
          meal_type?: string;
          slot?: string;
        }>;
        created_at?: string;
      }>(`/meal-plans?start_date=${weekStartDate}`);
      
      // If response has null id, return null (plan doesn't exist)
      if (!response || response.id === null || response.id === undefined) {
        return null;
      }
      
      // Fetch recipes for meals that don't have recipe objects
      const mealsWithRecipes = await Promise.all(
        (response.meals || []).map(async (meal) => {
          let recipe: Recipe | null = meal.recipe || null;
          
          // If recipe is missing, fetch it
          if (!recipe && meal.recipe_id) {
            try {
              recipe = await recipeAPI.getById(String(meal.recipe_id), householdId);
            } catch (error) {
              console.warn('Failed to fetch recipe for meal:', error);
            }
          }
          
          // Handle day - backend can return as number (0-6) or string
          let dayValue: PlannedMeal['day'];
          if (typeof meal.day === 'number') {
            const dayNames: PlannedMeal['day'][] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            dayValue = dayNames[meal.day] || 'monday';
          } else {
            dayValue = (meal.day as PlannedMeal['day']) || 'monday';
          }
          
          return {
            id: String(meal.id),
            recipeId: String(meal.recipe_id),
            recipe: recipe || {} as Recipe,
            day: dayValue,
            slot: (meal.meal_type || meal.slot || 'dinner') as PlannedMeal['slot'],
            weekStartDate: response.start_date,
            householdId,
          };
        })
      );
      
      return {
        id: String(response.id),
        weekStartDate: response.start_date,
        householdId,
        meals: mealsWithRecipes,
        createdAt: response.created_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get weekly plan:', error);
      return null;
    }
  },

  createWeeklyPlan: async (householdId: string, weekStartDate: string): Promise<WeeklyPlan> => {
    const response = await apiCall<{
      id: number | string;
      start_date: string;
      end_date?: string;
      meals?: Array<{
        id: number | string;
        recipe_id: number | string;
        recipe?: Recipe;
        day: string | number;
        meal_type?: string;
        slot?: string;
      }>;
      created_at?: string;
    }>('/meal-plans', {
      method: 'POST',
      body: JSON.stringify({ start_date: weekStartDate }),
    });
    
    if (!response || !response.id) {
      throw new Error('Failed to create weekly plan: Invalid response');
    }
    
    return {
      id: String(response.id),
      weekStartDate: response.start_date,
      householdId,
      meals: (response.meals || []).map((meal) => {
        let dayValue: PlannedMeal['day'];
        if (typeof meal.day === 'number') {
          const dayNames: PlannedMeal['day'][] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          dayValue = dayNames[meal.day] || 'monday';
        } else {
          dayValue = (meal.day as PlannedMeal['day']) || 'monday';
        }
        
        return {
          id: String(meal.id),
          recipeId: String(meal.recipe_id),
          recipe: meal.recipe || {} as Recipe,
          day: dayValue,
          slot: (meal.meal_type || meal.slot || 'dinner') as PlannedMeal['slot'],
          weekStartDate: response.start_date,
          householdId,
        };
      }),
      createdAt: response.created_at || new Date().toISOString(),
    };
  },

  addMeal: async (
    householdId: string,
    weekStartDate: string,
    meal: Omit<PlannedMeal, 'id' | 'recipe' | 'weekStartDate' | 'householdId'>
  ): Promise<PlannedMeal> => {
    // Get or create weekly plan first
    let plan = await mealPlanAPI.getWeeklyPlan(householdId, weekStartDate);
    
    // Check if plan doesn't exist or has null/invalid ID
    if (!plan || !plan.id || plan.id === 'null' || plan.id === null || String(plan.id).toLowerCase() === 'null') {
      try {
        console.log('Weekly plan not found or has invalid ID, creating new plan...');
        plan = await mealPlanAPI.createWeeklyPlan(householdId, weekStartDate);
      } catch (error) {
        console.error('Failed to create weekly plan:', error);
        throw new Error('Failed to create weekly plan. Please try again.');
      }
    }
    
    if (!plan || !plan.id) {
      throw new Error('Failed to get or create weekly plan: Plan is null or has no ID');
    }
    
    const planId = plan.id;
    // Double-check the planId is valid
    if (!planId || planId === 'null' || planId === null || String(planId).toLowerCase() === 'null') {
      throw new Error('Weekly plan has invalid ID. Please try refreshing the page.');
    }
    
    const planIdString = String(planId);
    const recipeIdNum = typeof meal.recipeId === 'string' ? parseInt(meal.recipeId, 10) : meal.recipeId;
    if (isNaN(recipeIdNum)) {
      throw new Error('Invalid recipe ID');
    }

    const dayMap: Record<string, number> = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
    };
    
    let dayValue: number | string;
    if (typeof meal.day === 'string') {
      const dayLower = meal.day.toLowerCase();
      if (dayMap[dayLower] !== undefined) {
        dayValue = dayMap[dayLower];
      } else {
        dayValue = meal.day;
      }
    } else if (typeof meal.day === 'number') {
      dayValue = meal.day;
    } else {
      dayValue = 0;
    }

    const mealType = meal.slot || 'dinner';

    const response = await apiCall<{
      id: number | string;
      recipe_id: number | string;
      recipe?: Recipe;
      day: number | string;
      meal_type?: string;
      slot?: string;
    }>(`/meal-plans/${planIdString}/meals`, {
      method: 'POST',
      body: JSON.stringify({
        recipe_id: recipeIdNum,
        day: dayValue,
        slot: mealType,
      }),
    });
    
    let recipe: Recipe | null = response.recipe || null;
    if (!recipe && response.recipe_id) {
      try {
        recipe = await recipeAPI.getById(String(response.recipe_id), householdId);
      } catch (error) {
        console.warn('Failed to fetch recipe details:', error);
      }
    }
    
    return {
      id: String(response.id),
      recipeId: String(response.recipe_id),
      recipe: recipe || {} as Recipe,
      day: response.day as PlannedMeal['day'],
      slot: (response.meal_type || response.slot || 'dinner') as PlannedMeal['slot'],
      weekStartDate,
      householdId,
    };
  },

  removeMeal: async (planId: string, mealId: string): Promise<void> => {
    await apiCall(`/meal-plans/${planId}/meals/${mealId}/delete`, {
      method: 'POST',
    });
  },
};

