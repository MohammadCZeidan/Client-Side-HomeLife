import { useState, useEffect, useMemo } from 'react';
import DashboardNav from '../components/DashboardNav';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { mealPlanAPI } from '../services';
import { getWeekStartDate } from '../utils/dateUtils';
import type { Recipe, PlannedMeal, WeeklyPlan } from '../types';
import './WeeklyPlanPage.css';

const WeeklyPlanPage = () => {
  const { user, household, loading: authLoading } = useAuth();
  const { recipes, refreshRecipes } = useApp();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedMeal, setSelectedMeal] = useState<string>('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [isRemovingMeal, setIsRemovingMeal] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayMap: Record<string, string> = {
    'Mon': 'monday',
    'Tue': 'tuesday',
    'Wed': 'wednesday',
    'Thu': 'thursday',
    'Fri': 'friday',
    'Sat': 'saturday',
    'Sun': 'sunday',
  };
  const mealMap: Record<string, string> = {
    'Breakfast': 'breakfast',
    'Lunch': 'lunch',
    'Dinner': 'dinner',
  };
  const meals = ['Breakfast', 'Lunch', 'Dinner'];

  const householdId = household?.id || user?.householdId || '';
  const weekStartDate = useMemo(() => getWeekStartDate(), []);

  useEffect(() => {
    const loadWeeklyPlan = async () => {
      if (authLoading || !householdId) {
        return;
      }
      
      try {
        await refreshRecipes();
        const plan = await mealPlanAPI.getWeeklyPlan(householdId, weekStartDate);
        setWeeklyPlan(plan || null);
      } catch (error) {
        console.error('Failed to load weekly plan:', error);
        setWeeklyPlan(null);
      }
    };

    loadWeeklyPlan();
  }, [householdId, weekStartDate, authLoading, household, user, refreshRecipes]);

  const handleMealSlotClick = (day: string, meal: string) => {
    setSelectedDay(day);
    setSelectedMeal(meal);
    setIsRecipeModalOpen(true);
  };

  const handleRecipeSelect = async (recipe: Recipe) => {
    if (!recipe || !householdId) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Recipe or household ID missing. Please try again.',
        type: 'error',
      });
      return;
    }
    
    if (!selectedDay || !selectedMeal) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Day or meal not selected. Please try again.',
        type: 'error',
      });
      return;
    }
    
    if (isAddingMeal) {
      return;
    }
    
    setIsAddingMeal(true);
    setSelectedRecipe(recipe);
    
    try {
      const dayOfWeek = dayMap[selectedDay] as PlannedMeal['day'];
      const mealSlot = mealMap[selectedMeal] as PlannedMeal['slot'];

      await mealPlanAPI.addMeal(householdId, weekStartDate, {
        recipeId: recipe.id,
        day: dayOfWeek,
        slot: mealSlot,
      });
      
      setIsRecipeModalOpen(false);
      setSelectedDay('');
      setSelectedMeal('');
      
      const updatedPlan = await mealPlanAPI.getWeeklyPlan(householdId, weekStartDate);
      if (updatedPlan) {
        setWeeklyPlan(updatedPlan);
      } else {
        const newPlan = await mealPlanAPI.createWeeklyPlan(householdId, weekStartDate);
        setWeeklyPlan(newPlan);
      }
      
      setSelectedRecipe(null);
    } catch (error) {
      console.error('Failed to add meal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add meal. Please try again.';
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Failed to add meal: ${errorMessage}`,
        type: 'error',
      });
      setSelectedRecipe(null);
    } finally {
      setIsAddingMeal(false);
    }
  };


  const getMealForSlot = (day: string, meal: string): PlannedMeal | null => {
    if (!weeklyPlan?.meals || weeklyPlan.meals.length === 0) {
      return null;
    }
    
    const dayOfWeek = dayMap[day];
    const mealSlot = mealMap[meal];
    
    const foundMeal = weeklyPlan.meals.find((m) => {
      if (!m) return false;
      
      let mealDay = m.day;
      if (typeof mealDay === 'number') {
        const dayNames: PlannedMeal['day'][] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        mealDay = dayNames[mealDay] || 'monday';
      }
      
      const mealSlotNormalized = (m.slot || '').toLowerCase();
      const targetSlotNormalized = (mealSlot || '').toLowerCase();
      
      return String(mealDay).toLowerCase() === String(dayOfWeek).toLowerCase() && 
             mealSlotNormalized === targetSlotNormalized;
    });
    
    return foundMeal || null;
  };

  const handleRemoveMeal = async (e: React.MouseEvent, plannedMeal: PlannedMeal) => {
    e.stopPropagation();
    
    if (!householdId || !weeklyPlan?.id) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Missing information. Please try again.',
        type: 'error',
      });
      return;
    }

    setIsRemovingMeal(plannedMeal.id);
    
    try {
      await mealPlanAPI.removeMeal(weeklyPlan.id, plannedMeal.id);
      const updatedPlan = await mealPlanAPI.getWeeklyPlan(householdId, weekStartDate);
      setWeeklyPlan(updatedPlan || null);
    } catch (error) {
      console.error('Failed to remove meal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove meal. Please try again.';
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Failed to remove meal: ${errorMessage}`,
        type: 'error',
      });
    } finally {
      setIsRemovingMeal(null);
    }
  };

  const getMealsForDay = (day: string): { meal: string; plannedMeal: PlannedMeal | null }[] => {
    return meals.map((meal) => ({
      meal,
      plannedMeal: getMealForSlot(day, meal),
    }));
  };

  return (
    <div className="weekly-plan-page">
      <DashboardNav />
      <div className="weekly-content">
        <div className="weekly-header">
          <h1 className="page-title">Weekly Meal Plan</h1>
          <div className="week-info">
            <span className="week-date">{weekStartDate}</span>
          </div>
        </div>
        
        <div className="days-grid">
          {days.map((day, dayIndex) => {
            const dayMeals = getMealsForDay(day);
            return (
              <div key={`day-${day}-${dayIndex}`} className="day-card">
                <div className="day-card-header">
                  <h2 className="day-name">{day}</h2>
                  <span className="day-number">{dayIndex + 1}</span>
                </div>
                <div className="meals-container">
                  {dayMeals.map(({ meal, plannedMeal }, mealIndex) => {
                    const uniqueKey = `${day}-${meal}-${mealIndex}`;
                    return (
                      <div key={uniqueKey} className="meal-card">
                        <div className="meal-type">{meal}</div>
                        <div
                          className="meal-content"
                          onClick={() => !plannedMeal && handleMealSlotClick(day, meal)}
                        >
                          {plannedMeal ? (
                            <div className="meal-recipe">
                              <div className="recipe-info">
                                <div className="recipe-title">
                                  {plannedMeal.recipe?.title || `Recipe ${plannedMeal.recipeId}`}
                                </div>
                                {plannedMeal.recipe?.ingredients && (
                                  <div className="recipe-ingredients">
                                    {plannedMeal.recipe.ingredients.length} ingredients
                                  </div>
                                )}
                              </div>
                              <button
                                className="remove-meal-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveMeal(e, plannedMeal);
                                }}
                                disabled={isRemovingMeal === plannedMeal.id}
                                title="Remove recipe"
                              >
                                {isRemovingMeal === plannedMeal.id ? '...' : '×'}
                              </button>
                            </div>
                          ) : (
                            <div className="meal-empty">
                              <span className="add-icon">+</span>
                              <span className="add-text">Add Recipe</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        title={`Select Recipe for ${selectedMeal} - ${selectedDay}`}
      >
        <div className="recipe-selection">
          {recipes && recipes.length > 0 ? (
            <div className="recipes-list">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="recipe-option"
                  onClick={() => !isAddingMeal && handleRecipeSelect(recipe)}
                  style={{ 
                    cursor: isAddingMeal ? 'wait' : 'pointer',
                    opacity: isAddingMeal ? 0.6 : 1
                  }}
                >
                  <h3>{recipe.title}</h3>
                  <p>{recipe.ingredients.length} ingredients</p>
                  {isAddingMeal && selectedRecipe?.id === recipe.id && (
                    <p style={{ color: 'blue', fontSize: '0.8em' }}>Adding...</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No recipes available. Create a recipe first!</p>
          )}
        </div>
      </Modal>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

export default WeeklyPlanPage;

