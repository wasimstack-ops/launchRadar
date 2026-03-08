import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, FileText, Home, Lock, MessageSquare, Plus, Rocket, Send, Sparkles, Trophy, Workflow, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import api from '../api/client';

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / 3600000));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function WorkspacePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [reportState, setReportState] = useState({
    items: [],
    pagination: { page: 1, total: 0, totalPages: 1 },
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    Promise.all([
      api.get('/api/auth/me'),
      api.get('/api/idea-reports/me/list?page=1&limit=12'),
    ])
      .then(([userResponse, reportsResponse]) => {
        if (!mounted) return;
        setUser(userResponse.data?.data || null);
        setReportState(reportsResponse.data?.data || {
          items: [],
          pagination: { page: 1, total: 0, totalPages: 1 },
        });
      })
      .catch((requestError) => {
        if (!mounted) return;
        setError(requestError?.response?.data?.message || 'Unable to load your workspace right now.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedReportId) return;
    const items = Array.isArray(reportState.items) ? reportState.items : [];
    if (items.length > 0) {
      setSelectedReportId(String(items[0]._id));
    }
  }, [reportState.items, selectedReportId]);

  const stats = useMemo(() => {
    const items = Array.isArray(reportState.items) ? reportState.items : [];
    const total = Number(reportState?.pagination?.total || items.length || 0);
    const topScore = items.reduce((max, item) => Math.max(max, Number(item?.investorScore || 0)), 0);
    const bestRank = items.reduce((best, item) => {
      const rank = Number(item?.globalRank || 0);
      if (!rank) return best;
      if (!best) return rank;
      return Math.min(best, rank);
    }, 0);
    const avgScore = items.length
      ? Math.round(items.reduce((sum, item) => sum + Number(item?.investorScore || 0), 0) / items.length)
      : 0;

    return {
      total,
      topScore,
      bestRank,
      avgScore,
    };
  }, [reportState]);

  const reports = Array.isArray(reportState.items) ? reportState.items : [];
  const selectedReport = reports.find((item) => String(item._id) === String(selectedReportId)) || reports[0] || null;
  const promptChips = [
    'Is this idea worth building?',
    'How can I improve this score?',
    'What MVP should I launch first?',
    'What would investors challenge?',
    'Give me a go-to-market plan',
  ];
  const plans = [
    {
      name: 'Free',
      price: '0',
      tagline: 'Start validating one idea at a time',
      cta: 'Start Free',
      features: [
        'Score one idea at a time',
        'Chat with your latest analysis',
        'Basic founder feedback',
        'Limited follow-up questions',
        'View investor score and readiness metrics',
        'Access leaderboard ranking',
        'Submit launches manually',
      ],
    },
    {
      name: 'Pro',
      price: '2,599',
      tagline: 'Sharpen every report into a real execution plan',
      cta: 'Upgrade to Pro',
      recommended: true,
      features: [
        'Unlimited report chat',
        'Improve your score with guided recommendations',
        'Compare multiple ideas and directions',
        'Deeper investor memo refinement',
        'Go-to-market and positioning help',
        'Saved conversation history per report',
        'Faster analysis and priority access',
      ],
    },
    {
      name: 'Business',
      price: 'Contact',
      tagline: 'Standardize product intelligence across your team',
      cta: 'Add Business Workspace',
      features: [
        'Shared workspace for teams',
        'Multi-user access and collaboration',
        'Team-wide product evaluation history',
        'Standardized scoring across ideas',
        'Investor memo workflows for internal reviews',
        'Launch planning across multiple products',
        'Priority support and advanced controls',
      ],
    },
  ];

  return (
    <div>
      <Helmet>
        <title>My Workspace | wayb</title>
        <meta
          name="description"
          content="Review your previous scored submissions, rankings, and report history on WAYB."
        />
      </Helmet>

      <Navbar />

      <main className="workspace-shell">
        <div className="workspace-inner">
          <div className="workspace-layout">
            <aside className="workspace-sidebar">
              <div className="workspace-sidebar-brand">
                <div className="workspace-sidebar-brand-icon">W</div>
                <div>
                  <p className="workspace-sidebar-brand-title">WAYB</p>
                  <p className="workspace-sidebar-brand-copy">Founder intelligence</p>
                </div>
              </div>

              <nav className="workspace-sidebar-nav">
                <button type="button" className="workspace-sidebar-link active">
                  <Home size={18} /> Workspace
                </button>
                <button type="button" className="workspace-sidebar-link" onClick={() => navigate('/')}>
                  <Plus size={18} /> New Analysis
                </button>
                <button type="button" className="workspace-sidebar-link" onClick={() => navigate('/leaderboard')}>
                  <Trophy size={18} /> Leaderboard
                </button>
                <button type="button" className="workspace-sidebar-link" onClick={() => navigate('/submit')}>
                  <Rocket size={18} /> Submit a Launch
                </button>
              </nav>

              <div className="workspace-sidebar-block">
                <p className="workspace-sidebar-label">Recent Models</p>
                <p className="workspace-sidebar-empty">No history yet</p>
              </div>

              <div className="workspace-pricing-card">
                <div className="workspace-pricing-head">
                  <span>Unlock Pro</span>
                  <Sparkles size={14} />
                </div>
                <p className="workspace-pricing-copy">
                  Turn every score into an execution plan with deeper founder intelligence.
                </p>
                <ul className="workspace-pricing-list">
                  <li><span className="workspace-pricing-dot" /> Unlimited report chat <Lock size={14} /></li>
                  <li><span className="workspace-pricing-dot" /> Score improvement guidance <Lock size={14} /></li>
                  <li><span className="workspace-pricing-dot" /> Investor memo refinement <Lock size={14} /></li>
                  <li><span className="workspace-pricing-dot" /> Go-to-market strategy help <Lock size={14} /></li>
                </ul>
                <button type="button" className="workspace-upgrade-button" onClick={() => setShowPlansModal(true)}>
                  Unlock Founder Pro
                </button>
              </div>
            </aside>

            <section className="workspace-main">
              <div className="workspace-topbar">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
                  <ArrowLeft size={14} /> Back
                </button>
                <div className="workspace-topbar-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
                    Home
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/submit')}>
                    <Plus size={14} /> Submit a Launch
                  </button>
                </div>
              </div>

              <section className="workspace-hero">
                <div className="workspace-hero-copy">
                  <span className="workspace-kicker">System active</span>
                  <h1 className="workspace-title">
                    {`Good ${new Date().getHours() >= 12 ? 'afternoon' : 'morning'}, ${user?.name || 'Founder'}.`}
                  </h1>
                  <p className="workspace-subtitle">
                    Revisit scored ideas, pressure-test your thesis, and turn every report into a clearer product decision.
                  </p>
                </div>
                <div className="workspace-hero-actions">
                  <button type="button" className="workspace-action-primary" onClick={() => navigate('/')}>
                    <Workflow size={16} /> New Analysis
                  </button>
                  <button type="button" className="workspace-action-secondary" onClick={() => navigate('/leaderboard')}>
                    <Trophy size={16} /> Leaderboard
                  </button>
                </div>
              </section>

              {loading && (
                <div className="workspace-loading">
                  <div className="skeleton" style={{ height: 84, borderRadius: 20 }} />
                  <div className="skeleton" style={{ height: 380, borderRadius: 24, marginTop: 18 }} />
                </div>
              )}

              {!loading && error && (
                <div className="idea-report-error">
                  <p>{error}</p>
                  <Link to="/" className="btn btn-primary">Return Home</Link>
                </div>
              )}

              {!loading && !error && (
                <>
                  <section className="workspace-stats">
                    <article className="workspace-stat-card">
                      <span className="workspace-stat-label">Total Analyses</span>
                      <strong className="workspace-stat-value">{stats.total}</strong>
                    </article>
                    <article className="workspace-stat-card">
                      <span className="workspace-stat-label">Best Score</span>
                      <strong className="workspace-stat-value">{stats.topScore || '-'}</strong>
                    </article>
                    <article className="workspace-stat-card">
                      <span className="workspace-stat-label">Average Score</span>
                      <strong className="workspace-stat-value">{stats.avgScore || '-'}</strong>
                    </article>
                    <article className="workspace-stat-card">
                      <span className="workspace-stat-label">Best Rank</span>
                      <strong className="workspace-stat-value">{stats.bestRank ? `#${stats.bestRank}` : '-'}</strong>
                    </article>
                  </section>

                  <section className="workspace-panel">
                    <div className="workspace-panel-head">
                      <h2><MessageSquare size={16} /> Intelligence Workspace</h2>
                    </div>

                    {reports.length > 0 ? (
                      <div className="workspace-chat-shell">
                        <div className="workspace-chat-stage">
                          <div className="workspace-chat-empty">
                            <h3>How can I help you?</h3>
                            <p>
                              Ask about weaknesses, investor risk, MVP scope, positioning, or launch strategy. This chat is designed to work against your latest scored analysis.
                            </p>
                          </div>

                          <form
                            className="workspace-chat-composer"
                            onSubmit={(event) => {
                              event.preventDefault();
                              setShowPlansModal(true);
                            }}
                          >
                            <textarea
                              className="workspace-chat-input"
                              placeholder={selectedReport
                                ? `Ask about ${selectedReport.title || 'this report'}...`
                                : 'Choose a saved report to start chatting...'}
                              value={chatDraft}
                              onChange={(event) => setChatDraft(event.target.value)}
                            />
                            <button
                              type="submit"
                              className="workspace-chat-send"
                              title="View chat plans"
                            >
                              <Send size={16} />
                            </button>
                          </form>

                          <div className="workspace-chat-prompts">
                            {promptChips.map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                className="workspace-chat-prompt"
                                onClick={() => setChatDraft(prompt)}
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="workspace-empty">
                        <p>No submissions yet.</p>
                        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
                          Initialize Analysis
                        </button>
                      </div>
                    )}
                  </section>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      {showPlansModal ? (
        <div className="plans-modal-backdrop" onClick={() => setShowPlansModal(false)}>
          <div className="plans-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="plans-modal-close"
              onClick={() => setShowPlansModal(false)}
              aria-label="Close plans"
            >
              <X size={18} />
            </button>

            <div className="plans-modal-head">
              <span className="plans-modal-kicker">Upgrade your plan</span>
              <h2>Choose the right plan for building with conviction.</h2>
              <p>
                Unlock report-aware chat, score improvement guidance, and deeper founder intelligence directly inside your workspace.
              </p>
            </div>

            <div className="plans-grid">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`plan-card${plan.recommended ? ' recommended' : ''}`}
                >
                  <div className="plan-card-head">
                    <div>
                      <h3>{plan.name}</h3>
                      <p>{plan.tagline}</p>
                    </div>
                    {plan.recommended ? <span className="plan-badge">Recommended</span> : null}
                  </div>

                  <div className="plan-price-row">
                    <strong>{plan.price === 'Contact' ? 'Custom' : `INR ${plan.price}`}</strong>
                    <span>{plan.price === 'Contact' ? 'Custom pricing' : '/ month'}</span>
                  </div>

                  <button
                    type="button"
                    className={`plan-cta${plan.recommended ? ' recommended' : ''}`}
                  >
                    {plan.cta}
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
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}

export default WorkspacePage;
