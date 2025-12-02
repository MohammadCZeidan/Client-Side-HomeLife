import { useAuth } from '../context/AuthContext';

// Quick hook to check if current user is admin
export const useAdmin = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  return {
    isAdmin,
    user,
  };
};

