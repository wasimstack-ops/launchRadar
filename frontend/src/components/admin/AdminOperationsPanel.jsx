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
    key: 'github',
    label: 'Sync GitHub AI',
    method: 'post',
    endpoint: '/api/admin/ops/github/sync',
    legacyMethod: 'get',
    legacyEndpoint: '/api/admin/automation/github-test',
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
    <div
      key={title}
      style={{
        border: '1px solid #94a3b8',
        borderRadius: 10,
        padding: 12,
        background: '#f8fafc',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: '#334155', fontWeight: 600 }}>{title}</p>
      <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{value}</p>
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
        response = await runApiCall(job.method, job.endpoint, {});
      } catch (primaryError) {
        if (primaryError?.response?.status === 404 && job.legacyEndpoint) {
          setCompatibilityMode(true);
          setNotice(
            'Using compatibility mode. Restart backend to enable the new /api/admin/ops routes and full metrics.'
          );
          response = await runApiCall(job.legacyMethod || 'get', job.legacyEndpoint, {});
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Operations Center</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Monitor ingestion pipelines, run manual sync jobs, and check recent fetch activity.
          </p>
        </div>
        <button type="button" onClick={loadData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {notice ? (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#fffbeb',
            border: '1px solid #f59e0b',
            color: '#92400e',
            fontSize: 13,
          }}
        >
          {notice}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {statCards.map(([title, value]) => statCard(title, value))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 10px', fontWeight: 800, color: '#0f172a' }}>Manual Sync Jobs</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {JOBS.map((job) => {
            const isRunning = Boolean(running[job.key]);
            const output = jobOutput[job.key];
            const disabledInCompatibility = compatibilityMode && !job.legacyEndpoint;

            return (
              <div
                key={job.key}
                style={{ border: '1px solid #d1d5db', borderRadius: 10, padding: 12, background: '#fff' }}
              >
                <p style={{ margin: '0 0 8px', fontWeight: 800, color: '#0f172a' }}>{job.label}</p>
                <button
                  type="button"
                  disabled={isRunning || disabledInCompatibility}
                  onClick={() => onRunJob(job)}
                  style={{ fontWeight: 800, color: '#0f172a' }}
                >
                  {disabledInCompatibility ? 'Unavailable' : isRunning ? 'Running...' : 'Run'}
                </button>
                {output ? (
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                    {formatDate(output.at)} | {output.summary}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 10px' }}>Recent Fetch Logs</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Job</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Inserted</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Fetched</th>
              <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>When</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((log) => (
              <tr key={log._id}>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>
                  {log.jobName}
                  {log.source ? ` (${log.source})` : ''}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee', textTransform: 'capitalize' }}>
                  {log.status}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{log.inserted || 0}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{log.fetched || 0}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{formatDate(log.createdAt)}</td>
              </tr>
            ))}
            {recentLogs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '10px 6px' }}>
                  No fetch logs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminOperationsPanel;
