import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import api from '../api/client';

function AuthPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      setError('Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in frontend .env');
      return;
    }

    let cancelled = false;

    const handleCredential = async (response) => {
      if (cancelled) return;

      setError('');
      setLoading(true);

      try {
        const apiResponse = await api.post('/api/auth/google', {
          idToken: response.credential,
        });

        const token = apiResponse.data?.data?.token;
        if (token) {
          localStorage.setItem('userToken', token);
          navigate('/', { replace: true });
        }
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    };

    const initGoogle = () => {
      if (!window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredential,
      });

      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 320,
      });
    };

    if (window.google) {
      initGoogle();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    script.onerror = () => setError('Unable to load Google sign-in script');
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="auth-shell">
      <div className="auth-bg-orb-1" />
      <div className="auth-bg-orb-2" />

      <section className="auth-card">
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
          <span className="auth-logo-icon">
            <Zap size={14} />
          </span>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>LaunchRadar</span>
        </Link>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to track launches, save favorites, and submit products.</p>

        {/* Google button */}
        <div className="google-btn-wrap" ref={buttonRef} />

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: '0.875rem', marginTop: 10 }}>
            Signing you in…
          </p>
        )}
        {error && <p className="form-error" style={{ marginTop: 10 }}>{error}</p>}

        <Link to="/" className="auth-back">
          <ArrowLeft size={14} /> Back to products
        </Link>
      </section>
    </main>
  );
}

export default AuthPage;
