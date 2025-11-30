import { useState, useEffect } from 'react';
import DashboardNav from '../components/DashboardNav';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { pantryAPI } from '../services';
import type { PantryItem } from '../types';
import { getDaysUntilExpiry, formatDate } from '../utils/dateUtils';
import './PantryPage.css';

const PantryPage = () => {
  const { user, household } = useAuth();
  const { pantryItems, refreshPantry } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConsumeModalOpen, setIsConsumeModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PantryItem | null>(null);
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [formData, setFormData] = useState({
    ingredient: '',
    quantity: '',
    unit: 'kg',
    expiryDate: '',
    location: 'Fridge' as PantryItem['location'],
    dateBought: '',
  });

  const householdId = household?.id || user?.householdId || '';

  useEffect(() => {
    if (householdId) {
      refreshPantry();
    }
  }, [householdId, refreshPantry]);

  const filteredItems = filterExpiring
    ? pantryItems.filter((item) => {
        const days = getDaysUntilExpiry(item.expiryDate);
        return days >= 0 && days <= 7;
      })
    : pantryItems;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) {
      console.log('Please create or join a household first');
      return;
    }
    
    try {
      await pantryAPI.create({
        ...formData,
        quantity: parseFloat(formData.quantity),
        householdId,
      });
      await refreshPantry();
      setIsAddModalOpen(false);
      setFormData({
        ingredient: '',
        quantity: '',
        unit: 'kg',
        expiryDate: '',
        location: 'Fridge',
        dateBought: '',
      });
      console.log('Item added successfully!');
    } catch (error) {
      console.error('Failed to add item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add item. Please try again.';
      console.error(errorMessage);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !householdId) {
      console.log('Missing selected item or household ID');
      return;
    }
    try {
      const updatedItem = await pantryAPI.update(selectedItem.id, {
        ingredient: formData.ingredient,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        expiryDate: formData.expiryDate,
        location: formData.location,
        dateBought: formData.dateBought,
        householdId,
      });
      console.log('Updated item from API:', updatedItem);
      // Wait a bit to ensure backend has processed the update
      await new Promise(resolve => setTimeout(resolve, 100));
      // Refresh pantry to get the latest data from backend
      await refreshPantry();
      setIsEditModalOpen(false);
      setSelectedItem(null);
      console.log('Item updated successfully!');
    } catch (error) {
      console.error('Failed to update item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update item. Please try again.';
      console.error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!householdId) {
      console.log('Missing household ID');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await pantryAPI.delete(id, householdId);
      await refreshPantry();
      console.log('Item deleted successfully!');
    } catch (error) {
      console.error('Failed to delete item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete item. Please try again.';
      console.error(errorMessage);
    }
  };

  const handleConsume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !householdId) {
      console.log('Missing selected item or household ID');
      return;
    }
    const amount = parseFloat((e.target as HTMLFormElement).amount.value);
    if (isNaN(amount) || amount <= 0) {
      console.log('Invalid amount to consume');
      return;
    }
    try {
      await pantryAPI.consume(selectedItem.id, amount, householdId);
      await refreshPantry();
      setIsConsumeModalOpen(false);
      setSelectedItem(null);
      console.log(`Consumed ${amount} ${selectedItem.unit} of ${selectedItem.ingredient}`);
    } catch (error) {
      console.error('Failed to consume item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to consume item. Please try again.';
      console.error(errorMessage);
    }
  };

  const openEditModal = (item: PantryItem) => {
    setSelectedItem(item);
    // Format dates for date input (YYYY-MM-DD)
    const formatDateForInput = (dateString: string): string => {
      if (!dateString) return new Date().toISOString().split('T')[0];
      if (dateString.includes('T')) {
        return dateString.split('T')[0];
      }
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      // Try to parse and format
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      return date.toISOString().split('T')[0];
    };
    
    setFormData({
      ingredient: item.ingredient,
      quantity: item.quantity.toString(),
      unit: item.unit,
      expiryDate: formatDateForInput(item.expiryDate),
      location: item.location,
      dateBought: formatDateForInput(item.dateBought),
    });
    setIsEditModalOpen(true);
  };

  const openConsumeModal = (item: PantryItem) => {
    setSelectedItem(item);
    setIsConsumeModalOpen(true);
  };

  return (
    <div className="pantry-page">
      <DashboardNav />
      <div className="pantry-content">
        <div className="pantry-header">
          <h1 className="page-title">Pantry</h1>
          <div className="pantry-actions">
            <label className="filter-toggle">
              <input
                type="checkbox"
                checked={filterExpiring}
                onChange={(e) => setFilterExpiring(e.target.checked)}
              />
              Show expiring soon (7 days)
            </label>
            <button className="add-items-btn" onClick={() => setIsAddModalOpen(true)}>
              Add Items
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>No pantry items found. Add your first item to get started!</p>
          </div>
        ) : (
          <div className="pantry-grid">
            {filteredItems.map((item) => {
              const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
              const isExpiring = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;

              return (
                <div key={item.id} className="pantry-card">
                  {isExpiring && (
                    <div className="expiring-badge">
                      Expiring in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                    </div>
                  )}
                  <div className="item-info">
                    <div className="item-details">
                      <h3 className="item-name">{item.ingredient}</h3>
                      <p className="item-quantity">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <div className="item-meta">
                      <p className="item-date">Expires: {formatDate(item.expiryDate)}</p>
                      <p className="item-location">Location: {item.location}</p>
                      <p className="item-date">Bought: {formatDate(item.dateBought)}</p>
                    </div>
                  </div>
                  <div className="item-actions">
                    <button
                      className="consume-btn"
                      onClick={() => openConsumeModal(item)}
                      disabled={item.quantity <= 0}
                    >
                      Consume
                    </button>
                    <button className="edit-btn" onClick={() => openEditModal(item)}>
                      Edit
                    </button>
                    <button className="delete-btn" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Item Modal */}
        <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Pantry Item">
          <form onSubmit={handleAdd} className="pantry-form">
            <div className="form-group">
              <label>Ingredient Name</label>
              <input
                type="text"
                value={formData.ingredient}
                onChange={(e) => setFormData({ ...formData, ingredient: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                  <option value="pieces">pieces</option>
                  <option value="pack">pack</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Location</label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value as PantryItem['location'] })}
              >
                <option value="Fridge">Fridge</option>
                <option value="Freezer">Freezer</option>
                <option value="Pantry">Pantry</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date Bought</label>
                <input
                  type="date"
                  value={formData.dateBought}
                  onChange={(e) => setFormData({ ...formData, dateBought: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </button>
              <button type="submit">Add Item</button>
            </div>
          </form>
        </Modal>

        {/* Edit Item Modal */}
        <Modal 
          isOpen={isEditModalOpen} 
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
          }} 
          title="Edit Pantry Item"
        >
          <form onSubmit={handleEdit} className="pantry-form">
            <div className="form-group">
              <label>Ingredient Name</label>
              <input
                type="text"
                value={formData.ingredient}
                onChange={(e) => setFormData({ ...formData, ingredient: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                  <option value="pieces">pieces</option>
                  <option value="pack">pack</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Location</label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value as PantryItem['location'] })}
              >
                <option value="Fridge">Fridge</option>
                <option value="Freezer">Freezer</option>
                <option value="Pantry">Pantry</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date Bought</label>
                <input
                  type="date"
                  value={formData.dateBought}
                  onChange={(e) => setFormData({ ...formData, dateBought: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedItem(null);
                }}
              >
                Cancel
              </button>
              <button type="submit">Update Item</button>
            </div>
          </form>
        </Modal>

        {/* Consume Item Modal */}
        <Modal
          isOpen={isConsumeModalOpen}
          onClose={() => {
            setIsConsumeModalOpen(false);
            setSelectedItem(null);
          }}
          title={`Consume ${selectedItem?.ingredient}`}
        >
          <form onSubmit={handleConsume} className="pantry-form">
            <div className="form-group">
              <label>Amount to Consume ({selectedItem?.unit})</label>
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0.01"
                max={selectedItem?.quantity}
                required
                placeholder={`Max: ${selectedItem?.quantity} ${selectedItem?.unit}`}
              />
              <p className="form-hint">Current quantity: {selectedItem?.quantity} {selectedItem?.unit}</p>
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => {
                  setIsConsumeModalOpen(false);
                  setSelectedItem(null);
                }}
              >
                Cancel
              </button>
              <button type="submit">Consume</button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default PantryPage;
