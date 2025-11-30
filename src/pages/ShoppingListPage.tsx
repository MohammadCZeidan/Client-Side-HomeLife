import { useState, useEffect } from 'react';
import DashboardNav from '../components/DashboardNav';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { shoppingListAPI, mealPlanAPI, pantryAPI } from '../services';
import { getWeekStartDate } from '../utils/dateUtils';
import { checkIngredientAvailability, convertToShoppingListItems } from '../utils/ingredientCheck';
import type { ShoppingList, ShoppingListItem, WeeklyPlan } from '../types';
import { formatDate } from '../utils/dateUtils';
import './ShoppingListPage.css';

const ShoppingListPage = () => {
  const { user, household } = useAuth();
  const { shoppingLists, pantryItems, recipes, refreshShoppingLists, refreshPantry } = useApp();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    unit: 'g',
  });

  const householdId = household?.id || user?.householdId || '';
  const weekStartDate = getWeekStartDate();

  useEffect(() => {
    if (householdId) {
      refreshShoppingLists();
      // Fetch weekly plan directly
      mealPlanAPI.getWeeklyPlan(householdId, weekStartDate).then(setWeeklyPlan).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  // Auto-select first list if available
  useEffect(() => {
    if (shoppingLists && shoppingLists.length > 0 && !selectedList) {
      setSelectedList(shoppingLists[0]);
    }
  }, [shoppingLists, selectedList]);

  const handleGenerateFromMealPlan = async () => {
    if (!householdId || !weeklyPlan) {
      console.log('Please create a weekly meal plan first!');
      return;
    }

    try {
      // Get all recipes from the meal plan
      const allRecipes = weeklyPlan.meals.map((meal) => meal.recipe);
      const uniqueRecipes = Array.from(
        new Map(allRecipes.map((recipe) => [recipe.id, recipe])).values()
      );

      // Check ingredients for all recipes and collect missing items
      const allMissingItems: Array<{
        ingredient: string;
        needed: number;
        unit: string;
        available: number;
        shortfall: number;
      }> = [];

      for (const recipe of uniqueRecipes) {
        const checkResult = checkIngredientAvailability(recipe, pantryItems || []);
        allMissingItems.push(...checkResult.missingIngredients);
      }

      // Aggregate ingredients (sum up quantities for same ingredient)
      const aggregatedItems = new Map<string, { ingredient: string; shortfall: number; unit: string }>();
      for (const item of allMissingItems) {
        const key = `${item.ingredient}_${item.unit}`;
        if (aggregatedItems.has(key)) {
          const existing = aggregatedItems.get(key)!;
          existing.shortfall += item.shortfall;
        } else {
          aggregatedItems.set(key, {
            ingredient: item.ingredient,
            shortfall: item.shortfall,
            unit: item.unit,
          });
        }
      }

      // Get or create default shopping list
      let shoppingList = await shoppingListAPI.getOrCreateDefaultList(householdId);

      // Convert to shopping list items
      const shoppingItems = Array.from(aggregatedItems.values()).map((item) => ({
        name: `${item.ingredient} - ${item.shortfall} ${item.unit}`,
        quantity: item.shortfall,
        unit: item.unit,
        bought: false,
        listId: shoppingList.id,
      }));

      if (shoppingItems.length > 0) {
        await shoppingListAPI.addItems(shoppingList.id, shoppingItems, householdId);
        await refreshShoppingLists();
        setSelectedList(shoppingList);
        console.log(`Added ${shoppingItems.length} items to your shopping list!`);
      } else {
        console.log('All ingredients are available in your pantry!');
      }
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
      console.log('Failed to generate shopping list. Please try again.');
    }
  };

  const handleNewList = () => {
    setNewListName('');
    setIsNewListModalOpen(true);
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId || !newListName.trim()) {
      console.log('Please enter a list name');
      return;
    }

    try {
      const newList = await shoppingListAPI.create({
        name: newListName.trim(),
        items: [],
        householdId,
      });
      await refreshShoppingLists();
      setSelectedList(newList);
      setIsNewListModalOpen(false);
      setNewListName('');
    } catch (error) {
      console.error('Failed to create list:', error);
      console.log('Failed to create list. Please try again.');
    }
  };

  const handleViewList = (list: ShoppingList) => {
    setSelectedList(list);
  };

  const handleToggleItem = async (item: ShoppingListItem) => {
    if (!selectedList || !householdId) return;

    try {
      const newBoughtStatus = !item.bought;
      
      // Update the individual item using the updateItem endpoint
      await shoppingListAPI.updateItem(
        selectedList.id,
        item.id,
        { bought: newBoughtStatus },
        householdId
      );

      // If item is being checked (bought = true), add it to the pantry
      if (newBoughtStatus) {
        try {
          // Parse item name to extract ingredient, quantity, and unit
          // Format: "INGREDIENT - QUANTITY UNIT" or just "INGREDIENT"
          const itemParts = item.name.split(' - ');
          const ingredientName = itemParts[0].trim();
          
          // Use quantity and unit from the item if available, otherwise parse from name
          let quantity = item.quantity || 0;
          let unit = item.unit || 'g';
          
          if (itemParts.length > 1) {
            // Try to parse quantity and unit from the second part
            const quantityUnitPart = itemParts[1].trim();
            const quantityMatch = quantityUnitPart.match(/^([\d.]+)\s*(.+)$/);
            if (quantityMatch) {
              const parsedQuantity = parseFloat(quantityMatch[1]);
              const parsedUnit = quantityMatch[2].trim();
              if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
                quantity = parsedQuantity;
              }
              if (parsedUnit) {
                unit = parsedUnit;
              }
            }
          }
          
          // Only add to pantry if we have valid quantity
          if (quantity > 0 && ingredientName) {
            // Check if ingredient already exists in pantry (by name and unit)
            const existingPantryItem = pantryItems?.find(
              (pantryItem) => 
                pantryItem.ingredient.toLowerCase() === ingredientName.toLowerCase() &&
                pantryItem.unit.toLowerCase() === unit.toLowerCase()
            );
            
            if (existingPantryItem) {
              // If ingredient exists, add quantity to existing item
              const newQuantity = existingPantryItem.quantity + quantity;
              await pantryAPI.update(existingPantryItem.id, {
                quantity: newQuantity,
              });
              console.log(`Updated "${ingredientName}" in pantry: ${existingPantryItem.quantity} + ${quantity} = ${newQuantity}`);
            } else {
              // If ingredient doesn't exist, create new pantry item
              // Set date bought to today
              const dateBought = new Date();
              // Calculate expiry date (7 days from today)
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + 7);
              
              await pantryAPI.create({
                ingredient: ingredientName,
                quantity: quantity,
                unit: unit,
                expiryDate: expiryDate.toISOString().split('T')[0],
                dateBought: dateBought.toISOString().split('T')[0],
                location: 'pantry',
                householdId: householdId,
              });
              console.log(`Added "${ingredientName}" to pantry`);
            }
            
            // Refresh pantry to show the updated/new item
            await refreshPantry();
          }
        } catch (pantryError) {
          console.error('Failed to add item to pantry:', pantryError);
          // Don't fail the whole operation if pantry add fails
          // The item is still marked as bought in the shopping list
        }
      }

      // Refresh the shopping lists to get updated data
      await refreshShoppingLists();
      
      // Update the selected list with fresh data
      const updatedLists = await shoppingListAPI.getAll(householdId);
      const updatedList = updatedLists.find((l) => l.id === selectedList.id);
      if (updatedList) {
        setSelectedList(updatedList);
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update item. Please try again.';
      console.log(errorMessage);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList || !householdId || !newItem.name.trim() || !newItem.quantity) {
      console.log('Please fill in all fields');
      return;
    }

    try {
      await shoppingListAPI.addItems(
        selectedList.id,
        [
          {
            name: newItem.name.trim(),
            quantity: parseFloat(newItem.quantity),
            unit: newItem.unit,
            bought: false,
            listId: selectedList.id,
          },
        ],
        householdId
      );
      await refreshShoppingLists();
      const updatedLists = await shoppingListAPI.getAll(householdId);
      const updatedList = updatedLists.find((l) => l.id === selectedList.id);
      if (updatedList) setSelectedList(updatedList);
      setIsAddItemModalOpen(false);
      setNewItem({ name: '', quantity: '', unit: 'g' });
    } catch (error) {
      console.error('Failed to add item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add item. Please try again.';
      console.log(errorMessage);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedList || !householdId) return;

    if (confirm('Are you sure you want to remove this item?')) {
      try {
        const updatedItems = selectedList.items.filter((i) => i.id !== itemId);
        const updatedList = await shoppingListAPI.update(
          selectedList.id,
          { items: updatedItems },
          householdId
        );
        setSelectedList(updatedList);
        await refreshShoppingLists();
      } catch (error) {
        console.error('Failed to delete item:', error);
        console.log('Failed to delete item. Please try again.');
      }
    }
  };

  const handleDeleteList = async (list: ShoppingList) => {
    if (!householdId) return;

    if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
      try {
        await shoppingListAPI.delete(list.id, householdId);
        await refreshShoppingLists();
        if (selectedList?.id === list.id) {
          const updatedLists = await shoppingListAPI.getAll(householdId);
          setSelectedList(updatedLists.length > 0 ? updatedLists[0] : null);
        }
      } catch (error) {
        console.error('Failed to delete list:', error);
        console.log('Failed to delete list. Please try again.');
      }
    }
  };

  const boughtCount = selectedList?.items.filter((item) => item.bought).length || 0;
  const totalCount = selectedList?.items.length || 0;

  return (
    <div className="shopping-list-page">
      <DashboardNav />
      <div className="shopping-content">
        <h1 className="page-title">Shopping Lists</h1>
        <div className="action-buttons">
          <button className="generate-btn" onClick={handleGenerateFromMealPlan}>
            Generate from meal plan
          </button>
          <button className="new-list-btn" onClick={handleNewList}>
            +New List
          </button>
        </div>

        <div className="lists-grid">
          {shoppingLists && shoppingLists.length > 0 ? (
            shoppingLists.map((list) => (
              <div
                key={list.id}
                className={`list-card ${selectedList?.id === list.id ? 'active' : ''}`}
              >
                <h3 className="list-name">{list.name}</h3>
                <p className="list-date">Created: {formatDate(list.createdAt)}</p>
                <p className="list-count">{list.items.length} Items</p>
                <div className="list-card-actions">
                  <button className="view-btn" onClick={() => handleViewList(list)}>
                    View list
                  </button>
                  <button
                    className="delete-list-btn"
                    onClick={() => handleDeleteList(list)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No shopping lists yet. Create your first list!</p>
            </div>
          )}
        </div>

        {selectedList && (
          <div className="list-detail">
            <div className="list-detail-header">
              <div>
                <h2 className="detail-title">{selectedList.name}</h2>
                <p className="list-progress">
                  {boughtCount} of {totalCount} items bought
                </p>
              </div>
              <button
                className="add-item-btn"
                onClick={() => setIsAddItemModalOpen(true)}
              >
                + Add Item
              </button>
            </div>
            <div className="items-list">
              {selectedList.items.length === 0 ? (
                <div className="empty-items">
                  <p>No items in this list. Add items to get started!</p>
                </div>
              ) : (
                selectedList.items.map((item) => (
                  <div
                    key={item.id}
                    className={`list-item ${item.bought ? 'bought' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="item-checkbox"
                      checked={item.bought}
                      onChange={() => handleToggleItem(item)}
                    />
                    <span className="item-name">{item.name}</span>
                    <button
                      className="delete-item-btn"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* New List Modal */}
      <Modal
        isOpen={isNewListModalOpen}
        onClose={() => setIsNewListModalOpen(false)}
        title="Create New Shopping List"
      >
        <form onSubmit={handleCreateList} className="shopping-form">
          <div className="form-group">
            <label>List Name</label>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., Weekly Groceries"
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setIsNewListModalOpen(false)}>
              Cancel
            </button>
            <button type="submit">Create List</button>
          </div>
        </form>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => {
          setIsAddItemModalOpen(false);
          setNewItem({ name: '', quantity: '', unit: 'g' });
        }}
        title="Add Item to List"
      >
        <form onSubmit={handleAddItem} className="shopping-form">
          <div className="form-group">
            <label>Item Name</label>
            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="e.g., Milk"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                placeholder="2"
                required
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="mL">mL</option>
                <option value="L">L</option>
                <option value="pieces">pieces</option>
                <option value="slices">slices</option>
                <option value="loaf">loaf</option>
                <option value="pack">pack</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setIsAddItemModalOpen(false);
                setNewItem({ name: '', quantity: '', unit: 'g' });
              }}
            >
              Cancel
            </button>
            <button type="submit">Add Item</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShoppingListPage;

