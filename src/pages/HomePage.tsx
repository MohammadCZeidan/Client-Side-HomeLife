import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CreditCard, Package, ShoppingCart } from 'lucide-react';
import DashboardNav from '../components/DashboardNav';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { pantryAPI, budgetAPI, insightsAPI } from '../services';
import { getWeekStartDate } from '../utils/dateUtils';
import { getDaysUntilExpiry } from '../utils/dateUtils';
import './HomePage.css';

const HomePage = () => {
  const { user, household, createHousehold, joinHousehold } = useAuth();
  const { pantryItems, expenses, shoppingLists, refreshPantry, refreshExpenses, refreshShoppingLists } = useApp();
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [householdAction, setHouseholdAction] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [weeklyInsights, setWeeklyInsights] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !household && !user.householdId) {
      setIsHouseholdModalOpen(true);
    }
  }, [user, household]);

  useEffect(() => {
    const householdId = household?.id || user?.householdId;
    if (householdId) {
      refreshPantry();
      refreshExpenses();
      refreshShoppingLists();
      
      // Load weekly insights
      setIsLoadingInsights(true);
      const weekStartDate = getWeekStartDate();
      insightsAPI.getWeeklyInsights(householdId, weekStartDate)
        .then(setWeeklyInsights)
        .catch(console.error)
        .finally(() => setIsLoadingInsights(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, user?.householdId]); // Only depend on householdId to avoid infinite loops

  // Calculate expiring items (items expiring in 7 days or less)
  const expiringItems = (pantryItems || []).filter((item) => {
    if (!item || !item.expiryDate) return false;
    try {
      const days = getDaysUntilExpiry(item.expiryDate);
      return days >= 0 && days <= 7;
    } catch {
      return false;
    }
  });

  // Calculate this week's expenses (synchronized with BudgetPage calculation)
  const thisWeekExpenses = (expenses || [])
    .filter((exp) => {
      if (!exp || !exp.date || !exp.amount) return false;
      try {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        
        const expenseDate = new Date(exp.date);
        if (isNaN(expenseDate.getTime())) return false;
        expenseDate.setHours(0, 0, 0, 0);
        
        // Include expenses from week start to now
        return expenseDate >= weekStart && expenseDate <= now;
      } catch {
        return false;
      }
    })
    .reduce((sum, exp) => {
      const amount = typeof exp.amount === 'number' ? exp.amount : parseFloat(exp.amount) || 0;
      return sum + amount;
    }, 0);

  // Calculate total shopping list items across all lists
  const totalShoppingItems = (shoppingLists || []).reduce((total, list) => {
    return total + (list.items?.length || 0);
  }, 0);

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createHousehold(householdName);
      setIsHouseholdModalOpen(false);
      setHouseholdName('');
    } catch (error) {
      console.error('Failed to create household:', error);
    }
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await joinHousehold(inviteCode);
      setIsHouseholdModalOpen(false);
      setInviteCode('');
    } catch (error) {
      console.error('Failed to join household:', error);
    }
  };

  return (
    <div className="home-page">
      <DashboardNav />
      <div className="home-content">
        <h1 className="welcome-text">Welcome back! {user?.name || 'User'}</h1>

        {!household && !user?.householdId && (
          <div className="household-prompt">
            <p>You need to create or join a household to get started.</p>
            <button onClick={() => setIsHouseholdModalOpen(true)}>Set up Household</button>
          </div>
        )}

        <div className="stats-grid">
          <div 
            className="stat-card clickable" 
            onClick={() => navigate('/pantry')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/pantry');
              }
            }}
          >
            <div className="stat-label-wrapper">
              <div className="stat-icon">
                <Clock size={18} strokeWidth={2} />
              </div>
              <div className="stat-label">Expiring Soon</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-value">{expiringItems.length}</div>
          </div>
          <div 
            className="stat-card clickable" 
            onClick={() => navigate('/budget')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/budget');
              }
            }}
          >
            <div className="stat-label-wrapper">
              <div className="stat-icon">
                <CreditCard size={18} strokeWidth={2} />
              </div>
              <div className="stat-label">Spent This Week</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-value">${thisWeekExpenses.toFixed(2)}</div>
          </div>
          <div 
            className="stat-card clickable" 
            onClick={() => navigate('/pantry')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/pantry');
              }
            }}
          >
            <div className="stat-label-wrapper">
              <div className="stat-icon">
                <Package size={18} strokeWidth={2} />
              </div>
              <div className="stat-label">In Pantry</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-value">{pantryItems?.length || 0}</div>
          </div>
          <div 
            className="stat-card clickable" 
            onClick={() => navigate('/shopping')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/shopping');
              }
            }}
          >
            <div className="stat-label-wrapper">
              <div className="stat-icon">
                <ShoppingCart size={18} strokeWidth={2} />
              </div>
              <div className="stat-label">In Groceries</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-value">{totalShoppingItems}</div>
          </div>
        </div>

        <div className="quick-actions-section">
          <div className="section-header">
            <h2 className="section-title">Quick Bar</h2>
            <p className="section-subtitle">Manage your household efficiently</p>
          </div>
          <div className="action-buttons">
            <button className="action-btn" onClick={() => navigate('/pantry')}>
              <span className="action-btn-icon">
                <Package size={24} strokeWidth={2} />
              </span>
              <span className="action-btn-text">Add Items</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/recipes')}>
              <span className="action-btn-icon">
                <Clock size={24} strokeWidth={2} />
              </span>
              <span className="action-btn-text">Create Meal</span>
            </button>
            <button className="action-btn" onClick={() => navigate('/shopping')}>
              <span className="action-btn-icon">
                <ShoppingCart size={24} strokeWidth={2} />
              </span>
              <span className="action-btn-text">Create List</span>
            </button>
          </div>
        </div>

        {weeklyInsights && (
          <div className="weekly-insights-section" style={{ 
            marginTop: '30px', 
            padding: '20px', 
            background: '#f8f9fa', 
            borderRadius: '12px',
            border: '1px solid #dee2e6'
          }}>
            <h2 className="section-title">📊 Weekly Insights</h2>
            {isLoadingInsights ? (
              <p>Loading insights...</p>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ padding: '15px', background: 'white', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                      ${weeklyInsights.spending?.total?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ color: '#6c757d', fontSize: '14px' }}>Total Spent</div>
                    <div style={{ color: '#6c757d', fontSize: '12px' }}>{weeklyInsights.spending?.count || 0} transactions</div>
                  </div>
                  <div style={{ padding: '15px', background: 'white', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                      {weeklyInsights.waste?.count || 0}
                    </div>
                    <div style={{ color: '#6c757d', fontSize: '14px' }}>Items Wasted</div>
                  </div>
                  <div style={{ padding: '15px', background: 'white', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                      {weeklyInsights.planning?.meals_planned || 0}
                    </div>
                    <div style={{ color: '#6c757d', fontSize: '14px' }}>Meals Planned</div>
                    <div style={{ color: '#6c757d', fontSize: '12px' }}>{weeklyInsights.planning?.coverage?.toFixed(1) || 0}% coverage</div>
                  </div>
                  <div style={{ padding: '15px', background: 'white', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                      {weeklyInsights.expiring_soon?.length || 0}
                    </div>
                    <div style={{ color: '#6c757d', fontSize: '14px' }}>Expiring Soon</div>
                  </div>
                </div>

                {weeklyInsights.ai_summary && (
                  <div style={{ 
                    padding: '15px', 
                    background: '#e7f3ff', 
                    borderRadius: '8px',
                    border: '1px solid #4CAF50',
                    marginTop: '15px'
                  }}>
                    <h3 style={{ marginTop: 0, color: '#4CAF50' }}>🤖 AI Weekly Summary</h3>
                    <p style={{ margin: 0, lineHeight: '1.6' }}>{weeklyInsights.ai_summary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Household Setup Modal */}
      <Modal
        isOpen={isHouseholdModalOpen}
        onClose={() => {
          if (household || user?.householdId) {
            setIsHouseholdModalOpen(false);
          }
        }}
        title={householdAction === 'create' ? 'Create Household' : 'Join Household'}
      >
        <div className="household-form">
          <div className="form-tabs">
            <button
              className={householdAction === 'create' ? 'active' : ''}
              onClick={() => setHouseholdAction('create')}
            >
              Create
            </button>
            <button
              className={householdAction === 'join' ? 'active' : ''}
              onClick={() => setHouseholdAction('join')}
            >
              Join
            </button>
          </div>

          {householdAction === 'create' ? (
            <form onSubmit={handleCreateHousehold}>
              <div className="form-group">
                <label>Household Name</label>
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g., Sophia's Family"
                  required
                />
              </div>
              <button type="submit" className="submit-btn">
                Create Household
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinHousehold}>
              <div className="form-group">
                <label>Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  required
                />
              </div>
              <button type="submit" className="submit-btn">
                Join Household
              </button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default HomePage;
