import { useState, useMemo } from 'react';
import DashboardNav from '../components/DashboardNav';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import { useAuth } from '../context/AuthContext';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../hooks';
import { aiAPI, n8nAPI } from '../services';
import type { Expense } from '../types';
import './BudgetPage.css';

const formatDateShort = (dateString: string): string => {
  if (!dateString) return 'Invalid date';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Invalid date';
  }
};

const BudgetPage = () => {
  const { user, household } = useAuth();
  const householdId = household?.id || user?.householdId || '';
  
  const { data: expenses = [], isLoading, isError, error } = useExpenses(householdId);
  const createExpense = useCreateExpense(householdId);
  const updateExpense = useUpdateExpense(householdId);
  const deleteExpense = useDeleteExpense(householdId);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Groceries',
    note: '',
    store: '',
  });

  // AI and n8n button states
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [isN8nSending, setIsN8nSending] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [senderEmail, setSenderEmail] = useState(user?.email || '');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<('email' | 'telegram' | 'slack')[]>(['email']);
  
  // Alert and confirm modals
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [confirmAIGenerate, setConfirmAIGenerate] = useState(false);

  const handleAIGenerate = () => {
    if (!householdId) {
      setAlertModal({
        isOpen: true,
        title: 'Household Required',
        message: 'Please create or join a household first',
        type: 'warning',
      });
      return;
    }
    setConfirmAIGenerate(true);
  };

  const handleConfirmAIGenerate = async () => {
    setConfirmAIGenerate(false);
    setIsAIGenerating(true);
    try {
      const result = await aiAPI.generateSeedData();
      setAlertModal({
        isOpen: true,
        title: 'Success!',
        message: `✅ Created: ${result.created.ingredients} ingredients, ${result.created.recipes} recipes, ${result.created.pantry_items} pantry items`,
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to generate AI data:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to generate seed data. Please check your OpenAI API key in the backend .env file.',
        type: 'error',
      });
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleN8nNotification = () => {
    if (!householdId) {
      setAlertModal({
        isOpen: true,
        title: 'Household Required',
        message: 'Please create or join a household first',
        type: 'warning',
      });
      return;
    }
    setNotificationMessage('');
    setSenderEmail(user?.email || '');
    setSelectedChannels(['email']);
    setShowNotificationModal(true);
  };

  const handleSendNotification = async () => {
    if (!householdId) return;

    if (!notificationMessage.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please enter a message',
        type: 'warning',
      });
      return;
    }

    if (selectedChannels.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please select at least one notification channel',
        type: 'warning',
      });
      return;
    }

    if (!senderEmail.trim() || !senderEmail.includes('@')) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'Please enter a valid sender email address',
        type: 'warning',
      });
      return;
    }

    setIsN8nSending(true);
    try {
      const result = await n8nAPI.sendNotification(householdId, {
        channels: selectedChannels,
        message: notificationMessage,
        subject: 'HomeLife Notification',
        senderEmail: senderEmail.trim(),
      });
      
      setAlertModal({
        isOpen: true,
        title: 'Success!',
        message: `✅ ${result.message || 'Notification sent successfully!'}`,
        type: 'success',
      });
      setShowNotificationModal(false);
      setNotificationMessage('');
    } catch (error) {
      console.error('Failed to send notification:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
      });
    } finally {
      setIsN8nSending(false);
    }
  };

  // Calculate stats dynamically from expenses
  const stats = useMemo(() => {
    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      return { today: 0, thisMonth: 0, averagePerWeek: 0 };
    }

    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      today.setHours(0, 0, 0, 0);
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);

      // Calculate today's expenses
      const todayExpenses = expenses
        .filter((e) => {
          if (!e || !e.date) return false;
          if (e.amount === undefined || e.amount === null) return false;
          try {
            const dateParts = e.date.split('T')[0].split('-');
            if (dateParts.length !== 3) return false;
            const expenseDate = new Date(
              parseInt(dateParts[0], 10),
              parseInt(dateParts[1], 10) - 1,
              parseInt(dateParts[2], 10)
            );
            expenseDate.setHours(0, 0, 0, 0);
            if (isNaN(expenseDate.getTime())) return false;
            return expenseDate.getTime() === today.getTime();
          } catch {
            return false;
          }
        })
        .reduce((sum, e) => {
          const amount = typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount)) || 0;
          return sum + amount;
        }, 0);

      // Calculate this month's expenses
      const thisMonth = expenses
        .filter((e) => {
          if (!e || !e.date) return false;
          if (e.amount === undefined || e.amount === null) return false;
          try {
            const dateParts = e.date.split('T')[0].split('-');
            if (dateParts.length !== 3) return false;
            const expenseDate = new Date(
              parseInt(dateParts[0], 10),
              parseInt(dateParts[1], 10) - 1,
              parseInt(dateParts[2], 10)
            );
            expenseDate.setHours(0, 0, 0, 0);
            if (isNaN(expenseDate.getTime())) return false;
            return expenseDate >= monthStart && expenseDate <= today;
          } catch {
            return false;
          }
        })
        .reduce((sum, e) => {
          const amount = typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount)) || 0;
          return sum + amount;
        }, 0);

      // Calculate average per week: total expenses in current month / number of weeks passed
      const daysPassed = Math.floor((today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const weeksPassed = Math.max(1, Math.ceil(daysPassed / 7));
      const averagePerWeek = thisMonth / weeksPassed;

      return { today: todayExpenses, thisMonth, averagePerWeek };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return { today: 0, thisMonth: 0, averagePerWeek: 0 };
    }
  }, [expenses]);

  // Sort expenses by date (most recent first)
  const sortedExpenses = useMemo(() => {
    if (!expenses || !Array.isArray(expenses)) return [];
    try {
      return [...expenses]
        .filter((e) => e && e.date) // Filter out invalid expenses
        .sort((a, b) => {
          try {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (isNaN(dateA) || isNaN(dateB)) return 0;
            return dateB - dateA;
          } catch {
            return 0;
          }
        });
    } catch {
      return expenses || [];
    }
  }, [expenses]);

  const handleAddExpense = () => {
    setFormData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Groceries',
      note: '',
      store: '',
    });
    setIsAddModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    if (!expense) return;
    setSelectedExpense(expense);
    try {
      // Handle date format - it might be ISO string or just date string
      let expenseDate = expense.date || new Date().toISOString().split('T')[0];
      if (expenseDate.includes('T')) {
        expenseDate = expenseDate.split('T')[0];
      }
      
      // Validate date
      const testDate = new Date(expenseDate);
      if (isNaN(testDate.getTime())) {
        expenseDate = new Date().toISOString().split('T')[0];
      }
      
      setFormData({
        amount: (expense.amount || 0).toString(),
        date: expenseDate,
        category: expense.category || 'Groceries',
        note: expense.note || '',
        store: expense.store || '',
      });
      setIsEditModalOpen(true);
    } catch {
      // Silently fail - form will just have default values
    }
  };

  const handleDeleteClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedExpense) return;
    deleteExpense.mutate(selectedExpense.id);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    if (!householdId) return;

    createExpense.mutate({
      amount,
      date: formData.date,
      category: formData.category,
      note: formData.note.trim(),
      store: formData.store.trim() || undefined,
      householdId,
    }, {
      onSuccess: () => {
        setIsAddModalOpen(false);
        setFormData({
          amount: '',
          date: new Date().toISOString().split('T')[0],
          category: 'Groceries',
          note: '',
          store: '',
        });
      },
    });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    if (!householdId) return;

    updateExpense.mutate({
      id: selectedExpense.id,
      updates: {
        amount,
        date: formData.date,
        category: formData.category,
        note: formData.note.trim(),
        store: formData.store.trim() || undefined,
      },
    }, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        setSelectedExpense(null);
      },
    });
  };

  const expenseCategories = [
    'Groceries',
    'Dining out',
    'Coffee',
    'Household',
    'Personal',
    'Transportation',
    'Other',
  ];

  if (isLoading) {
    return (
      <div className="budget-page">
        <DashboardNav />
        <div className="budget-content">
          <div>Loading expenses...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="budget-page">
        <DashboardNav />
        <div className="budget-content">
          <div>Error: {error?.message || 'Failed to load expenses'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="budget-page">
      <DashboardNav />
      <div className="budget-content">
        <div className="budget-header">
          <div className="header-content">
            <h1 className="page-title">Budget & Expenses</h1>
            <p className="page-subtitle">Track and manage your household spending</p>
          </div>
          <div className="budget-action-buttons">
            <button className="add-expense-btn" onClick={handleAddExpense}>
              Add Expense
            </button>
            <button 
              className="ai-button" 
              onClick={handleAIGenerate}
              disabled={isAIGenerating}
              title="Generate AI-powered sample data"
            >
              {isAIGenerating ? 'Generating...' : 'AI Generate'}
            </button>
            <button 
              className="n8n-button" 
              onClick={handleN8nNotification}
              disabled={isN8nSending}
              title="Send notification via email/telegram/slack"
            >
              {isN8nSending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </div>

        <div className="stats-cards">
          <div className="stat-card">
            <h3 className="stat-label">Today's Expenses</h3>
            <p className="stat-value">${stats.today.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-label">This Month</h3>
            <p className="stat-value">${stats.thisMonth.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-label">Average/Week</h3>
            <p className="stat-value">${stats.averagePerWeek.toFixed(2)}</p>
          </div>
        </div>

        <div className="expenses-section">
          <h2 className="section-title">Recent Expenses</h2>
          <div className="expenses-list">
            {!sortedExpenses || sortedExpenses.length === 0 ? (
              <div className="empty-state">
                <p>No expenses yet. Add your first expense to get started!</p>
              </div>
            ) : (
              sortedExpenses
                .filter((expense) => expense && expense.id) // Additional safety filter
                .map((expense) => {
                if (!expense || !expense.id) return null;
                const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount) || 0;
                return (
                  <div key={expense.id} className="expense-item">
                    <div className="expense-info">
                      <h3 className="expense-name">{expense.store || expense.category || 'Unnamed'}</h3>
                      <p className="expense-category">
                        {expense.category || 'Other'} .{formatDateShort(expense.date || '')}
                      </p>
                      {expense.note && <p className="expense-note">{expense.note}</p>}
                    </div>
                    <div className="expense-actions">
                      <p className="expense-amount">${amount.toFixed(2)}</p>
                      <button
                        className="edit-expense-btn"
                        onClick={() => handleEditExpense(expense)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-expense-btn"
                        onClick={() => handleDeleteClick(expense)}
                        disabled={deleteExpense.isPending}
                      >
                        {deleteExpense.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmitAdd} className="expense-form">
          <div className="form-group">
            <label>Store/Name</label>
            <input
              type="text"
              value={formData.store}
              onChange={(e) => setFormData({ ...formData, store: e.target.value })}
              placeholder="e.g., Walmart, Restaurant"
            />
          </div>
          <div className="form-group">
            <label>Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Note (Optional)</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Add a note about this expense..."
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={createExpense.isPending}>
              {createExpense.isPending ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedExpense(null);
        }}
        title="Edit Expense"
      >
        <form onSubmit={handleSubmitEdit} className="expense-form">
          <div className="form-group">
            <label>Store/Name</label>
            <input
              type="text"
              value={formData.store}
              onChange={(e) => setFormData({ ...formData, store: e.target.value })}
              placeholder="e.g., Walmart, Restaurant"
            />
          </div>
          <div className="form-group">
            <label>Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {expenseCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Note (Optional)</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Add a note about this expense..."
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedExpense(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" disabled={updateExpense.isPending}>
              {updateExpense.isPending ? 'Updating...' : 'Update Expense'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedExpense(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete ${selectedExpense?.store || selectedExpense?.category || 'this expense'}?`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={confirmAIGenerate}
        onClose={() => setConfirmAIGenerate(false)}
        onConfirm={handleConfirmAIGenerate}
        title="Generate AI Data"
        message="This will generate AI-powered sample data (ingredients with nutrition, recipes, pantry items). Continue?"
        confirmText="Continue"
        cancelText="Cancel"
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Notification Modal */}
      <Modal
        isOpen={showNotificationModal}
        onClose={() => {
          setShowNotificationModal(false);
          setNotificationMessage('');
        }}
        title="Send Notification"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendNotification();
          }}
          className="expense-form"
        >
          <div className="form-group">
            <label>Sender Email</label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="your-email@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Notification Channels</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes('email')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedChannels([...selectedChannels, 'email']);
                    } else {
                      setSelectedChannels(selectedChannels.filter((c) => c !== 'email'));
                    }
                  }}
                />
                <span>📧 Email</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes('telegram')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedChannels([...selectedChannels, 'telegram']);
                    } else {
                      setSelectedChannels(selectedChannels.filter((c) => c !== 'telegram'));
                    }
                  }}
                />
                <span>💬 Telegram</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes('slack')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedChannels([...selectedChannels, 'slack']);
                    } else {
                      setSelectedChannels(selectedChannels.filter((c) => c !== 'slack'));
                    }
                  }}
                />
                <span>💼 Slack</span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              placeholder="Enter your notification message..."
              rows={5}
              required
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setShowNotificationModal(false);
                setNotificationMessage('');
              }}
            >
              Cancel
            </button>
            <button type="submit" disabled={isN8nSending || selectedChannels.length === 0}>
              {isN8nSending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BudgetPage;

