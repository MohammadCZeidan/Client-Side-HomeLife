import { useState, useEffect } from 'react';
import DashboardNav from '../components/DashboardNav';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { recipeAPI, pantryAPI, aiAPI } from '../services';
import type { Recipe, RecipeIngredient } from '../types';
import './RecipesPage.css';

const RecipesPage = () => {
  const { user, household } = useAuth();
  const { recipes, refreshRecipes, pantryItems, refreshPantry } = useApp();
  
  // Safety check
  if (!recipes) {
    console.warn('Recipes is undefined in RecipesPage');
  }
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    instructions: '',
    tags: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    ingredients: [] as Omit<RecipeIngredient, 'calories' | 'protein' | 'carbs' | 'fat'>[],
  });
  const [newIngredient, setNewIngredient] = useState({
    ingredient: '',
    amount: '',
    unit: 'g',
  });
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string>('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [substitutions, setSubstitutions] = useState<Array<{ missing_ingredient: string; substitution: string }>>([]);
  const [isLoadingSubstitutions, setIsLoadingSubstitutions] = useState(false);
  const [deleteRecipeConfirm, setDeleteRecipeConfirm] = useState<{ isOpen: boolean; recipe: Recipe | null }>({
    isOpen: false,
    recipe: null,
  });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  const householdId = household?.id || user?.householdId || '';

  useEffect(() => {
    if (householdId) {
      refreshRecipes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  const handleAddRecipe = () => {
    setFormData({
      title: '',
      instructions: '',
      tags: '',
      prepTime: '',
      cookTime: '',
      servings: '',
      ingredients: [],
    });
    setNewIngredient({ ingredient: '', amount: '', unit: 'g' });
    setIsAddModalOpen(true);
  };

  const handleViewRecipe = async (recipe: Recipe) => {
    // Fetch the full recipe to ensure we have all ingredient data
    try {
      const fullRecipe = await recipeAPI.getById(recipe.id, householdId);
      if (fullRecipe) {
        console.log('Viewing recipe with ingredients:', fullRecipe.ingredients);
        setSelectedRecipe(fullRecipe);
        
        // Load substitutions for missing ingredients
        setIsLoadingSubstitutions(true);
        try {
          const subs = await recipeAPI.getSubstitutions(recipe.id);
          setSubstitutions(subs);
        } catch (error) {
          console.error('Failed to load substitutions:', error);
          setSubstitutions([]);
        } finally {
          setIsLoadingSubstitutions(false);
        }
      } else {
        // Fallback to the recipe from the list if fetch fails
        console.log('Failed to fetch full recipe, using recipe from list:', recipe);
        setSelectedRecipe(recipe);
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
      // Fallback to the recipe from the list
      setSelectedRecipe(recipe);
    }
    setIsViewModalOpen(true);
  };

  const handleGetAISuggestions = async () => {
    if (!householdId) {
      setAlertModal({
        isOpen: true,
        title: 'Household Required',
        message: 'Please create or join a household first',
        type: 'warning',
      });
      return;
    }
    
    setIsLoadingSuggestions(true);
    try {
      const result = await aiAPI.getRecipeSuggestionsFromPantry(5, true);
      setAiSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to get AI suggestions. Please check your OpenAI API key in the backend.',
        type: 'error',
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleEditRecipe = async (recipe: Recipe) => {
    // Fetch the full recipe to ensure we have all ingredient data with correct amounts
    try {
      const fullRecipe = await recipeAPI.getById(recipe.id, householdId);
      if (fullRecipe) {
        console.log('Editing recipe with ingredients:', fullRecipe.ingredients);
        setSelectedRecipe(fullRecipe);
        setFormData({
          title: fullRecipe.title,
          instructions: fullRecipe.instructions,
          tags: fullRecipe.tags.join(', '),
          prepTime: fullRecipe.prepTime?.toString() || '',
          cookTime: fullRecipe.cookTime?.toString() || '',
          servings: fullRecipe.servings?.toString() || '',
          ingredients: fullRecipe.ingredients
            .filter((ing) => ing.ingredient && ing.ingredient.trim()) // Filter out invalid ingredients
            .map((ing) => {
              // Parse amount - if it's 0, check if it's actually a valid 0 or missing
              let parsedAmount: number;
              if (typeof ing.amount === 'number') {
                parsedAmount = ing.amount;
              } else if (ing.amount != null && ing.amount !== '') {
                parsedAmount = parseFloat(String(ing.amount));
                if (isNaN(parsedAmount)) {
                  parsedAmount = 0; // Invalid number, default to 0
                }
              } else {
                parsedAmount = 0; // Missing amount, default to 0
              }
              
              return {
                ingredient: ing.ingredient,
                amount: parsedAmount,
                unit: ing.unit || 'g',
              };
            }),
        });
      } else {
        // Fallback to the recipe from the list if fetch fails
        console.log('Failed to fetch full recipe, using recipe from list:', recipe);
        setSelectedRecipe(recipe);
        setFormData({
          title: recipe.title,
          instructions: recipe.instructions,
          tags: recipe.tags.join(', '),
          prepTime: recipe.prepTime?.toString() || '',
          cookTime: recipe.cookTime?.toString() || '',
          servings: recipe.servings?.toString() || '',
          ingredients: recipe.ingredients
            .filter((ing) => ing.ingredient && ing.ingredient.trim()) // Filter out invalid ingredients
            .map((ing) => {
              // Parse amount - if it's 0, check if it's actually a valid 0 or missing
              let parsedAmount: number;
              if (typeof ing.amount === 'number') {
                parsedAmount = ing.amount;
              } else if (ing.amount != null && ing.amount !== '') {
                parsedAmount = parseFloat(String(ing.amount));
                if (isNaN(parsedAmount)) {
                  parsedAmount = 0; // Invalid number, default to 0
                }
              } else {
                parsedAmount = 0; // Missing amount, default to 0
              }
              
              return {
                ingredient: ing.ingredient,
                amount: parsedAmount,
                unit: ing.unit || 'g',
              };
            }),
        });
      }
    } catch (error) {
      console.error('Error fetching recipe for edit:', error);
      // Fallback to the recipe from the list
      setSelectedRecipe(recipe);
      setFormData({
        title: recipe.title,
        instructions: recipe.instructions,
        tags: recipe.tags.join(', '),
        prepTime: recipe.prepTime?.toString() || '',
        cookTime: recipe.cookTime?.toString() || '',
        servings: recipe.servings?.toString() || '',
        ingredients: recipe.ingredients.map((ing) => ({
          ingredient: ing.ingredient,
          amount: typeof ing.amount === 'number' ? ing.amount : (parseFloat(String(ing.amount)) || 0),
          unit: ing.unit || 'g',
        })),
      });
    }
    setNewIngredient({ ingredient: '', amount: '', unit: 'g' });
    setIsEditModalOpen(true);
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    setDeleteRecipeConfirm({ isOpen: true, recipe });
  };

  const handleConfirmDeleteRecipe = async () => {
    if (!deleteRecipeConfirm.recipe || !householdId) return;
    try {
      await recipeAPI.delete(deleteRecipeConfirm.recipe.id, householdId);
      await refreshRecipes();
      setDeleteRecipeConfirm({ isOpen: false, recipe: null });
      if (selectedRecipe?.id === deleteRecipeConfirm.recipe.id) {
        setIsViewModalOpen(false);
        setSelectedRecipe(null);
      }
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to delete recipe. Please try again.',
        type: 'error',
      });
    }
  };

  const handleSelectInventoryItem = (itemId: string) => {
    if (!itemId) {
      setSelectedInventoryItem('');
      setNewIngredient({ ingredient: '', amount: '', unit: 'g' });
      return;
    }

    const item = pantryItems.find((p) => p.id === itemId);
    if (item) {
      setNewIngredient({
        ingredient: item.ingredient,
        amount: '',
        unit: item.unit || 'g',
      });
      setSelectedInventoryItem(itemId);
    }
  };

  const handleAddIngredient = async () => {
    if (!newIngredient.ingredient || !newIngredient.ingredient.trim()) {
      console.log('Please enter an ingredient name');
      return;
    }

    if (!newIngredient.amount || !newIngredient.amount.trim()) {
      console.log('Please enter an ingredient amount');
      return;
    }

    const amount = parseFloat(newIngredient.amount);
    if (isNaN(amount) || amount <= 0) {
      console.log('Please enter a valid amount (greater than 0)');
      return;
    }

    if (amount > 1000000) {
      console.log('Amount is too large. Maximum is 1,000,000.');
      return;
    }

    const ingredientName = newIngredient.ingredient.trim();

    // Ensure amount is properly stored as a number
    const finalAmount = Number(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      console.log('Invalid amount. Please enter a valid number.');
      return;
    }

    console.log(`Adding ingredient: ${ingredientName}, amount: ${finalAmount}, unit: ${newIngredient.unit}`);

    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        {
          ingredient: ingredientName,
          amount: finalAmount,
          unit: newIngredient.unit,
        },
      ],
    });
    
    console.log('Updated formData ingredients:', formData.ingredients);
    setNewIngredient({ ingredient: '', amount: '', unit: 'g' });
    setSelectedInventoryItem('');
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) {
      console.log('Please create or join a household first');
      return;
    }

    // Validate required fields
    if (!formData.title || !formData.title.trim()) {
      console.log('Please enter a recipe title');
      return;
    }

    if (!formData.instructions || !formData.instructions.trim()) {
      console.log('Please enter recipe instructions');
      return;
    }

    if (formData.ingredients.length === 0) {
      console.log('Please add at least one ingredient');
      return;
    }

    // Validate ingredient amounts
    const invalidIngredients = formData.ingredients.filter((ing) => {
      const amount = typeof ing.amount === 'number' ? ing.amount : parseFloat(String(ing.amount));
      return isNaN(amount) || amount <= 0 || amount > 1000000; // Max 1 million
    });

    if (invalidIngredients.length > 0) {
      console.log('Please enter valid ingredient amounts (greater than 0 and less than 1,000,000)');
      return;
    }

    try {
      console.log('Creating recipe with ingredients:', formData.ingredients);
      const createdRecipe = await recipeAPI.create({
        title: formData.title.trim(),
        instructions: formData.instructions.trim(),
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        ingredients: formData.ingredients.map((ing) => ({
          ...ing,
          amount: typeof ing.amount === 'number' ? ing.amount : parseFloat(String(ing.amount)),
        })),
        prepTime: formData.prepTime ? parseInt(formData.prepTime) : undefined,
        cookTime: formData.cookTime ? parseInt(formData.cookTime) : undefined,
        servings: formData.servings ? parseInt(formData.servings) : undefined,
        householdId,
      });
      console.log('Recipe created successfully:', createdRecipe);
      console.log('Created recipe ingredients:', createdRecipe.ingredients);
      console.log('Number of ingredients in created recipe:', createdRecipe.ingredients?.length || 0);
      
      // Wait a bit before refreshing to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshRecipes();
      setIsAddModalOpen(false);
      setFormData({
        title: '',
        instructions: '',
        tags: '',
        prepTime: '',
        cookTime: '',
        servings: '',
        ingredients: [],
      });
      console.log('Recipe added successfully!');
    } catch (error) {
      console.error('Failed to add recipe:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add recipe. Please try again.';
      console.error(errorMessage);
      
      // Show user-friendly error message
      if (errorMessage.includes('does not belong to your household')) {
        console.log('⚠️ Some ingredients don\'t belong to your household. Please add them to your household first or use existing household ingredients.');
      } else {
        console.log('❌ ' + errorMessage);
      }
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe || !householdId) {
      console.log('No recipe selected or household ID missing');
      return;
    }

    // Validate required fields
    if (!formData.title || !formData.title.trim()) {
      console.log('Please enter a recipe title');
      return;
    }

    if (!formData.instructions || !formData.instructions.trim()) {
      console.log('Please enter recipe instructions');
      return;
    }

    if (formData.ingredients.length === 0) {
      console.log('Please add at least one ingredient');
      return;
    }

    // Validate ingredient amounts
    console.log('Validating ingredients:', formData.ingredients);
    const invalidIngredients = formData.ingredients.filter((ing) => {
      if (!ing.ingredient || !ing.ingredient.trim()) {
        console.log('Invalid ingredient (missing name):', ing);
        return true; // Invalid if ingredient name is missing
      }
      const amount = typeof ing.amount === 'number' 
        ? ing.amount 
        : (ing.amount != null && ing.amount !== '' ? parseFloat(String(ing.amount)) : NaN);
      const isInvalid = isNaN(amount) || amount <= 0 || amount > 1000000;
      if (isInvalid) {
        console.log('Invalid ingredient amount:', { ingredient: ing.ingredient, amount: ing.amount, parsed: amount });
      }
      return isInvalid;
    });

    if (invalidIngredients.length > 0) {
      const errorMessage = `Please enter valid ingredient amounts (greater than 0 and less than 1,000,000) for: ${invalidIngredients.map(ing => ing.ingredient || 'unnamed').join(', ')}`;
      console.error('Validation failed:', errorMessage);
      console.error('Invalid ingredients:', invalidIngredients);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
        type: 'error',
      });
      return;
    }

    try {
      console.log('Updating recipe:', selectedRecipe.id);
      console.log('Update data:', {
        title: formData.title,
        ingredients: formData.ingredients,
      });
      
      const updatedRecipe = await recipeAPI.update(selectedRecipe.id, {
        title: formData.title.trim(),
        instructions: formData.instructions.trim(),
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        ingredients: formData.ingredients.map((ing) => ({
          ...ing,
          amount: typeof ing.amount === 'number' ? ing.amount : parseFloat(String(ing.amount)),
        })),
        prepTime: formData.prepTime ? parseInt(formData.prepTime) : undefined,
        cookTime: formData.cookTime ? parseInt(formData.cookTime) : undefined,
        servings: formData.servings ? parseInt(formData.servings) : undefined,
        householdId,
      });
      
      console.log('Recipe updated successfully:', updatedRecipe);
      console.log('Updated recipe ingredients:', updatedRecipe.ingredients);
      
      // Wait a bit before refreshing to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshRecipes();
      setIsEditModalOpen(false);
      setSelectedRecipe(null);
      console.log('Recipe update completed!');
    } catch (error) {
      console.error('Failed to update recipe:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update recipe. Please try again.';
      console.error(errorMessage);
    }
  };

  const filteredRecipes = (recipes || []).filter((recipe) => {
    if (!recipe || !recipe.title) return false;
    const titleMatch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase());
    const tagsMatch = (recipe.tags || []).some((tag) => 
      tag && tag.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return titleMatch || tagsMatch;
  });

  const getRecipeType = (recipe: Recipe): string => {
    if (!recipe.tags || recipe.tags.length === 0) return 'Other';
    return recipe.tags.find((tag) => ['Breakfast', 'Lunch', 'Dinner'].includes(tag)) || recipe.tags[0] || 'Other';
  };

  const getTotalTime = (recipe: Recipe): string => {
    const total = (recipe.prepTime || 0) + (recipe.cookTime || 0);
    return total > 0 ? `${total} min` : 'N/A';
  };

  return (
    <div className="recipes-page">
      <DashboardNav />
      <div className="recipes-content">
        <h1 className="page-title">Recipes</h1>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
          <button className="add-recipe-btn" onClick={handleAddRecipe}>
            Add Recipe
          </button>
          <button 
            className="add-recipe-btn" 
            onClick={handleGetAISuggestions}
            disabled={isLoadingSuggestions}
            style={{ backgroundColor: '#4CAF50' }}
          >
            {isLoadingSuggestions ? 'Loading...' : '🤖 Cook from my Pantry'}
          </button>
        </div>

        {aiSuggestions.length > 0 && (
          <div style={{ 
            background: '#f0f8ff', 
            padding: '15px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #4CAF50'
          }}>
            <h3 style={{ marginTop: 0, color: '#4CAF50' }}>🤖 AI Recipe Suggestions</h3>
            <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
              {aiSuggestions.map((suggestion, idx) => (
                <li key={idx} style={{ marginBottom: '8px' }}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search recipes.."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="search-icon">🔍</div>
        </div>

        <div className="recipes-grid">
          {filteredRecipes.length === 0 ? (
            <div className="empty-state">
              <p>No recipes found. Create your first recipe!</p>
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="recipe-card">
                <div className="recipe-image"></div>
                <div className="recipe-info">
                  <h3 className="recipe-name">{recipe.title}</h3>
                  <div className="recipe-meta">
                    <span className="recipe-type">{getRecipeType(recipe)}</span>
                    <span className="recipe-time">{getTotalTime(recipe)}</span>
                  </div>
                  <p className="recipe-ingredients">{(recipe.ingredients || []).length} ingredients</p>
                </div>
                <div className="recipe-actions">
                  <button className="view-recipe-btn" onClick={() => handleViewRecipe(recipe)}>
                    View Recipe
                  </button>
                  <button className="edit-recipe-btn" onClick={() => handleEditRecipe(recipe)}>
                    Edit
                  </button>
                  <button className="delete-recipe-btn" onClick={() => handleDeleteRecipe(recipe)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Recipe Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Recipe">
        <form onSubmit={handleSubmitAdd} className="recipe-form">
          <div className="form-group">
            <label>Recipe Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Chicken Stir Fry"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Prep Time (minutes)</label>
              <input
                type="number"
                value={formData.prepTime}
                onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                placeholder="15"
              />
            </div>
            <div className="form-group">
              <label>Cook Time (minutes)</label>
              <input
                type="number"
                value={formData.cookTime}
                onChange={(e) => setFormData({ ...formData, cookTime: e.target.value })}
                placeholder="20"
              />
            </div>
            <div className="form-group">
              <label>Servings</label>
              <input
                type="number"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                placeholder="4"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., Dinner, Quick, Asian"
            />
          </div>
          <div className="form-group">
            <label>Instructions</label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              required
              rows={6}
              placeholder="Enter step-by-step instructions..."
            />
          </div>
          <div className="form-group">
            <label>Ingredients</label>
            <div className="ingredients-list">
              {formData.ingredients.map((ing, index) => {
                // Ensure amount is properly displayed
                const displayAmount = typeof ing.amount === 'number' 
                  ? ing.amount 
                  : (ing.amount != null && ing.amount !== '' ? parseFloat(String(ing.amount)) : 0);
                
                return (
                  <div key={index} className="ingredient-item">
                    <span>
                      {ing.ingredient} - {displayAmount} {ing.unit || 'g'}
                    </span>
                    <button type="button" onClick={() => handleRemoveIngredient(index)}>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="add-ingredient-form">
              <select
                value={selectedInventoryItem}
                onChange={(e) => handleSelectInventoryItem(e.target.value)}
                style={{ marginBottom: '8px', width: '100%', padding: '8px' }}
              >
                <option value="">Select from inventory (optional)</option>
                {pantryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.ingredient} ({item.quantity} {item.unit})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Ingredient name"
                value={newIngredient.ingredient}
                onChange={(e) => {
                  setNewIngredient({ ...newIngredient, ingredient: e.target.value });
                  setSelectedInventoryItem(''); // Clear selection if manually typing
                }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={newIngredient.amount}
                onChange={(e) => setNewIngredient({ ...newIngredient, amount: e.target.value })}
              />
              <select
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="mL">mL</option>
                <option value="L">L</option>
                <option value="pieces">pieces</option>
                <option value="slices">slices</option>
                <option value="loaf">loaf</option>
                <option value="cup">cup</option>
                <option value="tbsp">tbsp</option>
                <option value="tsp">tsp</option>
              </select>
              <button type="button" onClick={handleAddIngredient}>
                Add
              </button>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit">Add Recipe</button>
          </div>
        </form>
      </Modal>

      {/* Edit Recipe Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRecipe(null);
        }}
        title="Edit Recipe"
      >
        <form onSubmit={handleSubmitEdit} className="recipe-form">
          <div className="form-group">
            <label>Recipe Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Prep Time (minutes)</label>
              <input
                type="number"
                value={formData.prepTime}
                onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Cook Time (minutes)</label>
              <input
                type="number"
                value={formData.cookTime}
                onChange={(e) => setFormData({ ...formData, cookTime: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Servings</label>
              <input
                type="number"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Instructions</label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              required
              rows={6}
            />
          </div>
          <div className="form-group">
            <label>Ingredients</label>
            <div className="ingredients-list">
              {formData.ingredients.map((ing, index) => {
                // Ensure amount is properly displayed
                const displayAmount = typeof ing.amount === 'number' 
                  ? ing.amount 
                  : (ing.amount != null && ing.amount !== '' ? parseFloat(String(ing.amount)) : 0);
                
                return (
                  <div key={index} className="ingredient-item">
                    <span>
                      {ing.ingredient} - {displayAmount} {ing.unit || 'g'}
                    </span>
                    <button type="button" onClick={() => handleRemoveIngredient(index)}>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="add-ingredient-form">
              <select
                value={selectedInventoryItem}
                onChange={(e) => handleSelectInventoryItem(e.target.value)}
                style={{ marginBottom: '8px', width: '100%', padding: '8px' }}
              >
                <option value="">Select from inventory (optional)</option>
                {pantryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.ingredient} ({item.quantity} {item.unit})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Ingredient name"
                value={newIngredient.ingredient}
                onChange={(e) => {
                  setNewIngredient({ ...newIngredient, ingredient: e.target.value });
                  setSelectedInventoryItem(''); // Clear selection if manually typing
                }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={newIngredient.amount}
                onChange={(e) => setNewIngredient({ ...newIngredient, amount: e.target.value })}
              />
              <select
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="mL">mL</option>
                <option value="L">L</option>
                <option value="pieces">pieces</option>
                <option value="slices">slices</option>
                <option value="loaf">loaf</option>
                <option value="cup">cup</option>
                <option value="tbsp">tbsp</option>
                <option value="tsp">tsp</option>
              </select>
              <button type="button" onClick={handleAddIngredient}>
                Add
              </button>
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedRecipe(null);
              }}
            >
              Cancel
            </button>
            <button type="submit">Update Recipe</button>
          </div>
        </form>
      </Modal>

      {/* View Recipe Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedRecipe(null);
        }}
        title={selectedRecipe?.title || 'Recipe Details'}
      >
        {selectedRecipe && (
          <div className="recipe-details">
            <div className="recipe-meta-info">
              {selectedRecipe.prepTime && (
                <span>Prep: {selectedRecipe.prepTime} min</span>
              )}
              {selectedRecipe.cookTime && (
                <span>Cook: {selectedRecipe.cookTime} min</span>
              )}
              {selectedRecipe.servings && <span>Serves: {selectedRecipe.servings}</span>}
            </div>
            <div className="recipe-tags">
              {(selectedRecipe.tags || []).map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
            <div className="recipe-section">
              <h3>Ingredients</h3>
              <ul className="ingredients-list-view">
                {(selectedRecipe.ingredients || []).map((ing, index) => {
                  // Format the amount - ensure it's a number
                  const displayAmount = typeof ing.amount === 'number' 
                    ? ing.amount 
                    : (ing.amount != null && ing.amount !== '' && ing.amount !== undefined
                        ? parseFloat(String(ing.amount)) || 0
                        : 0);
                  
                  return (
                    <li key={index}>
                      {ing.ingredient} - {displayAmount} {ing.unit || 'g'}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="recipe-section">
              <h3>Instructions</h3>
              <div className="instructions-text">
                {(selectedRecipe.instructions || '').split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            {substitutions.length > 0 && (
              <div className="recipe-section" style={{ 
                marginTop: '20px', 
                padding: '15px', 
                background: '#fff3cd', 
                borderRadius: '8px',
                border: '1px solid #ffc107'
              }}>
                <h3 style={{ marginTop: 0, color: '#856404' }}>🤖 Smart Substitutions</h3>
                {isLoadingSubstitutions ? (
                  <p>Loading substitutions...</p>
                ) : (
                  <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                    {substitutions.map((sub, idx) => (
                      <li key={idx} style={{ marginBottom: '8px' }}>
                        <strong>{sub.missing_ingredient}:</strong> {sub.substitution}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="recipe-actions-view">
              <button onClick={() => handleEditRecipe(selectedRecipe)}>Edit Recipe</button>
              <button onClick={() => handleDeleteRecipe(selectedRecipe)}>Delete Recipe</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={deleteRecipeConfirm.isOpen}
        onClose={() => setDeleteRecipeConfirm({ isOpen: false, recipe: null })}
        onConfirm={handleConfirmDeleteRecipe}
        title="Delete Recipe"
        message={deleteRecipeConfirm.recipe ? `Are you sure you want to delete "${deleteRecipeConfirm.recipe.title}"?` : ''}
        confirmText="Delete"
        cancelText="Cancel"
      />

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

export default RecipesPage;

