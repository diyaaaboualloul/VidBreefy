import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#14b8a6"/>
            <path d="M8 12L16 8L24 12V20L16 24L8 20V12Z" stroke="white" strokeWidth="2"/>
            <circle cx="16" cy="16" r="4" fill="white"/>
          </svg>
          <span>VidBreefy</span>
        </Link>

        <button 
          className={`navbar-hamburger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-menu ${menuOpen ? 'active' : ''}`}>
          <div className="navbar-links">
            <Link to="/summarize" className={`navbar-link ${isActive('/summarize') ? 'active' : ''}`}>
              Summarize
            </Link>
            {user && (
              <Link to="/dashboard" className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}>
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className={`navbar-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
                Admin
              </Link>
            )}
          </div>

          <div className="navbar-actions">
            {user ? (
              <div className="navbar-user">
                <span className="user-email">{user.email}</span>
                {user.tier === 'pro' && <span className="pro-badge">PRO</span>}
                <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Log In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}