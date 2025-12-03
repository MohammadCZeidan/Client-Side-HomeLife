// React Router components for client-side routing
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Public pages (no authentication required)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
// Protected pages (authentication required)
import HomePage from './pages/HomePage';
import PantryPage from './pages/PantryPage';
import ShoppingListPage from './pages/ShoppingListPage';
import WeeklyPlanPage from './pages/WeeklyPlanPage';
import ProfilePage from './pages/ProfilePage';
import RecipesPage from './pages/RecipesPage';
import BudgetPage from './pages/BudgetPage';
// Admin-only page
import AdminPage from './pages/AdminPage';
// Route protection components
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
// App-specific styles
import './App.css';

// Main App component that sets up all routes
function App() {
  return (
    // BrowserRouter enables client-side routing with browser history
    <Router>
      {/* Routes configuration - defines all available paths */}
      <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected routes - require user authentication */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pantry"
          element={
            <ProtectedRoute>
              <PantryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shopping"
          element={
            <ProtectedRoute>
              <ShoppingListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/weekly-plan"
          element={
            <ProtectedRoute>
              <WeeklyPlanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recipes"
          element={
            <ProtectedRoute>
              <RecipesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budget"
          element={
            <ProtectedRoute>
              <BudgetPage />
            </ProtectedRoute>
          }
        />
        
        {/* Admin-only route - requires admin role */}
        <Route
          path="/admin" element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        
        {/* Catch-all route - redirects unknown paths to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
