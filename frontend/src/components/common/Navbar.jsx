import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Boxes, LogOut, Menu, Moon, Rocket, Sun, User, X } from 'lucide-react';
import api from '../../api/client';
import AuthPromptModal from './AuthPromptModal';

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
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const loadCurrentUser = () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      setCurrentUser(null);
      return;
    }

    api.get('/api/auth/me')
      .then((res) => setCurrentUser(res.data?.data || null))
      .catch(() => {
        localStorage.removeItem('userToken');
        setCurrentUser(null);
      });
  };

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
    loadCurrentUser();
  }, []);

  useEffect(() => {
    const handleAuthChanged = () => loadCurrentUser();
    window.addEventListener('auth-changed', handleAuthChanged);
    return () => window.removeEventListener('auth-changed', handleAuthChanged);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowProfileMenu(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!profileMenuRef.current || profileMenuRef.current.contains(event.target)) return;
      setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/');
  };

  const handleSubmitClick = (event) => {
    event.preventDefault();
    if (currentUser) {
      navigate('/submit');
      return;
    }
    setShowAuthPrompt(true);
  };

  const isActive = (path) => location.pathname === path;
  return (
    <>
      <nav className="site-nav">
        <div className="nav-inner">
          {/* Logo */}
          <Link to="/" className="nav-logo">
            <span className="nav-logo-icon">
              <Boxes size={14} />
            </span>
            WAYB
          </Link>

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
            {currentUser ? (
              <Link to="/workspace" className={`nav-link${isActive('/workspace') ? ' active' : ''}`}>
                My Workspace
              </Link>
            ) : null}
          </div>

          {/* Actions */}
          <div className="nav-actions">
            <Link to="/submit" className="nav-submit-btn" onClick={handleSubmitClick}>
              <Rocket size={14} />
              Submit
            </Link>

            {!currentUser ? (
              <Link to="/auth?next=%2Fworkspace" className="nav-login-btn">
                Log In
              </Link>
            ) : null}

            {currentUser ? (
              <div className="profile-menu" ref={profileMenuRef}>
                <button
                  type="button"
                  className="profile-avatar-btn"
                  onClick={() => setShowProfileMenu((current) => !current)}
                  title="Open profile menu"
                  aria-haspopup="true"
                  aria-expanded={showProfileMenu}
                >
                  <span className="profile-avatar">
                    {getInitials(currentUser.name || currentUser.email)}
                  </span>
                </button>
                {showProfileMenu ? (
                  <div className="profile-menu-panel">
                    <div className="profile-menu-header">
                      <span className="profile-menu-name">{currentUser.name || 'Founder'}</span>
                      <span className="profile-menu-email">{currentUser.email}</span>
                    </div>
                    <button type="button" className="profile-menu-item" onClick={() => navigate('/me')}>
                      <User size={14} /> Update profile
                    </button>
                    <button type="button" className="profile-menu-item" onClick={() => navigate('/upgrade')}>
                      <Rocket size={14} /> Upgrade to Pro
                    </button>
                    <button type="button" className="profile-menu-item danger" onClick={handleLogout}>
                      <LogOut size={14} /> Log out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              className="theme-btn"
              onClick={toggleTheme}
              title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {isLight ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <button
              type="button"
              className="nav-hamburger"
              onClick={() => setMobileOpen((current) => !current)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {mobileOpen ? (
          <div className="nav-mobile-panel">
            <div className="nav-mobile-links">
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
              {currentUser ? (
                <Link to="/workspace" className={`nav-link${isActive('/workspace') ? ' active' : ''}`}>
                  My Workspace
                </Link>
              ) : null}
              {!currentUser ? (
                <Link to="/auth?next=%2Fworkspace" className="nav-link">
                  Log In
                </Link>
              ) : null}
            </div>
            {currentUser ? (
              <div className="nav-mobile-user">
                <span className="user-avatar">
                  {getInitials(currentUser.name || currentUser.email)}
                </span>
                <span className="nav-mobile-user-name">
                  {currentUser.name || currentUser.email}
                </span>
                <div className="nav-mobile-user-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/me')}>
                    Update profile
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>
      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        onSuccess={() => {
          setShowAuthPrompt(false);
          navigate('/submit');
        }}
        onGoogleContinue={() => {
          setShowAuthPrompt(false);
          navigate(`/auth?next=${encodeURIComponent('/submit')}`);
        }}
      />
    </>
  );
}

export default Navbar;
