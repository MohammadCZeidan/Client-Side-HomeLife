// React StrictMode for development warnings and checks
import { StrictMode } from 'react'
// React 18's createRoot API for rendering the app
import { createRoot } from 'react-dom/client'
// React Query for server state management and caching
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// Global CSS styles
import './index.css'
// Main App component with routing
import App from './App.tsx'
// Authentication context provider and hook
import { AuthProvider, useAuth } from './context/AuthContext'
// Application data context provider
import { AppProvider } from './context/AppContext'

// Create React Query client with default configuration for data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds before refetching
      staleTime: 30000, // 30 seconds
      // Don't automatically refetch when window regains focus
      refetchOnWindowFocus: false,
      // Retry failed requests only once
      retry: 1,
    },
  },
})

// Wrapper component that provides app data context after authentication
// Must be inside AuthProvider to access user/household data
const AppWrapper = () => {
  // Get authenticated user and household from auth context
  const { user, household } = useAuth();
  // Extract household ID from household object or user's householdId property
  const householdId = household?.id || user?.householdId || '';
  
  // Provide app data context (pantry, recipes, etc.) to all child components
  return (
    <AppProvider householdId={householdId}>
      <App />
    </AppProvider>
  );
};

// Root component that sets up all providers in correct order
// Providers must be nested: QueryClient -> Auth -> App
const RootApp = () => {
  return (
    // React Query provider enables data fetching hooks throughout the app
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      {/* App wrapper provides data context after auth is available */}
      <AppWrapper />
    </AuthProvider>
    </QueryClientProvider>
  );
};

// Render the app to the DOM root element
// StrictMode enables additional React development checks
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
