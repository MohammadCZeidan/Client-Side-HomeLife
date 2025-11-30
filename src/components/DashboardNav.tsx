import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardNav.css';

const DashboardNav = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Determine active page based on current location
  const getActiveClass = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="dashboard-nav">
      <div className="nav-header">
        <div className="nav-logo">
          <svg className="house-icon" width="40" height="30" viewBox="0 0 40 30" fill="none">
            <path d="M5 10L20 2L35 10V25H25V15H15V25H5V10Z" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
          <span className="logo-text">HomeLife</span>
        </div>
      </div>
      <div className="nav-menu">
        <Link to="/home" className={`nav-item ${getActiveClass('/home')}`}>
          Home
        </Link>
        <Link to="/pantry" className={`nav-item ${getActiveClass('/pantry')}`}>
          Storage
        </Link>
        <Link to="/shopping" className={`nav-item ${getActiveClass('/shopping')}`}>
          Groceries
        </Link>
        <Link to="/weekly-plan" className={`nav-item ${getActiveClass('/weekly-plan')}`}>
          WeeklyPlan
        </Link>
        <Link to="/recipes" className={`nav-item ${getActiveClass('/recipes')}`}>
          Recipes
        </Link>
        <Link to="/profile" className={`nav-item ${getActiveClass('/profile')}`}>
          Profile
        </Link>
        <Link to="/budget" className={`nav-item ${getActiveClass('/budget')}`}>
          Budget
        </Link>
        <button className="nav-item logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default DashboardNav;

