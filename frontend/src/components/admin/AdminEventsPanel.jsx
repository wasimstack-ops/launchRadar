import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  });
}

function fmtDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

const JOBS = [
  {
    key: 'sync',
    label: 'Sync Events',
    desc: 'Launches headless browser, scrapes CoinMarketCap, saves upcoming events to DB.',
    endpoint: '/api/admin/ops/events/sync',
    method: 'post',
    danger: false,
  },
  {
    key: 'cleanup',
    label: 'Delete Past Events',
    desc: 'Removes all events whose date has already passed. Runs automatically on each sync.',
    endpoint: '/api/admin/ops/events/cleanup',
    method: 'post',
    danger: true,
  },
];

export default function AdminEventsPanel() {
  const [stats, setStats]       = useState(null);
  const [events, setEvents]     = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filter, setFilter]     = useState('upcoming');
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [running, setRunning]   = useState({});
  const [output, setOutput]     = useState({});
  const [error, setError]       = useState('');

  const loadStats = useCallback(async () => {
    try {
      const r = await api.get('/api/admin/ops/events/stats');
      setStats(r.data?.stats || null);
    } catch { /* silent */ }
  }, []);

  const loadEvents = useCallback(async (pg, ft) => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get(`/api/admin/ops/events/list?page=${pg}&limit=20&filter=${ft}`);
      setEvents(r.data?.data?.items || []);
      setPagination(r.data?.data?.pagination || { page: pg, totalPages: 1, total: 0 });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadEvents(1, 'upcoming');
  }, [loadStats, loadEvents]);

  const runJob = async (job) => {
    setRunning((r) => ({ ...r, [job.key]: true }));
    setOutput((o) => ({ ...o, [job.key]: null }));
    try {
      const r = await api[job.method](job.endpoint);
      setOutput((o) => ({ ...o, [job.key]: { ok: true, msg: r.data?.message || 'Done', at: new Date(), data: r.data?.data } }));
      await loadStats();
      await loadEvents(page, filter);
    } catch (e) {
      setOutput((o) => ({ ...o, [job.key]: { ok: false, msg: e?.response?.data?.message || 'Failed', at: new Date() } }));
    } finally {
      setRunning((r) => ({ ...r, [job.key]: false }));
    }
  };

  const handleFilter = (ft) => {
    setFilter(ft);
    setPage(1);
    loadEvents(1, ft);
  };

  const handlePage = (p) => {
    setPage(p);
    loadEvents(p, filter);
  };

  return (
    <div>
      {/* ── Stats ── */}
      <div className="admin-section-head" style={{ marginBottom: 16 }}>
        <h2 className="admin-section-title" style={{ margin: 0 }}>Crypto Events</h2>
        <button type="button" className="admin-btn ghost" onClick={() => { loadStats(); loadEvents(page, filter); }}>
          Refresh
        </button>
      </div>

      <div className="admin-stats-grid" style={{ marginBottom: 28 }}>
        <div className="admin-stat-card">
          <p className="admin-stat-title">Upcoming Total</p>
          <p className="admin-stat-value">{stats ? stats.total : '—'}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-title">Today</p>
          <p className="admin-stat-value">{stats ? stats.today : '—'}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-title">This Week</p>
          <p className="admin-stat-value">{stats ? stats.thisWeek : '—'}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-title">Hot Events</p>
          <p className="admin-stat-value">{stats ? stats.hot : '—'}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-title">Last Synced</p>
          <p className="admin-stat-value" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            {stats?.lastSynced ? fmt(stats.lastSynced) : 'Never'}
          </p>
        </div>
      </div>

      {/* ── Jobs ── */}
      <h3 className="admin-section-title">Jobs</h3>
      <div className="admin-job-grid" style={{ marginBottom: 32 }}>
        {JOBS.map((job) => {
          const isRunning = running[job.key];
          const result    = output[job.key];
          return (
            <div key={job.key} className="admin-job-card">
              <p className="admin-job-label">{job.label}</p>
              <p className="admin-job-meta" style={{ marginBottom: 12 }}>{job.desc}</p>

              {result && (
                <div
                  className={`admin-alert${result.ok ? '' : ' error'}`}
                  style={{ marginBottom: 10, fontSize: '0.78rem' }}
                >
                  {result.ok ? '✓ ' : '✗ '}{result.msg}
                  {result.data && (
                    <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>
                      fetched={result.data.fetched ?? '—'} deleted={result.data.deleted ?? result.data.deletedCount ?? '—'}
                    </span>
                  )}
                  <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>
                    {new Date(result.at).toLocaleTimeString()}
                  </span>
                </div>
              )}

              <button
                type="button"
                className={`admin-btn${job.danger ? '' : ' primary'}`}
                style={job.danger ? { borderColor: 'var(--red)', color: 'var(--red)' } : {}}
                disabled={isRunning}
                onClick={() => runJob(job)}
              >
                {isRunning ? 'Running…' : job.label}
              </button>

              {job.key === 'sync' && (
                <p className="admin-job-meta" style={{ marginTop: 8 }}>
                  Auto-runs every <strong>6 hours</strong> via cron.
                </p>
              )}
            </div>
          );
        })}

        {/* Cron info card */}
        <div className="admin-job-card">
          <p className="admin-job-label">Cron Schedule</p>
          <p className="admin-job-meta">Sync runs automatically every <strong>6 hours</strong> (UTC midnight, 06:00, 12:00, 18:00). Past events are deleted on every sync cycle.</p>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['00:00 UTC', '06:00 UTC', '12:00 UTC', '18:00 UTC'].map((t) => (
              <div key={t} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.78rem', color: 'var(--text-2)',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--green)', flexShrink: 0,
                }} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Events table ── */}
      <div className="admin-section-head" style={{ marginBottom: 12 }}>
        <h3 className="admin-section-title" style={{ margin: 0 }}>Events ({pagination.total})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {['upcoming', 'past'].map((f) => (
            <button
              key={f}
              type="button"
              className={`admin-btn${filter === f ? ' primary' : ' ghost'}`}
              style={{ textTransform: 'capitalize', padding: '5px 12px' }}
              onClick={() => handleFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="admin-alert error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date (UTC)</th>
              <th>Coin</th>
              <th>Title</th>
              <th>Categories</th>
              <th>Votes</th>
              <th>Hot</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-2)', padding: 24 }}>Loading…</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-2)', padding: 24 }}>No events found.</td></tr>
            ) : events.map((ev) => (
              <tr key={ev._id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{fmtDate(ev.dateEvent)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ev.coins?.[0]?.icon && (
                      <img
                        src={ev.coins[0].icon}
                        alt=""
                        style={{ width: 20, height: 20, borderRadius: '50%' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {ev.coins?.[0]?.fullname || '—'}
                    </span>
                    {ev.coins?.length > 1 && (
                      <span className="muted">+{ev.coins.length - 1}</span>
                    )}
                  </div>
                </td>
                <td style={{ fontWeight: 600, fontSize: '0.84rem', maxWidth: 240 }}>{ev.title}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {ev.categories?.map((c) => (
                      <span key={c.categoryId} style={{
                        fontSize: '0.7rem', padding: '2px 7px',
                        borderRadius: 6, border: '1px solid var(--border-md)',
                        color: 'var(--text-2)', background: 'var(--surface-2)',
                      }}>
                        {c.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{ev.voteCount || 0}</td>
                <td style={{ textAlign: 'center' }}>
                  {ev.isHot ? <span style={{ color: '#f97316' }}>🔥</span> : <span className="muted">—</span>}
                </td>
                <td>
                  {ev.proof ? (
                    <a
                      href={ev.proof}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.78rem', color: 'var(--accent)' }}
                    >
                      View ↗
                    </a>
                  ) : <span className="muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="admin-pagination" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="admin-btn ghost"
            disabled={page <= 1}
            onClick={() => handlePage(page - 1)}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
            Page {page} of {pagination.totalPages} &nbsp;·&nbsp; {pagination.total} events
          </span>
          <button
            type="button"
            className="admin-btn ghost"
            disabled={page >= pagination.totalPages}
            onClick={() => handlePage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
