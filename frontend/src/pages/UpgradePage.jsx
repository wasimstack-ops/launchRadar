import { useState } from 'react';
import { Check } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import api from '../api/client';

const PLANS = [
  {
    name: 'Free',
    price: '0',
    tagline: 'Validate one idea at a time',
    cta: 'Current plan',
    features: [
      'Score one idea at a time',
      'Access the global leaderboard',
      'Basic founder feedback',
      'Submit launches manually',
    ],
  },
  {
    name: 'Pro',
    price: '2,599',
    tagline: 'Investor-ready analysis and execution guidance',
    cta: 'Upgrade to Pro',
    recommended: true,
    features: [
      'Unlimited idea analyses',
      'Deal memo export (PDF)',
      'Score improvement guidance',
      'Go-to-market and positioning help',
      'Priority access to new features',
    ],
  },
  {
    name: 'Business',
    price: 'Custom',
    tagline: 'Enterprise founder intelligence for teams',
    cta: 'Talk to sales',
    features: [
      'Shared workspace for teams',
      'Multi-user access and collaboration',
      'Team-wide evaluation history',
      'Investor memo workflows',
      'Priority support and controls',
    ],
  },
];

function UpgradePage() {
  const [loadingPlan, setLoadingPlan] = useState('');
  const [error, setError] = useState('');

  const handleCheckout = async (plan) => {
    if (plan !== 'pro') return;
    setLoadingPlan(plan);
    setError('');
    try {
      const response = await api.post('/api/billing/checkout', { plan });
      const url = response.data?.data?.url;
      if (!url) {
        throw new Error('Stripe checkout URL not returned.');
      }
      window.location.href = url;
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to start checkout.');
    } finally {
      setLoadingPlan('');
    }
  };

  return (
    <div>
      <Helmet>
        <title>Upgrade to Pro | wayb</title>
        <meta name="description" content="Upgrade to Pro for unlimited idea analyses, deal memo exports, and founder intelligence." />
      </Helmet>

      <Navbar />

      <main className="upgrade-shell">
        <div className="upgrade-inner">
          <div className="upgrade-head">
            <span className="upgrade-kicker">Plans</span>
            <h1>Upgrade your founder workflow</h1>
            <p>Choose the plan that matches how serious you are about building, fundraising, and shipping.</p>
          </div>

          {error ? <p className="form-error" style={{ textAlign: 'center', marginBottom: 16 }}>{error}</p> : null}

          <div className="plans-grid">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`plan-card${plan.recommended ? ' recommended' : ''}`}
              >
                <div className="plan-card-body">
                  <div className="plan-card-head">
                    <div>
                      <h3>{plan.name}</h3>
                      <p>{plan.tagline}</p>
                    </div>
                    {plan.recommended ? <span className="plan-badge">Recommended</span> : null}
                  </div>

                  <div className="plan-price-row">
                    <strong>{plan.price === 'Custom' ? 'Custom' : `INR ${plan.price}`}</strong>
                    <span>{plan.price === 'Custom' ? 'Pricing' : '/ month'}</span>
                  </div>

                  <button
                    type="button"
                    className={`plan-cta${plan.recommended ? ' recommended' : ''}`}
                    onClick={() => handleCheckout(plan.name.toLowerCase())}
                    disabled={loadingPlan === plan.name.toLowerCase() || plan.name.toLowerCase() !== 'pro'}
                  >
                    {loadingPlan === plan.name.toLowerCase() ? 'Redirecting...' : plan.cta}
                  </button>

                  <div className="plan-divider" />

                  <ul className="plan-feature-list">
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <Check size={15} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default UpgradePage;
