import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AgentCard from '../components/agents/AgentCard';
import styles from '../components/agents/Agents.module.css';

const PAGE_SIZE = 20;
const TABS = ['AI Agents', 'GitHub Repos'];
const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'latest', label: 'Latest' },
];

function useFetchAgents({ endpoint, sort, page }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    api
      .get(endpoint, { params: { page, limit: PAGE_SIZE, sort } })
      .then((res) => {
        if (!mounted) return;
        const data = res?.data?.data;
        const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setItems(rawItems);
        setPagination(data?.pagination || { totalPages: 1, total: rawItems.length });
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Failed to load data.');
        setItems([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [endpoint, sort, page]);

  return { items, pagination, loading, error };
}

function AgentSection({ endpoint, label }) {
  const [sort, setSort] = useState('trending');
  const [page, setPage] = useState(1);

  const handleSort = useCallback((val) => {
    setSort(val);
    setPage(1);
  }, []);

  const { items, pagination, loading, error } = useFetchAgents({ endpoint, sort, page });

  return (
    <div className={styles.section}>
      <div className={styles.sectionBar}>
        <h2 className={styles.sectionTitle}>{label}</h2>
        <div className={styles.sortTabs}>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.sortTab}${sort === opt.value ? ` ${styles.sortTabActive}` : ''}`}
              onClick={() => handleSort(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className={styles.errorMsg}>{error}</p> : null}

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className={styles.emptyState}>
          No data yet — run a sync from the admin panel to populate this section.
        </p>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <AgentCard key={item._id || item.link} item={item} />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 ? (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Prev
          </button>
          <span className={styles.pageInfo}>
            {page} / {pagination.totalPages}
            <span className={styles.pageTotal}> ({pagination.total} total)</span>
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages || loading}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AgentsPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <Helmet>
        <title>AI Agents &amp; Repositories — Trending Tools | LaunchRadar</title>
        <meta name="description" content="Discover trending AI agent frameworks, autonomous agents, and open-source repositories. Synced daily from Hugging Face and GitHub." />
        <meta property="og:title" content="AI Agents & Repositories — Trending Tools | LaunchRadar" />
        <meta property="og:description" content="Discover trending AI agent frameworks and open-source repos. Updated daily from Hugging Face and GitHub." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://launchradar.io/agents" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Agents & Repos | LaunchRadar" />
        <meta name="twitter:description" content="Trending AI agents and open-source repositories, synced daily." />
      </Helmet>

      <Navbar />

      <main className={styles.page}>
        <div className="container">
          <header className={styles.header}>
            <h1 className={styles.pageTitle}>AI Agents &amp; Repositories</h1>
            <p className={styles.pageSubtitle}>
              Discover trending AI agent frameworks and open-source repositories, synced every 6 hours from GitHub.
            </p>
          </header>

          <div className={styles.tabBar}>
            {TABS.map((tab, i) => (
              <button
                key={tab}
                type="button"
                className={`${styles.tab}${activeTab === i ? ` ${styles.tabActive}` : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 0 ? (
            <AgentSection key="agents" endpoint="/api/agents/ai" label="AI Agents" />
          ) : (
            <AgentSection key="repos" endpoint="/api/agents/repos" label="GitHub Repositories" />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AgentsPage;
