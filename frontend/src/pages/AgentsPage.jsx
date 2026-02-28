import { useEffect, useState } from 'react';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AgentCard from '../components/agents/AgentCard';
import styles from '../components/agents/Agents.module.css';

const PAGE_SIZE = 10;

function normalizePayload(payload) {
  return payload
    .map((item) => ({
      _id: item?._id,
      title: item?.title || '',
      description: item?.description || '',
      link: item?.link || '',
      category: item?.category || '',
      sourceType: item?.sourceType || '',
      stars: Number(item?.stars || 0),
      trendingScore: Number(item?.trendingScore || 0),
    }))
    .filter((item) => item.title || item.link);
}

function AgentsPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    api
      .get('/api/agents/repos', { params: { page, limit: PAGE_SIZE } })
      .then((response) => {
        if (!mounted) return;

        const dataNode = response?.data?.data;
        const payload = Array.isArray(dataNode?.items)
          ? dataNode.items
          : Array.isArray(dataNode)
            ? dataNode
            : Array.isArray(response?.data)
              ? response.data
              : [];

        const pagination = dataNode?.pagination || null;
        const nextTotalPages = Number(pagination?.totalPages || 1);
        const nextTotal = Number(pagination?.total || payload.length || 0);

        setItems(normalizePayload(payload));
        setTotalPages(Math.max(1, Number.isFinite(nextTotalPages) ? nextTotalPages : 1));
        setTotalItems(Number.isFinite(nextTotal) ? nextTotal : 0);
      })
      .catch((requestError) => {
        if (!mounted) return;
        setError(requestError?.response?.data?.message || 'Failed to load agents.');
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [page]);

  return (
    <div>
      <Navbar />

      <main className={styles.page}>
        <div className="container">
          <header className={styles.header}>
            <h1 className={styles.title}>AI Agents Intelligence</h1>
            <p className={styles.subtitle}>Trending and Emerging Autonomous Systems</p>
          </header>
          <section className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>GitHub</h2>
            <p className={styles.sectionMeta}>Trending repositories appear first.</p>
          </section>

          {error ? <p className={styles.error}>{error}</p> : null}

          {loading ? (
            <p className={styles.empty}>Loading agents...</p>
          ) : items.length === 0 ? (
            <p className={styles.empty}>No agents available</p>
          ) : (
            <>
              <section className={styles.list}>
                {items.map((item) => (
                  <AgentCard key={item._id || item.link || item.title} item={item} />
                ))}
              </section>

              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1 || loading}
                >
                  Prev
                </button>
                <p className={styles.pageInfo}>
                  Page {page} of {totalPages} ({totalItems} total)
                </p>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages || loading}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AgentsPage;
