import { useEffect, useState } from 'react';
import { Award, BarChart3, FileText, Lock, Mail, X } from 'lucide-react';
import api from '../../api/client';

function getAuthErrorMessage(requestError, fallback) {
  if (requestError?.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  return (
    requestError?.response?.data?.message ||
    requestError?.message ||
    fallback
  );
}

function AuthPromptModal({ open, onClose, onSuccess, onGoogleContinue }) {
  const [step, setStep] = useState('promo');
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('promo');
      setMode('register');
      setForm({ name: '', email: '', password: '' });
      setError('');
      setLoading(false);
    }
  }, [open]);

  const openAuth = (nextMode) => {
    setMode(nextMode);
    setStep('auth');
    setError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedName = String(form.name || '').trim();
    const trimmedEmail = String(form.email || '').trim();

    if (mode === 'register' && trimmedName.length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (String(form.password || '').length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const payload =
        mode === 'register'
          ? {
              name: trimmedName,
              email: trimmedEmail,
              password: form.password,
            }
          : {
              email: trimmedEmail,
              password: form.password,
            };

      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const apiResponse = await api.post(endpoint, payload, { timeout: 20000 });
      const token = apiResponse.data?.data?.token;
      if (!token) {
        throw new Error('Authentication succeeded but no token was returned.');
      }

      localStorage.setItem('userToken', token);
      window.dispatchEvent(new Event('auth-changed'));
      await Promise.resolve(onSuccess?.());
    } catch (requestError) {
      console.error('Auth modal submit failed', requestError);
      setError(getAuthErrorMessage(requestError, 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="auth-prompt-backdrop" role="presentation" onClick={onClose}>
      <div
        className="auth-prompt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="auth-prompt-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        {step === 'promo' ? (
          <>
            <div className="auth-prompt-icon">
              <Award size={22} />
            </div>
            <h2 id="auth-prompt-title" className="auth-prompt-title">
              Get your leaderboard ranking and a free deal memo and AI playbook - please sign up.
            </h2>
            <p className="auth-prompt-copy">
              Join 12,000+ builders and investors receiving weekly alpha on the next generation of AI and crypto.
            </p>

            <div className="auth-prompt-actions">
              <button type="button" className="auth-prompt-btn auth-prompt-btn-primary" onClick={() => openAuth('register')}>
                Sign Up
              </button>
              <button type="button" className="auth-prompt-btn auth-prompt-btn-secondary" onClick={() => openAuth('login')}>
                Log In
              </button>
            </div>

            <p className="auth-prompt-footnote">Limited time offer for new members</p>
          </>
        ) : (
          <>
            <h2 id="auth-prompt-title" className="auth-form-title">
              Welcome to WAYB
            </h2>
            <p className="auth-form-subtitle">Get your AI Deal Memo &amp; Leaderboard Rank</p>

            <div className="auth-google-shell">
              <button
                type="button"
                className="auth-google-direct-btn"
                onClick={onGoogleContinue}
              >
                Continue with Google
              </button>
            </div>

            <div className="auth-divider-line">
              <span>{mode === 'register' ? 'or sign up with email' : 'or use email'}</span>
            </div>

            <form className="auth-modal-form" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <label className="auth-modal-field">
                  <span className="auth-modal-label">Full name</span>
                  <div className="auth-modal-input-wrap">
                    <FileText size={15} className="auth-modal-input-icon" />
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="auth-modal-input"
                      placeholder="Your full name"
                      required
                      disabled={loading}
                    />
                  </div>
                </label>
              )}

              <label className="auth-modal-field">
                <span className="auth-modal-label">Email address</span>
                <div className="auth-modal-input-wrap">
                  <Mail size={15} className="auth-modal-input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="auth-modal-input"
                    placeholder="name@company.com"
                    required
                    disabled={loading}
                  />
                </div>
              </label>

              <label className="auth-modal-field">
                <span className="auth-modal-label-row">
                  <span className="auth-modal-label">Password</span>
                  {mode === 'login' && <span className="auth-modal-hint">Forgot?</span>}
                </span>
                <div className="auth-modal-input-wrap">
                  <Lock size={15} className="auth-modal-input-icon" />
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="auth-modal-input"
                    placeholder="••••••••••"
                    required
                    disabled={loading}
                  />
                </div>
              </label>

              {error && <p className="form-error auth-modal-error">{error}</p>}

              <button type="submit" className="auth-modal-submit" disabled={loading}>
                {loading ? 'Please wait...' : 'Continue'}
              </button>
            </form>

            <div className="auth-modal-footer">
              <span>{mode === 'register' ? 'Already have an account?' : "Don't have an account?"}</span>
              <button
                type="button"
                className="auth-modal-switch"
                onClick={() => {
                  setMode((current) => (current === 'register' ? 'login' : 'register'));
                  setError('');
                }}
              >
                {mode === 'register' ? 'Log in' : 'Sign up for free'}
              </button>
            </div>

            <div className="auth-modal-feature-row">
              <div className="auth-modal-feature">
                <FileText size={15} />
                <span>AI Deal Memos</span>
              </div>
              <div className="auth-modal-feature">
                <BarChart3 size={15} />
                <span>Global Ranking</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AuthPromptModal;
