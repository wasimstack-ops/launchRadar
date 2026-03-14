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
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] || '') + (parts[1][0] || '');
}

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', profileRole: '', company: '', bio: '' });
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/auth/me')
      .then((r) => {
        const nextUser = r.data?.data || null;
        setUser(nextUser);
        setForm({
          name: nextUser?.name || '',
          profileRole: nextUser?.profileRole || 'founder',
          company: nextUser?.company || '',
          bio: nextUser?.bio || '',
        });
      })
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.patch('/api/auth/me', {
        name: String(form.name || '').trim(),
        profileRole: form.profileRole,
        company: String(form.company || '').trim(),
        bio: String(form.bio || '').trim(),
      });
      const updatedUser = response.data?.data || user;
      setUser(updatedUser);
      setForm({
        name: updatedUser?.name || form.name,
        profileRole: updatedUser?.profileRole || form.profileRole,
        company: updatedUser?.company || form.company,
        bio: updatedUser?.bio || form.bio,
      });
      setSuccess('Profile updated.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update your profile right now.');
    } finally {
      setSaving(false);
    }
  };

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
          {success && <p className='form-success'>{success}</p>}
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
                  <span className={`role-badge ${user.profileRole || 'founder'}`}>{user.profileRole || 'founder'}</span>
                </div>
                {user.company ? (
                  <div className='profile-row'>
                    <span className='profile-row-label'>Company</span>
                    <span className='profile-row-value'>{user.company}</span>
                  </div>
                ) : null}
                <div className='profile-row'>
                  <span className='profile-row-label'>Member since</span>
                  <span className='profile-row-value'>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</span>
                </div>
                <div className='profile-row'>
                  <span className='profile-row-label'>Email</span>
                  <span className='profile-row-value' style={{ fontSize: '0.875rem' }}>{user.email}</span>
                </div>
                {user.bio ? (
                  <div className='profile-row'>
                    <span className='profile-row-label'>Bio</span>
                    <span className='profile-row-value'>{user.bio}</span>
                  </div>
                ) : null}
              </div>
              <form className='profile-form' onSubmit={handleSave}>
                <label className='profile-field'>
                  <span className='profile-row-label'>Full name</span>
                  <input
                    className='input'
                    type='text'
                    name='name'
                    value={form.name}
                    onChange={handleChange}
                    placeholder='Your full name'
                    disabled={saving}
                  />
                </label>
                <label className='profile-field'>
                  <span className='profile-row-label'>Role</span>
                  <select
                    className='input-select'
                    name='profileRole'
                    value={form.profileRole}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value='founder'>Founder</option>
                    <option value='builder'>Builder</option>
                    <option value='investor'>Investor</option>
                    <option value='advisor'>Advisor</option>
                    <option value='other'>Other</option>
                  </select>
                </label>
                <label className='profile-field'>
                  <span className='profile-row-label'>Company</span>
                  <input
                    className='input'
                    type='text'
                    name='company'
                    value={form.company}
                    onChange={handleChange}
                    placeholder='Company or studio'
                    disabled={saving}
                  />
                </label>
                <label className='profile-field'>
                  <span className='profile-row-label'>Bio</span>
                  <textarea
                    className='input'
                    name='bio'
                    rows={3}
                    value={form.bio}
                    onChange={handleChange}
                    placeholder='A short bio about what you build'
                    disabled={saving}
                  />
                </label>
                <div className='profile-actions'>
                  <button type='submit' className='btn btn-primary btn-sm' disabled={saving}>
                    {saving ? 'Saving...' : 'Save profile'}
                  </button>
                </div>
              </form>
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
