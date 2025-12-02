import { useState, useEffect } from 'react';
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
  const { user, household } = useAuth();
  const { recipes, refreshRecipes } = useApp();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedMeal, setSelectedMeal] = useState<string>('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
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
  const weekStartDate = getWeekStartDate();

  useEffect(() => {
    if (householdId) {
      refreshRecipes();
      // Fetch weekly plan directly
      mealPlanAPI.getWeeklyPlan(householdId, weekStartDate).then(setWeeklyPlan).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  const handleMealSlotClick = (day: string, meal: string) => {
    setSelectedDay(day);
    setSelectedMeal(meal);
    setIsRecipeModalOpen(true);
  };

  const handleRecipeSelect = async (recipe: Recipe) => {
    console.log('handleRecipeSelect called with:', { recipe, selectedDay, selectedMeal, householdId, weekStartDate });
    
    if (!recipe || !householdId) {
      console.error('Recipe or household ID missing:', { recipe: !!recipe, householdId: !!householdId });
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Recipe or household ID missing. Please try again.',
        type: 'error',
      });
      return;
    }
    
    if (!selectedDay || !selectedMeal) {
      console.error('Day or meal not selected:', { selectedDay, selectedMeal });
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Day or meal not selected. Please try again.',
        type: 'error',
      });
      return;
    }
    
    if (isAddingMeal) {
      console.log('Already adding a meal, please wait...');
      return;
    }
    
    setIsAddingMeal(true);
    setSelectedRecipe(recipe);
    
    try {
      // Directly add meal to weekly plan
      const dayOfWeek = dayMap[selectedDay] as PlannedMeal['day'];
      const mealSlot = mealMap[selectedMeal] as PlannedMeal['slot'];

      console.log('Adding meal with:', {
        recipeId: recipe.id,
        day: dayOfWeek,
        slot: mealSlot,
        weekStartDate,
        householdId
      });

      await mealPlanAPI.addMeal(householdId, weekStartDate, {
        recipeId: recipe.id,
        day: dayOfWeek,
        slot: mealSlot,
      });
      
      console.log('Meal added, refreshing weekly plan...');
      
      // Close modal first
      setIsRecipeModalOpen(false);
      
      // Small delay to ensure backend has committed the meal
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh the weekly plan to show the new meal
      const updatedPlan = await mealPlanAPI.getWeeklyPlan(householdId, weekStartDate);
      console.log('Updated plan received:', updatedPlan);
      console.log('Updated plan meals:', updatedPlan?.meals);
      console.log('Week start date:', weekStartDate);
      
      if (updatedPlan) {
        setWeeklyPlan(updatedPlan);
        console.log('Weekly plan state updated with', updatedPlan.meals?.length || 0, 'meals');
      } else {
        console.warn('Updated plan is null, trying to create it...');
        // If plan is still null, try creating it
        const newPlan = await mealPlanAPI.createWeeklyPlan(householdId, weekStartDate);
        setWeeklyPlan(newPlan);
        console.log('Created new plan:', newPlan);
      }
      
      setSelectedRecipe(null);
      console.log('Meal added successfully!');
    } catch (error) {
      console.error('Failed to add meal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add meal. Please try again.';
      console.error('Error details:', errorMessage);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Failed to add meal: ${errorMessage}`,
        type: 'error',
      });
      // Reset state on error
      setSelectedRecipe(null);
    } finally {
      setIsAddingMeal(false);
    }
  };


  const getMealForSlot = (day: string, meal: string): PlannedMeal | null => {
    if (!weeklyPlan || !weeklyPlan.meals) {
      console.log('getMealForSlot: No weekly plan or meals', { weeklyPlan, day, meal });
      return null;
    }
    const dayOfWeek = dayMap[day];
    const mealSlot = mealMap[meal];
    const foundMeal = weeklyPlan.meals.find(
      (m) => m.day === dayOfWeek && m.slot === mealSlot
    );
    console.log('getMealForSlot:', { day, meal, dayOfWeek, mealSlot, foundMeal, allMeals: weeklyPlan.meals });
    return foundMeal || null;
  };

  return (
    <div className="weekly-plan-page">
      <DashboardNav />
      <div className="weekly-content">
        <h1 className="page-title">Weekly Plan</h1>
        
        <div className="plan-container">
          <div className="meals-sidebar">
            <div className="sidebar-spacer"></div>
            {meals.map((meal, index) => (
              <div key={index} className="meal-label">{meal}</div>
            ))}
          </div>

          <div className="plan-table">
            <div className="table-header">
              {days.map((day, index) => (
                <div key={index} className="day-header">{day}</div>
              ))}
            </div>
            <div className="table-body">
              {meals.map((meal, mealIndex) => (
                <div key={mealIndex} className="table-row">
                  {days.map((day, dayIndex) => {
                    const plannedMeal = getMealForSlot(day, meal);
                    return (
                      <div key={dayIndex} className="table-cell">
                        <div
                          className="meal-slot"
                          onClick={() => handleMealSlotClick(day, meal)}
                        >
                          {plannedMeal ? (
                            <div className="planned-meal">
                              <div className="meal-name">{plannedMeal.recipe.title}</div>
                            </div>
                          ) : (
                            <div className="empty-meal-slot">+ Add Meal</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Selection Modal */}
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

