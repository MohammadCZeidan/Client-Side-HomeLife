import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useAdmin } from '../hooks/useAdmin';
import { aiAPI } from '../services';
import AlertModal from './AlertModal';
import ConfirmModal from './ConfirmModal';
import './SeedButton.css';

const SeedButton = () => {
  const { household, user } = useAuth();
  const { isAdmin } = useAdmin();
  const { refreshPantry, refreshRecipes, refreshShoppingLists, refreshExpenses } = useApp();
  const [isSeeding, setIsSeeding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [seedResult, setSeedResult] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const handleSeed = () => {
    const householdId = household?.id || user?.householdId;
    if (!householdId) {
      setAlertModal({
        isOpen: true,
        title: 'Household Required',
        message: 'Please create or join a household first',
        type: 'warning',
      });
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSeed = async () => {
    setShowConfirmModal(false);
    setIsSeeding(true);
    setSeedResult('');
    try {
      const result = await aiAPI.generateSeedData();
      setSeedResult(`Created: ${result.created.ingredients} ingredients, ${result.created.recipes} recipes, ${result.created.pantry_items} pantry items`);
      
      // Refresh all the data so new items show up immediately
      await Promise.all([
        refreshPantry(),
        refreshRecipes(),
        refreshShoppingLists(),
        refreshExpenses(),
      ]);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSeedResult('');
      }, 5000);
    } catch (error) {
      console.error('Failed to generate seed data:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to generate seed data. Please check your OpenAI API key in the backend .env file.',
        type: 'error',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // Only show this button in dev mode and if user is admin
  if (import.meta.env.PROD || !user || !isAdmin) {
    return null;
  }

  return (
    <>
      <div className="seed-button-container">
        <button
          className="seed-button"
          onClick={handleSeed}
          disabled={isSeeding}
          title="Load sample data for testing (Admin Only)"
        >
          {isSeeding ? 'Generating with AI...' : '🤖 Generate AI Data'}
        </button>
        {showSuccess && (
          <span className="seed-success">
            ✅ {seedResult || 'Data generated!'}
          </span>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSeed}
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
    </>
  );
};

export default SeedButton;

