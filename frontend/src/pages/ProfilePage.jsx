import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

function getInitials(value) {
  const text = String(value || '').trim();
  if (!text) return 'U';
  if (text.includes('@')) return text.slice(0, 2).toUpperCase();
  const parts = text.split(/s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] || '') + (parts[1][0] || '');
}

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/auth/me')
      .then((r) => setUser(r.data?.data || null))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('userToken');
    navigate('/', { replace: true });
  };

  return (
    <div>
      <Navbar />
      <div className='profile-shell'>
        <div className='profile-inner'>
          <Link to='/' style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-2)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: 24 }}>
            <ArrowLeft size={14} /> Back to products
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 24 }}>Your Account</h1>
          {error && <p className='form-error'>{error}</p>}
          {loading && <p style={{ color: 'var(--text-2)' }}>Loading...</p>}
          {user && !loading && (
            <div className='profile-card'>
              <div className='profile-avatar-wrap'>
                <div className='profile-avatar-lg'>{getInitials(user.name || user.email)}</div>
                <div>
                  <p className='profile-name'>{user.name || 'Anonymous'}</p>
                  <p className='profile-email'>{user.email}</p>
                </div>
              </div>
              <div className='profile-rows'>
                <div className='profile-row'>
                  <span className='profile-row-label'>Role</span>
                  <span className={'role-badge ' + (user.role === 'admin' ? 'admin' : 'user')}>{user.role || 'user'}</span>
                </div>
                <div className='profile-row'>
                  <span className='profile-row-label'>Member since</span>
                  <span className='profile-row-value'>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</span>
                </div>
                <div className='profile-row'>
                  <span className='profile-row-label'>Email</span>
                  <span className='profile-row-value' style={{ fontSize: '0.875rem' }}>{user.email}</span>
                </div>
              </div>
              <div className='profile-actions'>
                <button type='button' className='btn btn-ghost btn-sm' onClick={logout}><LogOut size={14} /> Sign out</button>
                <Link to='/submit' className='btn btn-primary btn-sm'>Submit a product</Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default ProfilePage;
