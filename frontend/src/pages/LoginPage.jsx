import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [adminKey, setAdminKey] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const existingKey = localStorage.getItem('adminKey');
    if (existingKey) {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const key = adminKey.trim();
    if (!key) return;

    localStorage.setItem('adminKey', key);
    navigate('/admin', { replace: true });
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Admin Access</h1>
        <p>Enter admin key to manage listings.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            id="adminKey"
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter admin key"
            required
          />
          <button type="submit">Continue</button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
