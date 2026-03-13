import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';

const JOBS = [
  {
    key: 'crypto',
    label: 'Sync Crypto Top 50',
    method: 'post',
    endpoint: '/api/admin/ops/crypto/sync',
    legacyEndpoint: null,
  },
  {
    key: 'news',
    label: 'Sync AI News',
    method: 'post',
    endpoint: '/api/admin/ops/news/sync',
    legacyMethod: 'post',
    legacyEndpoint: '/api/admin/news/fetch',
  },
  {
    key: 'phTopics',
    label: 'Sync PH Topics',
    method: 'post',
    endpoint: '/api/admin/ops/producthunt/topics-sync',
    legacyMethod: 'get',
    legacyEndpoint: '/api/admin/automation/producthunt-topics-test',
  },
  {
    key: 'phProducts',
    label: 'Sync PH Products',
    method: 'post',
    endpoint: '/api/admin/ops/producthunt/products-sync',
    legacyMethod: 'get',
    legacyEndpoint: '/api/admin/automation/producthunt-products-all-topics-test',
  },
  {
    key: 'phProductsTopic',
    label: 'Sync PH One Topic (AI)',
    method: 'post',
    endpoint: '/api/admin/ops/producthunt/products-topic-sync',
    payload: { topic: 'artificial-intelligence' },
    legacyMethod: 'get',
    legacyEndpoint: '/api/admin/automation/producthunt-products-by-topic-test?topic=artificial-intelligence',
  },
  {
    key: 'phTop',
    label: 'Sync PH Top Snapshot',
    method: 'post',
    endpoint: '/api/admin/ops/producthunt/top-sync',
    legacyMethod: 'get',
    legacyEndpoint: '/api/admin/automation/producthunt-top-products-sync',
  },
  {
    key: 'phTrending',
    label: 'Sync PH Trending',
    method: 'post',
    endpoint: '/api/admin/ops/producthunt/trending-sync',
    legacyMethod: 'get',
    legacyEndpoint: '/api/admin/automation/producthunt-trending-sync',
  },
  {
    key: 'phRefresh',
    label: 'Refresh PH Products',
    method: 'post',
    endpoint: '/api/admin/ops/producthunt/products-refresh',
    legacyMethod: 'get',
    legacyEndpoint: '/api/admin/automation/producthunt-products-weekly-refresh',
  },
  {
    key: 'phCleanup',
    label: 'Cleanup PH Low Votes',
    method: 'post',
    endpoint: '/api/admin/ops/producthunt/products-cleanup',
    legacyMethod: 'get',
    legacyEndpoint: '/api/admin/automation/producthunt-products-weekly-cleanup?count=40',
  },
  {
    key: 'github',
    label: 'Sync GitHub AI',
    method: 'post',
    endpoint: '/api/admin/ops/github/sync',
    legacyMethod: 'get',
    legacyEndpoint: '/api/admin/automation/github-test',
  },
  {
    key: 'agents',
    label: 'Sync Agents',
    method: 'post',
    endpoint: '/api/admin/ops/agents/sync',
    legacyMethod: 'post',
    legacyEndpoint: '/api/admin/agents/fetch',
  },
  {
    key: 'rss',
    label: 'Sync RSS Feeds',
    method: 'post',
    endpoint: '/api/admin/ops/rss/sync',
    legacyMethod: 'get',
    legacyEndpoint: '/api/admin/automation/rss-test',
  },
  {
    key: 'airdrops',
    label: 'Sync Airdrops External',
    method: 'post',
    endpoint: '/api/admin/ops/airdrops/external-sync',
    legacyMethod: 'post',
    legacyEndpoint: '/api/admin/airdrops/external/fetch?force=true',
  },
];

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== 'object') return '-';
  const pairs = Object.entries(payload).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value));
  if (pairs.length === 0) return 'Completed';
  return pairs
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');
}

function toCount(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getResultData(result, fallback = null) {
  if (!result || result.status !== 'fulfilled') return fallback;
  return result.value?.data || fallback;
}

async function runApiCall(method, endpoint, payload = {}) {
  if (method === 'get') {
    return api.get(endpoint);
  }
  return api.post(endpoint, payload);
}

function statCard(title, value) {
  return (
    <div key={title} className="admin-stat-card">
      <p className="admin-stat-title">{title}</p>
      <p className="admin-stat-value">{value}</p>
    </div>
  );
}

function AdminOperationsPanel({ refreshSignal = 0 }) {
  const [overview, setOverview] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [running, setRunning] = useState({});
  const [jobOutput, setJobOutput] = useState({});
  const [compatibilityMode, setCompatibilityMode] = useState(false);
  const [notice, setNotice] = useState('');

  const loadCompatibilityOverview = async () => {
    const [
      listingsRes,
      pendingRes,
      approvedRes,
      rejectedRes,
      newsRes,
      cryptoRes,
      alertsRes,
      topicsRes,
      topRes,
      trendingRes,
      airdropsRes,
      logsRes,
      logsSummaryRes,
    ] = await Promise.allSettled([
      api.get('/api/listings'),
      api.get('/api/admin/submissions?status=pending'),
      api.get('/api/admin/submissions?status=approved'),
      api.get('/api/admin/submissions?status=rejected'),
      api.get('/api/news?limit=1&page=1'),
      api.get('/api/crypto/top?limit=1&page=1'),
      api.get('/api/admin/alerts/subscriptions?page=1&limit=1&active=true'),
      api.get('/api/producthunt/topics'),
      api.get('/api/producthunt/top-today?limit=1&page=1'),
      api.get('/api/producthunt/trending?limit=1'),
      api.get('/api/airdrops'),
      api.get('/api/admin/analytics/fetch-logs?page=1&limit=8'),
      api.get('/api/admin/analytics/fetch-logs/summary?days=7'),
    ]);

    const listings = getResultData(listingsRes, {});
    const pending = getResultData(pendingRes, {});
    const approved = getResultData(approvedRes, {});
    const rejected = getResultData(rejectedRes, {});
    const news = getResultData(newsRes, {});
    const crypto = getResultData(cryptoRes, {});
    const alerts = getResultData(alertsRes, {});
    const topics = getResultData(topicsRes, {});
    const top = getResultData(topRes, {});
    const trending = getResultData(trendingRes, {});
    const airdrops = getResultData(airdropsRes, {});
    const logs = getResultData(logsRes, {});
    const logsSummary = getResultData(logsSummaryRes, {});

    const listingRows = Array.isArray(listings?.data) ? listings.data : [];
    const pendingRows = Array.isArray(pending?.data) ? pending.data : [];
    const approvedRows = Array.isArray(approved?.data) ? approved.data : [];
    const rejectedRows = Array.isArray(rejected?.data) ? rejected.data : [];
    const newsRows = Array.isArray(news?.data) ? news.data : [];
    const cryptoRows = Array.isArray(crypto?.data) ? crypto.data : [];
    const topicRows = Array.isArray(topics?.data) ? topics.data : [];
    const trendingRows = Array.isArray(trending?.data) ? trending.data : [];
    const airdropRows = Array.isArray(airdrops?.data) ? airdrops.data : [];
    const logRows = Array.isArray(logs?.data) ? logs.data : [];

    const topTotal =
      toCount(top?.data?.total, null) ??
      toCount(top?.total, null) ??
      (Array.isArray(top?.data?.data) ? top.data.data.length : 0);

    const summaryOverall = logsSummary?.data?.overall || logsSummary?.overall || {};

    setOverview({
      counts: {
        listings: listingRows.length,
        users: '-',
        leads: '-',
        news: toCount(news?.pagination?.total, newsRows.length),
        cryptoCoins: toCount(crypto?.pagination?.total, cryptoRows.length),
        activeAlerts: toCount(alerts?.pagination?.total, 0),
        productHuntTopics: topicRows.length,
        productHuntProducts: '-',
        topProductSnapshots: topTotal,
        trendingProducts: trendingRows.length,
        airdrops: airdropRows.length,
      },
      submissions: {
        pending: pendingRows.length,
        approved: approvedRows.length,
        rejected: rejectedRows.length,
        total: pendingRows.length + approvedRows.length + rejectedRows.length,
      },
      fetchLogsLast7d: {
        success: toCount(summaryOverall.successRuns, 0),
        partial: toCount(summaryOverall.partialRuns, 0),
        error: toCount(summaryOverall.errorRuns, 0),
        total: toCount(summaryOverall.totalRuns, 0),
      },
      freshness: {
        latestNews: newsRows[0]
          ? {
              title: newsRows[0].title,
              source: newsRows[0].source,
              publishedAt: newsRows[0].publishedAt,
            }
          : null,
        latestCrypto: cryptoRows[0]
          ? {
              name: cryptoRows[0].name,
              symbol: cryptoRows[0].symbol,
              lastUpdated: cryptoRows[0].lastUpdated,
            }
          : null,
        latestFetchLog: logRows[0] || null,
      },
    });

    setRecentLogs(logRows);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const [overviewRes, logsRes] = await Promise.all([
        api.get('/api/admin/ops/overview'),
        api.get('/api/admin/ops/fetch-logs/recent?limit=8'),
      ]);

      setCompatibilityMode(false);
      setOverview(overviewRes.data?.data || null);
      setRecentLogs(Array.isArray(logsRes.data?.data) ? logsRes.data.data : []);
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404) {
        setCompatibilityMode(true);
        setNotice(
          'Using compatibility mode. Restart backend to enable the new /api/admin/ops routes and full metrics.'
        );

        try {
          await loadCompatibilityOverview();
        } catch (compatError) {
          setError(compatError?.response?.data?.message || 'Failed to load compatibility data');
        }
      } else {
        setError(requestError?.response?.data?.message || 'Failed to load operations data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshSignal]);

  const onRunJob = async (job) => {
    setRunning((prev) => ({ ...prev, [job.key]: true }));
    setError('');

    try {
      let response;

      try {
        response = await runApiCall(job.method, job.endpoint, job.payload || {});
      } catch (primaryError) {
        if (primaryError?.response?.status === 404 && job.legacyEndpoint) {
          setCompatibilityMode(true);
          setNotice(
            'Using compatibility mode. Restart backend to enable the new /api/admin/ops routes and full metrics.'
          );
          response = await runApiCall(job.legacyMethod || 'get', job.legacyEndpoint, job.payload || {});
        } else {
          throw primaryError;
        }
      }

      const data = response.data?.data || {};
      setJobOutput((prev) => ({
        ...prev,
        [job.key]: {
          at: new Date().toISOString(),
          summary: summarizePayload(data),
        },
      }));
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || `Failed to run job: ${job.label}`);
    } finally {
      setRunning((prev) => ({ ...prev, [job.key]: false }));
    }
  };

  const statCards = useMemo(() => {
    if (!overview) return [];
    return [
      ['Listings', overview.counts?.listings ?? 0],
      ['Users', overview.counts?.users ?? 0],
      ['Leads', overview.counts?.leads ?? 0],
      ['News', overview.counts?.news ?? 0],
      ['Crypto Coins', overview.counts?.cryptoCoins ?? 0],
      ['Active Alerts', overview.counts?.activeAlerts ?? 0],
      ['PH Topics', overview.counts?.productHuntTopics ?? 0],
      ['PH Products', overview.counts?.productHuntProducts ?? 0],
      ['PH Top Snapshots', overview.counts?.topProductSnapshots ?? 0],
      ['PH Trending', overview.counts?.trendingProducts ?? 0],
      ['Airdrops', overview.counts?.airdrops ?? 0],
      ['Pending Submissions', overview.submissions?.pending ?? 0],
      ['Fetch Logs (7d)', overview.fetchLogsLast7d?.total ?? 0],
    ];
  }, [overview]);

  return (
    <section>
      <div className="admin-section-head">
        <div>
          <h2 className="admin-section-title">Operations Center</h2>
          <p className="admin-section-subtitle">
            Monitor ingestion pipelines, run manual sync jobs, and check recent fetch activity.
          </p>
        </div>
        <button type="button" className="admin-btn" onClick={loadData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {notice ? <div className="admin-alert warn">{notice}</div> : null}

      {error ? <div className="admin-alert error">{error}</div> : null}

      <div className="admin-stats-grid">
        {statCards.map(([title, value]) => statCard(title, value))}
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h3 className="admin-section-title" style={{ marginBottom: 4 }}>Manual Sync Jobs</h3>
        <p className="admin-section-subtitle" style={{ marginBottom: 12 }}>
          Run data ingestion jobs on demand. Use this when you need immediate refresh outside cron.
        </p>
        <div className="admin-job-grid">
          {JOBS.map((job) => {
            const isRunning = Boolean(running[job.key]);
            const output = jobOutput[job.key];
            const disabledInCompatibility = compatibilityMode && !job.legacyEndpoint;

            return (
              <div key={job.key} className="admin-job-card">
                <p className="admin-job-label">{job.label}</p>
                <button
                  type="button"
                  className="admin-btn primary"
                  disabled={isRunning || disabledInCompatibility}
                  onClick={() => onRunJob(job)}
                >
                  {disabledInCompatibility ? 'Unavailable' : isRunning ? 'Running...' : 'Run'}
                </button>
                {output ? (
                  <p className="admin-job-meta">
                    {formatDate(output.at)} | {output.summary}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="admin-section-title" style={{ marginBottom: 10 }}>Recent Fetch Logs</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Status</th>
                <th>Inserted</th>
                <th>Fetched</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log._id}>
                  <td>
                    {log.jobName}
                    {log.source ? ` (${log.source})` : ''}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{log.status}</td>
                  <td>{log.inserted || 0}</td>
                  <td>{log.fetched || 0}</td>
                  <td>{formatDate(log.createdAt)}</td>
                </tr>
              ))}
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No fetch logs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AdminOperationsPanel;
