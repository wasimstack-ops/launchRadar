import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart2, ChevronRight, FileText, Globe2, Sparkles, Trophy } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import api from '../api/client';

const BREAKDOWN_LABELS = {
  marketFit: 'Market Fit',
  problemUrgency: 'Problem Urgency',
  distributionPotential: 'Distribution Potential',
  technicalFeasibility: 'Technical Feasibility',
  monetizationClarity: 'Monetization Clarity',
  defensibility: 'Defensibility',
  founderAdvantage: 'Founder Advantage',
  timing: 'Timing',
};

const BREAKDOWN_MAX = {
  marketFit: 20,
  problemUrgency: 15,
  distributionPotential: 15,
  technicalFeasibility: 10,
  monetizationClarity: 10,
  defensibility: 10,
  founderAdvantage: 10,
  timing: 10,
};

const SCORE_CIRCUMFERENCE = 251.33; // 2 * π * 40

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / 3600000));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function IdeaReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const totalBuilders = Math.max(1, Number(report?.totalBuilders || 0));

  useEffect(() => {
    setLoading(true);
    setError('');

    api.get(`/api/idea-reports/${id}`)
      .then((response) => setReport(response.data?.data || null))
      .catch((requestError) => {
        setError(requestError?.response?.data?.message || 'Unable to load your idea report.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div>
      <Helmet>
        <title>{report?.title ? `${report.title} | wayb` : 'Idea Report | wayb'}</title>
        <meta name="description" content="Investor readiness score, deal memo, and AI Recommendations for your idea." />
      </Helmet>

      <Navbar />

      <main className="idea-report-shell">
        <div className="idea-report-inner">
          <div className="idea-report-topbar">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
              <ArrowLeft size={14} /> Go Back to Dashboard
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/leaderboard')}>
              View Leaderboard <ChevronRight size={14} />
            </button>
          </div>

          {loading && (
            <div className="idea-report-loading">
              <div className="skeleton" style={{ height: 180, borderRadius: 24 }} />
              <div className="skeleton" style={{ height: 420, borderRadius: 24, marginTop: 18 }} />
            </div>
          )}

          {!loading && error && (
            <div className="idea-report-error">
              <p>{error}</p>
              <Link to="/" className="btn btn-primary">Return Home</Link>
            </div>
          )}

          {!loading && report && (
            <>
              <section className="idea-report-hero">
                <div className="idea-report-hero-main">
                  <span className="idea-report-kicker">Active Evaluation</span>
                  <h1 className="idea-report-title">{report.title}</h1>
                  <p className="idea-report-subtitle">{report.subtitle || 'Project Deal Memo & Investor Readiness Report'}</p>
                  <p className="idea-report-summary">{report.executiveSummary}</p>
                </div>

                <div className="idea-score-card">
                  <div className="idea-score-ring">
                    <svg viewBox="0 0 100 100" className="idea-score-svg" aria-hidden="true">
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#635bff" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                      </defs>
                      <circle cx="50" cy="50" r="40" className="idea-score-track" />
                      <circle
                        cx="50" cy="50" r="40"
                        className="idea-score-fill"
                        style={{ strokeDashoffset: (SCORE_CIRCUMFERENCE * (1 - report.investorScore / 100)).toFixed(2) }}
                      />
                    </svg>
                    <div className="idea-score-center">
                      <span className="idea-score-value">{report.investorScore}</span>
                      <span className="idea-score-denom">/ 100</span>
                    </div>
                  </div>
                  <div className="idea-score-copy">
                    <p className="idea-score-label">Platform Score</p>
                    <p className="idea-score-delta">
                      {report.scoreDelta >= 0 ? '+' : ''}{report.scoreDelta}% from baseline
                    </p>
                    <div className="idea-score-bar">
                      <span style={{ width: `${report.investorScore}%` }} />
                    </div>
                  </div>
                </div>
              </section>

              <div className="idea-report-grid">
                <section className="idea-report-main">
                  <div className="idea-report-panel">
                    <div className="idea-panel-head">
                      <h2 className="idea-panel-title"><FileText size={16} /> AI Analysis</h2>
                      <span className="idea-panel-meta">Generated {formatRelativeTime(report.createdAt)}</span>
                    </div>
                    <div className="idea-memo-sections">
                      {(report.memoSections || []).map((section) => (
                        <article key={section.title} className="idea-memo-section">
                          <h3>{section.title}</h3>
                          <p>{section.body}</p>
                        </article>
                      ))}
                    </div>
                  </div>

                  {report.breakdown && (
                    <div className="idea-report-panel compact">
                      <div className="idea-panel-head" style={{ margin: '-22px -22px 20px', padding: '16px 22px' }}>
                        <h2 className="idea-panel-title"><BarChart2 size={16} /> Platform Score Breakdown</h2>
                        <span className="idea-panel-meta">8 dimensions · 100 pts total</span>
                      </div>
                      <div className="idea-breakdown-list">
                        {Object.entries(BREAKDOWN_LABELS).map(([key, label]) => {
                          const value = Number(report.breakdown[key] || 0);
                          const max = BREAKDOWN_MAX[key];
                          const pct = Math.round((value / max) * 100);
                          return (
                            <div key={key} className="idea-breakdown-item">
                              <div className="idea-breakdown-row">
                                <span className="idea-breakdown-label">{label}</span>
                                <span className="idea-breakdown-score">{value}<span className="idea-breakdown-max"> / {max}</span></span>
                              </div>
                              <div className="idea-metric-bar">
                                <span style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="idea-report-panel">
                    <div className="idea-panel-head">
                      <h2 className="idea-panel-title"><Sparkles size={16} /> AI Recommendations</h2>
                    </div>
                    <div className="idea-playbook-grid">
                      {(report.playbook || []).map((item) => (
                        <article key={item.title} className="idea-playbook-card">
                          <div className="idea-playbook-icon"><Sparkles size={14} /></div>
                          <h3>{item.title}</h3>
                          <p>{item.body}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>

                <aside className="idea-report-side">
                  <div className="idea-rank-card">
                    <div className="idea-rank-head">
                      <h2>Leaderboard Rank</h2>
                      <Trophy size={15} />
                    </div>
                    <div className="idea-rank-value">#{report.globalRank}</div>
                    <p className="idea-rank-sub">Out of {totalBuilders.toLocaleString()} builders</p>
                    <div className="idea-rank-progress-card">
                      <div className="idea-rank-progress-meta">
                        <span>Progress to Top 5</span>
                        <span>{report.pointsToTopFive} pts needed</span>
                      </div>
                      <div className="idea-rank-progress-bar">
                        <span style={{ width: `${report.pointsToTopFive === 0 ? 100 : Math.max(8, Math.min(92, 100 - report.pointsToTopFive))}%` }} />
                      </div>
                    </div>
                    <button type="button" className="idea-rank-button" onClick={() => navigate('/leaderboard')}>
                      View Leaderboard <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="idea-report-panel compact">
                    <div className="idea-panel-head">
                      <h2 className="idea-panel-title">Readiness Metrics</h2>
                    </div>
                    <div className="idea-metric-list">
                      {(report.readinessMetrics || []).map((metric) => (
                        <div key={metric.label} className="idea-metric-item">
                          <div className="idea-metric-row">
                            <span>{metric.label}</span>
                            <span>{metric.value}%</span>
                          </div>
                          <div className="idea-metric-bar">
                            <span style={{ width: `${metric.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="idea-tier-row">
                      <div className="idea-tier-icon"><Sparkles size={14} /></div>
                      <div>
                        <p className="idea-tier-title">Trending Tier</p>
                        <p className="idea-tier-copy">{report.trendTier}</p>
                      </div>
                    </div>
                  </div>

                  <div className="idea-report-panel compact region">
                    <div className="idea-region-kicker"><Globe2 size={14} /> {report.regionalFocus}</div>
                    <p className="idea-region-copy">{report.regionalNote}</p>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default IdeaReportPage;

