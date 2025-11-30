import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <nav className="navbar">
        <div className="nav-brand">
          <svg className="house-icon" width="40" height="30" viewBox="0 0 40 30" fill="none">
            <path d="M5 10L20 2L35 10V25H25V15H15V25H5V10Z" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
          <span className="brand-text">HomeLife</span>
        </div>
        <div className="nav-links">
          <Link to="/login" className="nav-link">For Work</Link>
          <Link to="/login" className="nav-link">Login</Link>
        </div>
      </nav>

      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span>Eat Smart,</span>
            <span>Live Healthy</span>
          </h1>
          <p className="hero-description">
            Personalize nutrition plans, healthy recipes; and expert guidance to transform your lifestyle.
          </p>
          <Link to="/register" className="cta-button">Start Your Journey</Link>
        </div>
        <div className="hero-image">
          <div className="image-placeholder"></div>
        </div>
      </div>

      <div className="features-section">
        <div className="feature-item">
          <div className="feature-icon">📋</div>
          <h3>Personalized meal plans</h3>
        </div>
        <div className="feature-item">
          <div className="feature-icon">📝</div>
          <h3>Healthy Recipes</h3>
        </div>
        <div className="feature-item">
          <div className="feature-icon">🧪</div>
          <h3>Expert Guidance</h3>
        </div>
        <div className="feature-item">
          <div className="feature-icon">📊</div>
          <h3>Track Your Progress</h3>
        </div>
      </div>

      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-image"></div>
            <h3>Signup & set goals</h3>
          </div>
          <div className="step">
            <div className="step-image"></div>
            <h3>Recieve Personalized Plans</h3>
          </div>
          <div className="step">
            <div className="step-image"></div>
            <h3>Track & Improve Health</h3>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>Contact us Homelife@gemail.com</p>
        <p>@2025 HomeLife</p>
      </footer>
    </div>
  );
};

export default LandingPage;

