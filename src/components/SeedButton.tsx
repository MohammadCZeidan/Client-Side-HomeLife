import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { aiAPI } from '../services';
import './SeedButton.css';

const SeedButton = () => {
  const { household, user } = useAuth();
  const { refreshPantry, refreshRecipes, refreshShoppingLists, refreshExpenses } = useApp();
  const [isSeeding, setIsSeeding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [seedResult, setSeedResult] = useState<string>('');

  const handleSeed = async () => {
    const householdId = household?.id || user?.householdId;
    if (!householdId) {
      alert('Please create or join a household first');
      return;
    }

    if (!confirm('This will generate AI-powered sample data (ingredients with nutrition, recipes, pantry items). Continue?')) {
      return;
    }

    setIsSeeding(true);
    setSeedResult('');
    try {
      const result = await aiAPI.generateSeedData();
      setSeedResult(`Created: ${result.created.ingredients} ingredients, ${result.created.recipes} recipes, ${result.created.pantry_items} pantry items`);
      
      // Refresh all data
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
      alert('Failed to generate seed data. Please check your OpenAI API key in the backend .env file.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Only show in development and when user is logged in
  if (import.meta.env.PROD || !user) {
    return null;
  }

  return (
    <div className="seed-button-container">
      <button
        className="seed-button"
        onClick={handleSeed}
        disabled={isSeeding}
        title="Load sample data for testing"
      >
        {isSeeding ? 'Generating with AI...' : '🤖 Generate AI Data'}
      </button>
      {showSuccess && (
        <span className="seed-success">
          ✅ {seedResult || 'Data generated!'}
        </span>
      )}
    </div>
  );
};

export default SeedButton;

