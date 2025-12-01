import { useAuth } from '../context/AuthContext';

export const useAdmin = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  return {
    isAdmin,
    user,
  };
};

