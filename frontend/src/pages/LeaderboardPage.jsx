import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Crown, Medal, Trophy } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import api from '../api/client';

function getInitials(value) {
  const text = String(value || '').trim();
  if (!text) return 'WB';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function LeaderboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState({ topThree: [], entries: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError('');

    api.get(`/api/idea-reports/leaderboard?page=${page}&limit=25`)
      .then((response) => setLeaderboard(response.data?.data || { topThree: [], entries: [], total: 0, totalPages: 1 }))
      .catch((requestError) => {
        setError(requestError?.response?.data?.message || 'Unable to load the leaderboard right now.');
      })
      .finally(() => setLoading(false));
  }, [page]);

  const featured = useMemo(() => {
    const topThree = Array.isArray(leaderboard.topThree) ? leaderboard.topThree : [];
    if (topThree.length < 3) return topThree;
    return [topThree[1], topThree[0], topThree[2]];
  }, [leaderboard.topThree]);

  return (
    <div>
      <Helmet>
        <title>Global Leaderboard | wayb</title>
        <meta
          name="description"
          content="Live global leaderboard of scored startup ideas on wayb."
        />
      </Helmet>

      <Navbar />

      <main className="leaderboard-shell">
        <div className="leaderboard-inner">
          <div className="leaderboard-topbar">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
              <ChevronLeft size={14} /> Back
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/workspace')}>
              Go to Workspace
            </button>
          </div>

          <section className="leaderboard-hero">
            <span className="leaderboard-kicker">Live idea rankings</span>
            <h1 className="leaderboard-title">Global Leaderboard</h1>
            <p className="leaderboard-subtitle">
              Rankings update whenever a new scored idea report is generated.
            </p>
            <div className="leaderboard-badges">
              <span className="leaderboard-badge leaderboard-badge-live">Live Updates</span>
              <span className="leaderboard-badge">Based on platform score and submission order</span>
            </div>
          </section>

          {loading && (
            <div className="leaderboard-loading">
              <div className="skeleton" style={{ height: 280, borderRadius: 28 }} />
              <div className="skeleton" style={{ height: 420, borderRadius: 24, marginTop: 24 }} />
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
              <section className="leaderboard-featured">
                {featured.map((entry, index) => {
                  const isCenter = entry.rank === 1;
                  const cardClass = isCenter
                    ? 'leaderboard-card leaderboard-card-center'
                    : 'leaderboard-card';
                  const Icon = entry.rank === 1 ? Crown : entry.rank === 2 ? Medal : Trophy;

                  return (
                    <article key={entry.id} className={cardClass}>
                      <div className="leaderboard-card-rank">{entry.rank}</div>
                      <div className="leaderboard-card-avatar">{getInitials(entry.title)}</div>
                      <h2 className="leaderboard-card-title">{entry.title}</h2>
                      <p className="leaderboard-card-score">{entry.investorScore} AI Score</p>
                      <div className="leaderboard-card-meta">
                        <span><Icon size={13} /> {entry.trendTier || 'Ranked Idea'}</span>
                        <span>{entry.founderName}</span>
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="leaderboard-table-panel">
                <div className="leaderboard-table-head">
                  <h2>All Ranked Ideas</h2>
                  <span>Showing {Array.isArray(leaderboard.entries) ? leaderboard.entries.length : 0} of {Number(leaderboard.total || 0).toLocaleString()} total</span>
                </div>

                <div className="leaderboard-table-wrap">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Project Name</th>
                        <th>Founder</th>
                        <th>AI Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(leaderboard.entries || []).map((entry) => (
                        <tr key={entry.id}>
                          <td>#{entry.rank}</td>
                          <td>
                            <div className="leaderboard-table-project">
                              <span className="leaderboard-table-avatar">{getInitials(entry.title)}</span>
                              <button
                                type="button"
                                className="leaderboard-link-button"
                                onClick={() => navigate(`/idea-report/${entry.id}`)}
                              >
                                {entry.title}
                              </button>
                            </div>
                          </td>
                          <td>{entry.founderName}</td>
                          <td className="leaderboard-table-score">{entry.investorScore}</td>
                          <td>
                            <span className="leaderboard-status-pill">
                              {entry.trendTier || 'Ranked'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="leaderboard-pagination">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span>Page {page} of {Math.max(1, Number(leaderboard.totalPages || 1))}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={page >= Math.max(1, Number(leaderboard.totalPages || 1))}
                    onClick={() => setPage((current) => Math.min(Math.max(1, Number(leaderboard.totalPages || 1)), current + 1))}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default LeaderboardPage;
