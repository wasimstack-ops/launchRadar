import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Rocket, Search, Sun, Zap } from 'lucide-react';
import api from '../../api/client';

function getInitials(value) {
  const text = String(value || '').trim();
  if (!text) return 'U';
  if (text.includes('@')) return text.slice(0, 2).toUpperCase();
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function Navbar({ searchTerm, onSearchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLight, setIsLight] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('lr-theme');
    if (saved === 'light') {
      setIsLight(true);
      document.body.classList.add('theme-light');
    }
  }, []);

  // Load current user
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) return;
    api.get('/api/auth/me')
      .then((res) => setCurrentUser(res.data?.data || null))
      .catch(() => { localStorage.removeItem('userToken'); });
  }, []);

  const toggleTheme = () => {
    const next = !isLight;
    setIsLight(next);
    document.body.classList.toggle('theme-light', next);
    localStorage.setItem('lr-theme', next ? 'light' : 'dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    setCurrentUser(null);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="site-nav">
      <div className="nav-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <span className="nav-logo-icon">
            <Zap size={14} />
          </span>
          LaunchRadar
        </Link>

        {/* Search (optional, shown when prop provided) */}
        {onSearchChange !== undefined && (
          <div className="nav-search-wrap">
            <Search size={15} className="nav-search-icon" />
            <input
              type="text"
              className="nav-search"
              placeholder="Search products..."
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {/* Nav Links */}
        <div className="nav-links">
          <Link to="/" className={`nav-link${isActive('/') ? ' active' : ''}`}>
            Products
          </Link>
          <Link to="/crypto" className={`nav-link${isActive('/crypto') ? ' active' : ''}`}>
            Crypto
          </Link>
          <Link to="/agents" className={`nav-link${isActive('/agents') ? ' active' : ''}`}>
            Agents
          </Link>
          <Link to="/airdrops" className={`nav-link${isActive('/airdrops') ? ' active' : ''}`}>
            Airdrops
          </Link>
        </div>

        {/* Actions */}
        <div className="nav-actions">
          <Link to="/submit" className="nav-submit-btn">
            <Rocket size={14} />
            Submit
          </Link>

          {currentUser ? (
            <div className="user-chip">
              <span className="user-avatar">
                {getInitials(currentUser.name || currentUser.email)}
              </span>
              <span className="user-name">
                {currentUser.name || currentUser.email}
              </span>
              <button
                type="button"
                className="user-logout"
                onClick={handleLogout}
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="nav-sign-in"
              onClick={() => navigate('/auth')}
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            className="theme-btn"
            onClick={toggleTheme}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
