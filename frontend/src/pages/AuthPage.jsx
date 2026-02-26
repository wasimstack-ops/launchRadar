import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      <section className="auth-card">
        <h1>Sign in to LaunchRadar</h1>
        <p>Continue with your Google account.</p>

        <div className="google-btn-wrap" ref={buttonRef} />
        {loading ? <p>Signing you in...</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        <p className="inline-links">
          <Link to="/">Go to Public Listings</Link>
        </p>
      </section>
    </main>
  );
}

export default AuthPage;
