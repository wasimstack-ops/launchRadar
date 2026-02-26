import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import ThemeToggle from '../components/public/ThemeToggle';

const FALLBACK_THUMBNAIL = 'https://placehold.co/120x120/e2e8f0/1f2937?text=LR';

function truncate(text, maxLength) {
  const value = String(text || '').trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function getInitials(value) {
  const text = String(value || '').trim();
  if (!text) return 'U';
  if (text.includes('@')) return text.slice(0, 2).toUpperCase();
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function ListingsPage() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState([]);
  const [topToday, setTopToday] = useState([]);
  const [topPage, setTopPage] = useState(1);
  const [topTotalPages, setTopTotalPages] = useState(1);
  const [topTotal, setTopTotal] = useState(0);
  const [topPaginationActive, setTopPaginationActive] = useState(false);
  const [trendingItems, setTrendingItems] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingTopToday, setLoadingTopToday] = useState(false);
  const [error, setError] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem('publicTheme');
    if (storedTheme === 'light') setIsDark(false);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('theme-dark', isDark);
    localStorage.setItem('publicTheme', isDark ? 'dark' : 'light');
    return () => {
      document.body.classList.remove('theme-dark');
    };
  }, [isDark]);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('userToken');
      if (!token) return;
      try {
        const response = await api.get('/api/auth/me');
        setCurrentUser(response.data?.data || null);
      } catch (_error) {
        localStorage.removeItem('userToken');
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadTopics = async () => {
      setLoadingTopics(true);
      setError('');
      try {
        let data = [];
        try {
          const response = await api.get('/api/producthunt/categories');
          data = Array.isArray(response.data?.data) ? response.data.data : [];
        } catch (_categoriesError) {
          const fallback = await api.get('/api/producthunt/topics');
          data = Array.isArray(fallback.data?.data) ? fallback.data.data : [];
        }
        setTopics(data);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Failed to load categories');
      } finally {
        setLoadingTopics(false);
      }
    };

    loadTopics();
  }, []);

  useEffect(() => {
    const loadTrending = async () => {
      setLoadingTrending(true);
      try {
        const response = await api.get('/api/producthunt/trending?limit=10');
        const data = Array.isArray(response.data?.data) ? response.data.data : [];
        setTrendingItems(data);
      } catch (_error) {
        setTrendingItems([]);
      } finally {
        setLoadingTrending(false);
      }
    };

    loadTrending();
  }, []);

  useEffect(() => {
    if (isBannerPaused || trendingItems.length <= 1) return undefined;

    const intervalId = setInterval(() => {
      setActiveBannerIndex((value) => (value + 1) % trendingItems.length);
    }, 4500);

    return () => clearInterval(intervalId);
  }, [isBannerPaused, trendingItems.length]);

  useEffect(() => {
    if (activeBannerIndex > 0 && activeBannerIndex >= trendingItems.length) {
      setActiveBannerIndex(0);
    }
  }, [activeBannerIndex, trendingItems.length]);

  useEffect(() => {
    const loadTopToday = async () => {
      setLoadingTopToday(true);
      try {
        const response = await api.get(`/api/producthunt/top-today?limit=10&page=${topPage}`);
        const payload = response.data?.data || {};
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setTopToday(data);
        setTopTotalPages(Math.max(1, Number(payload?.totalPages || 1)));
        setTopTotal(Number(payload?.total || 0));
        setTopPaginationActive(Boolean(payload?.paginationActive || Number(payload?.total || 0) > 10));
      } catch (_error) {
        setTopToday([]);
        setTopTotalPages(1);
        setTopTotal(0);
        setTopPaginationActive(false);
      } finally {
        setLoadingTopToday(false);
      }
    };

    loadTopToday();
  }, [topPage]);

  const visibleTopToday = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return [...topToday]
      .filter((item) => {
        if (!term) return true;
        return (
          String(item?.name || '').toLowerCase().includes(term) ||
          String(item?.tagline || '').toLowerCase().includes(term) ||
          String(item?.description || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => Number(b?.votesCount || 0) - Number(a?.votesCount || 0));
  }, [topToday, searchTerm]);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    setCurrentUser(null);
    navigate('/auth');
  };

  const activeBanner = trendingItems[activeBannerIndex] || null;

  const handlePrevBanner = () => {
    if (trendingItems.length === 0) return;
    setActiveBannerIndex((value) => (value - 1 + trendingItems.length) % trendingItems.length);
  };

  const handleNextBanner = () => {
    if (trendingItems.length === 0) return;
    setActiveBannerIndex((value) => (value + 1) % trendingItems.length);
  };

  return (
    <main className="phx-page">
      <header className="phx-nav">
        <div className="phx-brand">L</div>
        <input
          type="text"
          className="phx-search"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <nav className="phx-links">
          <button type="button" className="active">Best Products</button>
          <button type="button">Launches</button>
          <button type="button">News</button>
          <button type="button">Forums</button>
        </nav>
        <div className="phx-actions">
          <button type="button" className="phx-submit" onClick={() => navigate('/submit')}>
            Submit
          </button>
          {currentUser ? (
            <div className="pd-user-chip" title={currentUser.email || currentUser.name || ''}>
              <span className="pd-user-avatar">{getInitials(currentUser.name || currentUser.email)}</span>
              <span className="pd-user-email">{currentUser.email || currentUser.name}</span>
              <button type="button" className="pd-logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <button type="button" className="phx-auth" onClick={() => navigate('/auth')}>
              Sign In
            </button>
          )}
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark((value) => !value)} />
        </div>
      </header>

      <section className="phx-categories">
        <h2>Best Products</h2>
        {loadingTopics ? <p className="phx-muted">Loading categories...</p> : null}
        {!loadingTopics && topics.length === 0 ? <p className="phx-muted">No categories found.</p> : null}
        <div className="phx-category-row">
          {topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className="phx-cat-chip"
              onClick={() => navigate(`/category/${topic.slug}`)}
            >
              {topic.name}
            </button>
          ))}
        </div>
      </section>

      <section className="phx-content">
        <section className="phx-main">
          <section className="phx-banner-wrap">
            <h2>Trending Apps</h2>
            {loadingTrending ? <p className="phx-muted">Loading trending apps...</p> : null}
            {!loadingTrending && !activeBanner ? <p className="phx-muted">No trending apps available.</p> : null}

            {activeBanner ? (
              <article className="phx-banner">
                <button type="button" className="phx-banner-arrow" onClick={handlePrevBanner} aria-label="Previous app">
                  ‹
                </button>

                <div className="phx-banner-content">
                  <p className="phx-banner-kicker">
                    #{activeBannerIndex + 1} Trending
                  </p>
                  <h3>{activeBanner.name}</h3>
                  <p>{activeBanner.tagline || 'Top trending app on Product Hunt'}</p>
                  <div className="phx-banner-meta">
                    <span>Votes: {activeBanner.votesCount || 0}</span>
                    {activeBanner.website ? (
                      <a href={activeBanner.website} target="_blank" rel="noreferrer">
                        Visit
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="phx-banner-actions">
                  <button
                    type="button"
                    className="phx-banner-pause"
                    onClick={() => setIsBannerPaused((value) => !value)}
                  >
                    {isBannerPaused ? 'Play' : 'Pause'}
                  </button>
                  <button type="button" className="phx-banner-arrow" onClick={handleNextBanner} aria-label="Next app">
                    ›
                  </button>
                </div>
              </article>
            ) : null}
          </section>

          <div className="phx-main-head">
            <h1>Top Products Launching Today</h1>
          </div>

          {error ? <p className="form-error">{error}</p> : null}
          {loadingTopToday ? <div className="phx-loading">Loading products...</div> : null}

          {!loadingTopToday && visibleTopToday.length === 0 ? (
            <div className="pd-empty-state">
              <p>No products found for today.</p>
            </div>
          ) : null}

          {!loadingTopToday ? (
            <div className="phx-list">
              {visibleTopToday.map((product, index) => (
                <article key={product.id || index} className="phx-item">
                  <div className="phx-rank">{product.rank || index + 1}</div>
                  <img
                    className="phx-thumb"
                    src={product.thumbnail || FALLBACK_THUMBNAIL}
                    alt={product.name}
                    loading="lazy"
                  />
                  <div className="phx-meta">
                    <h3>{product.name}</h3>
                    <p>{truncate(product.tagline || product.description, 120)}</p>
                    <div className="phx-tags">
                      {(product.topics || []).slice(0, 3).map((topic) => (
                        <span key={`${product.id}-${topic.slug}`}>{topic.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="phx-stats">
                    <span>Votes {product.votesCount || 0}</span>
                    <span>Comments {product.commentsCount || 0}</span>
                    <a href={product.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!loadingTopToday && topPaginationActive ? (
            <div className="phx-pagination">
              <p>
                Page {topPage} of {topTotalPages}
              </p>
              <div>
                <button
                  type="button"
                  disabled={topPage <= 1}
                  onClick={() => setTopPage((value) => Math.max(1, value - 1))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={topPage >= topTotalPages}
                  onClick={() => setTopPage((value) => Math.min(topTotalPages, value + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="phx-side">
          <h2>Reserved Panel</h2>
          <div className="pd-empty-state">
            <p>This space is reserved for future widgets.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default ListingsPage;
