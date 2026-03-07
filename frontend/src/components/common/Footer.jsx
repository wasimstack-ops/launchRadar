import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, SendHorizonal } from 'lucide-react';
import api from '../../api/client';

function Footer() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubscribe = async (event) => {
    event.preventDefault();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return;

    setSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      await api.post('/api/alerts/subscribe', {
        email: normalizedEmail,
        frequency: 'weekly',
      });
      setEmail('');
      setStatus({ type: 'success', message: 'You are subscribed for weekly updates.' });
    } catch (requestError) {
      setStatus({
        type: 'error',
        message: requestError?.response?.data?.message || 'Unable to subscribe right now.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-inner footer-grid">
        <div className="footer-brand-block">
          <Link to="/" className="footer-logo">
            <span className="footer-logo-icon">
              <Boxes size={12} />
            </span>
            WAYB
          </Link>
          <p className="footer-brand-copy">
            The platform for scoring startup ideas, tracking launches, and surfacing what builders should work on next.
          </p>
        </div>

        <div className="footer-column">
          <h3 className="footer-heading">Platform</h3>
          <div className="footer-stack">
            <Link to="/" className="footer-link">Directory</Link>
            <Link to="/leaderboard" className="footer-link">Leaderboard</Link>
            <Link to="/?compose=1" className="footer-link">Submit Idea</Link>
          </div>
        </div>

        <div className="footer-column">
          <h3 className="footer-heading">Resources</h3>
          <div className="footer-stack">
            <Link to="/agents" className="footer-link">Agent Guides</Link>
            <Link to="/crypto" className="footer-link">Crypto Radar</Link>
            <Link to="/airdrops" className="footer-link">Airdrops</Link>
            <Link to="/community" className="footer-link">Community</Link>
          </div>
        </div>

        <div className="footer-column footer-subscribe-column">
          <h3 className="footer-heading">Subscribe</h3>
          <p className="footer-subscribe-copy">
            Get weekly updates on launches, rankings, and new AI opportunities.
          </p>
          <form className="footer-subscribe-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              className="footer-subscribe-input"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
              required
            />
            <button type="submit" className="footer-subscribe-btn" disabled={submitting} aria-label="Subscribe">
              <SendHorizonal size={15} />
            </button>
          </form>
          {status.message ? (
            <p className={`footer-status ${status.type === 'error' ? 'error' : 'success'}`}>
              {status.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p className="footer-copy">© {year} WAYB Inc. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/privacy-policy" className="footer-muted-link">Privacy Policy</Link>
            <Link to="/terms-of-service" className="footer-muted-link">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
