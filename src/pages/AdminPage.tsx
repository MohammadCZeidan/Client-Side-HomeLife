import { useState, useEffect } from 'react';
import DashboardNav from '../components/DashboardNav';
import { useAdmin } from '../hooks/useAdmin';
import { useAuth } from '../context/AuthContext';
import { adminAPI, type AdminUser } from '../services';
import './AdminPage.css';

const AdminPage = () => {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'households'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [households, setHouseholds] = useState<Array<{
    id: string;
    name: string;
    members: AdminUser[];
    inviteCode?: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'member'>('all');
  const [filterHousehold, setFilterHousehold] = useState<'all' | 'with' | 'without'>('all');

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadHouseholds();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const allUsers = await adminAPI.getAllUsers();
      console.log('Loaded users:', allUsers);
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMsg);
      alert(`Error loading users: ${errorMsg}\n\nCheck console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const loadHouseholds = async () => {
    try {
      const allHouseholds = await adminAPI.getAllHouseholds();
      setHouseholds(allHouseholds);
    } catch (err) {
      console.error('Failed to load households:', err);
      // Don't set error for households, just log it
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.householdName && user.householdName.toLowerCase().includes(searchTerm.toLowerCase()));

    // Role filter
    const matchesRole = filterRole === 'all' || user.role === filterRole;

    // Household filter
    const matchesHousehold = 
      filterHousehold === 'all' ||
      (filterHousehold === 'with' && user.householdId !== null) ||
      (filterHousehold === 'without' && user.householdId === null);

    return matchesSearch && matchesRole && matchesHousehold;
  });

  // Group users by household for display
  const usersByHousehold = filteredUsers.reduce((acc, user) => {
    const key = user.householdId || 'no-household';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(user);
    return acc;
  }, {} as Record<string, AdminUser[]>);

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <DashboardNav />
        <div className="admin-content">
          <h1>Access Denied</h1>
          <p>You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <DashboardNav />
      <div className="admin-content">
        <h1 className="admin-title">Admin Dashboard</h1>
        <p className="admin-subtitle">Welcome, {user?.name} (Admin)</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Total Users: {users.length} | Total Households: {households.length}
        </p>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            All Users
          </button>
          <button
            className={`admin-tab ${activeTab === 'households' ? 'active' : ''}`}
            onClick={() => setActiveTab('households')}
          >
            All Households
          </button>
        </div>

        <div className="admin-tab-content">
          {activeTab === 'users' && (
            <div className="admin-section">
              <div className="admin-section-header">
                <h2>All Users</h2>
                <button 
                  className="refresh-btn"
                  onClick={() => {
                    loadUsers();
                    loadHouseholds();
                  }}
                  disabled={loading}
                >
                  {loading ? '⏳ Loading...' : '🔄 Refresh'}
                </button>
              </div>

              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}

              {/* Filters */}
              <div className="admin-filters">
                <input
                  type="text"
                  placeholder="🔍 Search by name, email, or household..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as 'all' | 'admin' | 'member')}
                  className="filter-select"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin Only</option>
                  <option value="member">Member Only</option>
                </select>
                <select
                  value={filterHousehold}
                  onChange={(e) => setFilterHousehold(e.target.value as 'all' | 'with' | 'without')}
                  className="filter-select"
                >
                  <option value="all">All Users</option>
                  <option value="with">With Household</option>
                  <option value="without">Without Household</option>
                </select>
              </div>

              {loading ? (
                <div className="loading-message">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="empty-message">
                  No users found. {error ? `Error: ${error}` : 'Make sure you are logged in as admin and the API endpoint is working.'}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="empty-message">No users found matching your filters.</div>
              ) : (
                <div className="users-container">
                  {/* Display by household groups */}
                  {Object.entries(usersByHousehold).map(([householdKey, householdUsers]) => (
                    <div key={householdKey} className="household-group">
                      <div className="household-header">
                        <h3>
                          {householdKey === 'no-household' 
                            ? '🏠 No Household' 
                            : `🏠 ${householdUsers[0].householdName || `Household ${householdKey}`}`}
                        </h3>
                        <span className="household-id">ID: {householdKey === 'no-household' ? 'N/A' : householdKey}</span>
                        <span className="member-count">{householdUsers.length} member{householdUsers.length !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="users-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>User ID</th>
                              <th>Household ID</th>
                              <th>Shares With</th>
                            </tr>
                          </thead>
                          <tbody>
                            {householdUsers.map((user) => (
                              <tr key={user.id}>
                                <td>
                                  <strong>{user.name}</strong>
                                </td>
                                <td>{user.email}</td>
                                <td>
                                  <span className={`role-badge ${user.role}`}>
                                    {user.role === 'admin' ? '👑 Admin' : '👤 Member'}
                                  </span>
                                </td>
                                <td>
                                  <code className="id-code">{user.id}</code>
                                </td>
                                <td>
                                  {user.householdId ? (
                                    <code className="id-code">{user.householdId}</code>
                                  ) : (
                                    <span className="no-household">—</span>
                                  )}
                                </td>
                                <td>
                                  {user.householdMembers && user.householdMembers.length > 0 ? (
                                    <div className="shares-with">
                                      {user.householdMembers.map((member, idx) => (
                                        <span key={member.id} className="member-chip">
                                          {member.name}
                                          {idx < user.householdMembers!.length - 1 && ', '}
                                        </span>
                                      ))}
                                    </div>
                                  ) : user.householdId ? (
                                    <span className="no-members">No other members</span>
                                  ) : (
                                    <span className="no-household">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'households' && (
            <div className="admin-section">
              <div className="admin-section-header">
                <h2>All Households</h2>
                <button 
                  className="refresh-btn"
                  onClick={() => {
                    loadUsers();
                    loadHouseholds();
                  }}
                  disabled={loading}
                >
                  {loading ? '⏳ Loading...' : '🔄 Refresh'}
                </button>
              </div>

              {loading ? (
                <div className="loading-message">Loading households...</div>
              ) : households.length === 0 ? (
                <div className="empty-message">No households found.</div>
              ) : (
                <div className="households-container">
                  {households.map((household) => (
                    <div key={household.id} className="household-card">
                      <div className="household-card-header">
                        <h3>{household.name}</h3>
                        <div className="household-card-info">
                          <span className="household-id">ID: {household.id}</span>
                          {household.inviteCode && (
                            <span className="invite-code">Code: {household.inviteCode}</span>
                          )}
                          <span className="member-count">{household.members.length} member{household.members.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      
                      <div className="household-members">
                        <h4>Members:</h4>
                        <div className="members-list">
                          {household.members.length === 0 ? (
                            <p className="no-members-text">No members in this household</p>
                          ) : (
                            <table className="household-members-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>Role</th>
                                  <th>User ID</th>
                                </tr>
                              </thead>
                              <tbody>
                                {household.members.map((member) => (
                                  <tr key={member.id}>
                                    <td><strong>{member.name}</strong></td>
                                    <td>{member.email}</td>
                                    <td>
                                      <span className={`role-badge ${member.role}`}>
                                        {member.role === 'admin' ? '👑 Admin' : '👤 Member'}
                                      </span>
                                    </td>
                                    <td>
                                      <code className="id-code">{member.id}</code>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

