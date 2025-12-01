import { useState, useEffect } from 'react';
import DashboardNav from '../components/DashboardNav';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../hooks/useAdmin';
import { householdAPI } from '../services';
import type { Household } from '../types';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user, household, updateProfile } = useAuth();
  const { isAdmin } = useAdmin();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [householdData, setHouseholdData] = useState<Household | null>(null);
  const [loadingInviteCode, setLoadingInviteCode] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        name: user.name || '',
      });
    }
  }, [user]);

  useEffect(() => {
    const loadHouseholdData = async () => {
      if (household?.id) {
        try {
          const householdInfo = await householdAPI.get();
          if (householdInfo) {
            setHouseholdData(householdInfo);
            setInviteCode(householdInfo.inviteCode || '');
          }
        } catch (error) {
          console.error('Failed to load household data:', error);
        }
      }
    };

    loadHouseholdData();
  }, [household]);

  const handleGenerateInviteCode = async () => {
    setLoadingInviteCode(true);
    try {
      const response = await householdAPI.generateInviteCode();
      setInviteCode(response.inviteCode);
      // Refresh household data to get updated invite code and members
      const householdInfo = await householdAPI.get();
      if (householdInfo) {
        setHouseholdData(householdInfo);
      }
      console.log('Invitation code generated successfully!');
    } catch (error) {
      console.error('Failed to generate invite code:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate invitation code. Please try again.';
      console.error(errorMessage);
    } finally {
      setLoadingInviteCode(false);
    }
  };

  const handleEditProfile = () => {
    if (user) {
      setFormData({
        email: user.email || '',
        name: user.name || '',
      });
      setError('');
      setIsEditModalOpen(true);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

    try {
      await updateProfile({
        email: formData.email.trim(),
        name: formData.name.trim(),
      });
      setIsEditModalOpen(false);
      setError('');
      console.log('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    const code = inviteCode || householdData?.inviteCode || household?.inviteCode || '';
    if (!code) {
      console.log('No invitation code available. Please generate one first.');
      return;
    }
    navigator.clipboard.writeText(code).then(() => {
      console.log('Invitation code copied to clipboard!');
    });
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName}?`)) {
      // TODO: Implement remove member API call when backend endpoint is available
      console.log(`Remove member functionality will be implemented when the backend endpoint is available.`);
    }
  };

  // Get members from household data
  const members = householdData?.members || household?.members || [];

  return (
    <div className="profile-page">
      <DashboardNav />
      <div className="profile-content">
        <h1 className="page-title">Profile</h1>
        <h2 className="section-subtitle">My profile:</h2>

        <div className="profile-section">
          <div className="profile-form">
            <div className="profile-info-card">
              <div className="info-row">
                <div className="info-label">Email</div>
                <div className="info-value">{user?.email || 'Not set'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Name</div>
                <div className="info-value">
                  {user?.name || 'Not set'}
                  {user?.role === 'admin' && (
                    <span className="role-badge admin" style={{ 
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'var(--primary)',
                      color: 'var(--white)',
                      marginLeft: '8px'
                    }}>
                      Admin
                    </span>
                  )}
                </div>
              </div>
              <button className="edit-profile-btn" onClick={handleEditProfile}>
                Edit Profile
              </button>
            </div>
          </div>

          <div className="family-section">
            <h3 className="family-title">{household?.name || "Sophia's Family"}</h3>
            <div className="invitation-section">
              <label>Invitation code</label>
              <div className="code-container">
                <input
                  type="text"
                  value={inviteCode || householdData?.inviteCode || household?.inviteCode || ''}
                  readOnly
                  className="code-input"
                  placeholder="No code generated"
                />
                <button 
                  className="copy-btn" 
                  onClick={handleCopyCode}
                  disabled={!inviteCode && !householdData?.inviteCode && !household?.inviteCode}
                >
                  Copy
                </button>
                <button 
                  className="generate-btn" 
                  onClick={handleGenerateInviteCode}
                  disabled={loadingInviteCode}
                >
                  {loadingInviteCode ? 'Generating...' : 'Generate Code'}
                </button>
              </div>
            </div>

            <div className="members-section">
              <h3 className="members-title">Members</h3>
              {members.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No members found</p>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="member-item">
                    <div>
                      <span className="member-name">{member.name}</span>
                      {member.email && (
                        <span className="member-email" style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {member.email}
                        </span>
                      )}
                    </div>
                    {member.id !== user?.id && (
                      <button className="remove-btn" onClick={() => handleRemoveMember(member.id, member.name)}>
                        Remove
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setError('');
        }}
        title="Edit Profile"
      >
        <form onSubmit={handleSaveProfile} className="profile-edit-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input"
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              required
              placeholder="Enter your name"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setError('');
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProfilePage;

