import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileText, Home, MessageSquare, Plus, Rocket, Send, Trophy, Workflow } from 'lucide-react';
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
  const [ideaError, setIdeaError] = useState('');
  const [ideaSubmitting, setIdeaSubmitting] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const ideaPanelRef = useRef(null);
  const [reportState, setReportState] = useState({
    items: [],
    pagination: { page: 1, total: 0, totalPages: 1 },
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    const loadInitial = async () => {
      try {
        const [userResponse, reportsResponse] = await Promise.all([
          api.get('/api/auth/me'),
          api.get('/api/idea-reports/me/list?page=1&limit=12'),
        ]);
        if (!mounted) return;
        setUser(userResponse.data?.data || null);
        setReportState(reportsResponse.data?.data || {
          items: [],
          pagination: { page: 1, total: 0, totalPages: 1 },
        });
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError?.response?.data?.message || 'Unable to load your workspace right now.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitial();

    return () => {
      mounted = false;
    };
  }, []);

  const loadReports = async (page = 1) => {
    setReportsLoading(true);
    setReportsError('');
    try {
      const response = await api.get(`/api/idea-reports/me/list?page=${page}&limit=12`);
      const nextState = response.data?.data || {
        items: [],
        pagination: { page: 1, total: 0, totalPages: 1 },
      };
      setReportState(nextState);
      const nextItems = Array.isArray(nextState.items) ? nextState.items : [];
      if (!nextItems.find((item) => String(item._id) === String(selectedReportId))) {
        setSelectedReportId(nextItems[0] ? String(nextItems[0]._id) : '');
      }
    } catch (requestError) {
      setReportsError(requestError?.response?.data?.message || 'Unable to load your saved analyses right now.');
    } finally {
      setReportsLoading(false);
    }
  };

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
  const openIdeaPanel = () => {
    ideaPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleIdeaSubmit = async (event) => {
    event.preventDefault();
    const idea = String(chatDraft || '').trim();
    if (!idea) {
      setIdeaError('Tell us what you are building before you submit.');
      return;
    }

    setIdeaSubmitting(true);
    setIdeaError('');
    try {
      const response = await api.post('/api/idea-reports', { idea });
      const reportId = response.data?.data?._id;
      if (!reportId) {
        throw new Error('Idea report was created without an id');
      }
      setChatDraft('');
      await loadReports(1);
      navigate(`/idea-report/${reportId}`);
    } catch (requestError) {
      setIdeaError(requestError?.response?.data?.message || 'We could not evaluate your idea right now.');
    } finally {
      setIdeaSubmitting(false);
    }
  };

  const downloadDealMemo = async (reportId) => {
    if (!reportId) return;
    setDownloadingId(reportId);
    try {
      const response = await api.get(`/api/idea-reports/${reportId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deal-memo-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setReportsError(requestError?.response?.data?.message || 'Unable to download this deal memo right now.');
    } finally {
      setDownloadingId('');
    }
  };

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
                <button type="button" className="workspace-sidebar-link" onClick={openIdeaPanel}>
                  <Plus size={18} /> Idea Analysis
                </button>
                <button type="button" className="workspace-sidebar-link" onClick={() => navigate('/leaderboard')}>
                  <Trophy size={18} /> Leaderboard
                </button>
                <button type="button" className="workspace-sidebar-link" onClick={() => navigate('/submit')}>
                  <Rocket size={18} /> Submit a Launch
                </button>
                <button type="button" className="workspace-sidebar-link" onClick={() => navigate('/me')}>
                  <FileText size={18} /> Profile
                </button>
              </nav>
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
                  <button type="button" className="btn btn-ghost btn-sm" onClick={openIdeaPanel}>
                    Idea analysis
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/submit')}>
                    Submit a Launch
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/leaderboard')}>
                    Leaderboard
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/me')}>
                    Profile
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
                    Review your previous analyses, sharpen your thesis, and keep every idea investor-ready.
                  </p>
                </div>
                <div className="workspace-hero-actions">
                  <button type="button" className="workspace-action-primary" onClick={openIdeaPanel}>
                    <Workflow size={16} /> Idea Analysis
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

                  <section className="workspace-panel" ref={ideaPanelRef}>
                    <div className="workspace-panel-head">
                      <h2><MessageSquare size={16} /> Idea analysis</h2>
                      <span>What are you building?</span>
                    </div>

                    <div className="workspace-chat-shell">
                      <form className="workspace-chat-composer" onSubmit={handleIdeaSubmit}>
                        <textarea
                          className="workspace-chat-input"
                          placeholder="Share your idea in one or two sentences..."
                          value={chatDraft}
                          onChange={(event) => {
                            setChatDraft(event.target.value);
                            if (ideaError) setIdeaError('');
                          }}
                        />
                        <button type="submit" className="workspace-chat-send" disabled={ideaSubmitting}>
                          {ideaSubmitting ? '...' : <Send size={16} />}
                        </button>
                      </form>
                      {ideaError ? <p className="form-error" style={{ marginTop: 10 }}>{ideaError}</p> : null}
                    </div>
                  </section>

                  <section className="workspace-panel">
                    <div className="workspace-panel-head">
                      <h2><FileText size={16} /> Your analyses</h2>
                      <span>{reportState.pagination?.total || reports.length} total</span>
                    </div>

                    {reportsError ? <p className="form-error" style={{ margin: 16 }}>{reportsError}</p> : null}
                    {reportsLoading ? (
                      <div className="workspace-loading" style={{ padding: 16 }}>
                        <div className="skeleton" style={{ height: 64, borderRadius: 16, marginBottom: 12 }} />
                        <div className="skeleton" style={{ height: 64, borderRadius: 16 }} />
                      </div>
                    ) : (
                      <div className="workspace-report-list">
                        {reports.length === 0 ? (
                          <div className="workspace-empty">
                            <p>No analyses yet.</p>
                            <button type="button" className="btn btn-primary" onClick={openIdeaPanel}>
                              Start your first analysis
                            </button>
                          </div>
                        ) : (
                          reports.map((report) => (
                            <div
                              key={report._id}
                              role="button"
                              tabIndex={0}
                              className={`workspace-report-item${String(report._id) === String(selectedReportId) ? ' active' : ''}`}
                              onClick={() => setSelectedReportId(String(report._id))}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  setSelectedReportId(String(report._id));
                                }
                              }}
                            >
                              <div className="workspace-report-main">
                                <p className="workspace-report-title">{report.title || 'Untitled idea'}</p>
                                <p className="workspace-report-meta">
                                  {formatDate(report.createdAt)} · Score {report.investorScore || '-'}
                                </p>
                              </div>
                              <div className="workspace-report-actions">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => navigate(`/idea-report/${report._id}`)}
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => downloadDealMemo(report._id)}
                                  disabled={downloadingId === report._id}
                                >
                                  {downloadingId === report._id ? 'Preparing...' : 'Download PDF'}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {reportState.pagination?.totalPages > 1 ? (
                      <div className="workspace-pagination">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={reportState.pagination.page <= 1 || reportsLoading}
                          onClick={() => loadReports(reportState.pagination.page - 1)}
                        >
                          Previous
                        </button>
                        <span className="workspace-pagination-label">
                          Page {reportState.pagination.page} of {reportState.pagination.totalPages}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={reportState.pagination.page >= reportState.pagination.totalPages || reportsLoading}
                          onClick={() => loadReports(reportState.pagination.page + 1)}
                        >
                          Next
                        </button>
                      </div>
                    ) : null}
                  </section>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default WorkspacePage;
