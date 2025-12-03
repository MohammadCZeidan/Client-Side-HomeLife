// React Router component for navigation/redirects
import { Navigate } from 'react-router-dom';
// Authentication context hook to check if user is logged in
import { useAuth } from '../context/AuthContext';

// TypeScript interface for ProtectedRoute component props
interface ProtectedRouteProps {
  // React children - the protected component to render if user is authenticated
  children: React.ReactNode;
}

// Route protection component - only renders children if user is authenticated
// Redirects to login page if user is not logged in
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Get current user and loading state from authentication context
  const { user, loading } = useAuth();

  // Show loading indicator while checking authentication status
  if (loading) {
    return <div>Loading...</div>;
  }

  // If no user is logged in, redirect to login page
  // replace prop replaces current history entry instead of adding new one
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated - render the protected children components
  return <>{children}</>;
};

export default ProtectedRoute;

