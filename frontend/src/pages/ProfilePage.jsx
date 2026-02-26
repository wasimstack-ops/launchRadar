import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('/api/auth/me');
        setUser(response.data?.data || null);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Failed to load profile');
      }
    };

    loadProfile();
  }, []);

  const logout = () => {
    localStorage.removeItem('userToken');
    navigate('/auth', { replace: true });
  };

  return (
    <main className="profile-wrap">
      <header className="profile-header">
        <h1>Your Account</h1>
        <button onClick={logout} type="button">Logout</button>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      {user ? (
        <section className="profile-card">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Member since:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
        </section>
      ) : (
        <p>Loading profile...</p>
      )}

      <p className="inline-links">
        <Link to="/">Public Listings</Link>
      </p>
    </main>
  );
}

export default ProfilePage;
