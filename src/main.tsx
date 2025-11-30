import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const AppWrapper = () => {
  const { user, household } = useAuth();
  const householdId = household?.id || user?.householdId || '';
  
  return (
    <AppProvider householdId={householdId}>
      <App />
    </AppProvider>
  );
};

const RootApp = () => {
  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
