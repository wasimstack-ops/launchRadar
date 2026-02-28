import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  Newspaper,
  Rocket,
  TrendingUp,
  TriangleIcon,
  Zap,
} from 'lucide-react';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const FALLBACK_THUMB = 'https://placehold.co/64x64/141b27/6366f1?text=?';

// ---- Helpers ----
function normalizeTopics(input) {
  const rows = Array.isArray(input) ? input : [];
  const dedup = new Map();

  for (const item of rows) {
    const slug = String(item?.slug || '').trim();
    const name = String(item?.name || '').trim();
    if (!slug || !name) continue;
    if (dedup.has(slug)) continue;
    dedup.set(slug, { ...item, slug, name });
  }

  return Array.from(dedup.values());
}

function truncate(text, max) {
  const v = String(text || '').trim();
  return v.length <= max ? v : `${v.slice(0, max).trimEnd()}…`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatVotes(n) {
  const count = Number(n) || 0;
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

function getSourceLabel(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    const name = host.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'News';
  }
}

const SOURCE_COLORS = {
  techcrunch:  { bg: 'rgba(10,143,8,0.15)',  color: '#4ade80' },
  venturebeat: { bg: 'rgba(0,102,204,0.15)', color: '#60a5fa' },
  theverge:    { bg: 'rgba(224,64,251,0.15)',color: '#e879f9' },
  wired:       { bg: 'rgba(200,200,200,0.1)',color: '#94a3b8' },
  producthunt: { bg: 'rgba(255,97,84,0.15)', color: '#ff6154' },
  default:     { bg: 'rgba(99,102,241,0.15)',color: '#818cf8' },
};

function getSourceColors(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '').split('.')[0];
    return SOURCE_COLORS[host] || SOURCE_COLORS.default;
  } catch {
    return SOURCE_COLORS.default;
  }
}

// ---- Newsletter CTA ----
function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
  };

  return (
    <section className="newsletter-section">
      <div className="newsletter-card">
        <p className="newsletter-eyebrow">
          <Zap size={13} /> Stay ahead
        </p>
        <h2 className="newsletter-title">Never miss an AI launch</h2>
        <p className="newsletter-sub">
          Get a weekly roundup of the best new AI tools, products, and startups — curated and delivered to your inbox.
        </p>
        {sent ? (
          <p style={{ color: 'var(--green)', fontWeight: 600 }}>
            ✓ You're on the list! We'll be in touch.
          </p>
        ) : (
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="newsletter-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="newsletter-btn">
              Subscribe <ArrowRight size={15} />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

// ---- Main Page ----
function ListingsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const [topics, setTopics] = useState([]);
  const [topToday, setTopToday] = useState([]);
  const [topPage, setTopPage] = useState(1);
  const [topTotalPages, setTopTotalPages] = useState(1);
  const [topPaginationActive, setTopPaginationActive] = useState(false);
  const [newsItems, setNewsItems] = useState([]);
  const [trendingItems, setTrendingItems] = useState([]);

  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingTopToday, setLoadingTopToday] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);

  const [carouselIdx, setCarouselIdx] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [error, setError] = useState('');

  // Load categories/topics
  useEffect(() => {
    setLoadingTopics(true);
    const fetchTopics = async () => {
      try {
        let data = [];
        try {
          const r = await api.get('/api/producthunt/categories');
          data = Array.isArray(r.data?.data) ? r.data.data : [];
        } catch {
          const r2 = await api.get('/api/producthunt/topics');
          data = Array.isArray(r2.data?.data) ? r2.data.data : [];
        }
        setTopics(normalizeTopics(data));
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load categories');
      } finally {
        setLoadingTopics(false);
      }
    };
    fetchTopics();
  }, []);

  // Load news
  useEffect(() => {
    setLoadingNews(true);
    api.get('/api/news?limit=10&page=1')
      .then((r) => setNewsItems(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => setNewsItems([]))
      .finally(() => setLoadingNews(false));
  }, []);

  // Load trending
  useEffect(() => {
    setLoadingTrending(true);
    api.get('/api/producthunt/trending?limit=8')
      .then((r) => setTrendingItems(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => setTrendingItems([]))
      .finally(() => setLoadingTrending(false));
  }, []);

  // Load top today
  useEffect(() => {
    setLoadingTopToday(true);
    api.get(`/api/producthunt/top-today?limit=15&page=${topPage}`)
      .then((r) => {
        const payload = r.data?.data || {};
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setTopToday(data);
        setTopTotalPages(Math.max(1, Number(payload?.totalPages || 1)));
        setTopPaginationActive(Boolean(payload?.paginationActive || Number(payload?.total || 0) > 15));
      })
      .catch(() => { setTopToday([]); setTopTotalPages(1); setTopPaginationActive(false); })
      .finally(() => setLoadingTopToday(false));
  }, [topPage]);

  // Carousel auto-rotate
  useEffect(() => {
    if (carouselPaused || trendingItems.length <= 1) return;
    const id = setInterval(() => {
      setCarouselIdx((i) => (i + 1) % trendingItems.length);
    }, 5000);
    return () => clearInterval(id);
  }, [carouselPaused, trendingItems.length]);

  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return [...topToday]
      .filter((p) => {
        if (!term) return true;
        return (
          String(p?.name || '').toLowerCase().includes(term) ||
          String(p?.tagline || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => Number(b?.votesCount || 0) - Number(a?.votesCount || 0));
  }, [topToday, searchTerm]);

  const activeTrending = trendingItems[carouselIdx] || null;

  const prevCarousel = () => {
    if (!trendingItems.length) return;
    setCarouselIdx((i) => (i - 1 + trendingItems.length) % trendingItems.length);
  };
  const nextCarousel = () => {
    if (!trendingItems.length) return;
    setCarouselIdx((i) => (i + 1) % trendingItems.length);
  };

  return (
    <div>
      <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* ---- HERO ---- */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
        <div className="hero-content">
          <span className="hero-badge">
            <Zap size={13} /> Real-time AI product tracking
          </span>
          <h1 className="hero-title">
            Track Every AI Launch<br />
            <span className="hero-title-grad">Before the World Does</span>
          </h1>
          <p className="hero-sub">
            Discover the hottest AI tools, products, and startups from Product Hunt and beyond — updated daily.
          </p>
          <div className="hero-actions">
            <a href="#products" className="btn btn-primary">
              Explore Products <ArrowRight size={15} />
            </a>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/submit')}
            >
              <Rocket size={15} /> Submit a Launch
            </button>
          </div>
        </div>
      </section>

      {/* ---- CATEGORY CHIPS ---- */}
      <section className="category-section">
        <div className="category-inner">
          <div className="category-chips">
            {loadingTopics && (
              <>
                {[1, 2, 3, 4, 5].map((k) => (
                  <span key={k} className="cat-chip skeleton" style={{ width: 80, height: 32 }} />
                ))}
              </>
            )}
            {!loadingTopics && topics.map((topic) => (
              <button
                key={topic.id || topic.slug}
                type="button"
                className="cat-chip"
                onClick={() => navigate(`/category/${topic.slug}`)}
              >
                {topic.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CONTENT GRID ---- */}
      <div className="content-layout" id="products">
        {/* MAIN */}
        <main className="content-main">

          {/* Trending Carousel */}
          <section>
            <div className="section-head">
              <h2 className="section-title">
                <TrendingUp size={18} className="section-icon" />
                Trending Now
              </h2>
            </div>

            {loadingTrending && (
              <div className="carousel-card skeleton" style={{ height: 120 }} />
            )}

            {!loadingTrending && activeTrending && (
              <>
                <div
                  className="carousel-card"
                  key={carouselIdx}
                  onMouseEnter={() => setCarouselPaused(true)}
                  onMouseLeave={() => setCarouselPaused(false)}
                >
                  <img
                    className="carousel-thumb"
                    src={activeTrending.thumbnail || FALLBACK_THUMB}
                    alt={activeTrending.name}
                    loading="lazy"
                    onError={(e) => { e.target.src = FALLBACK_THUMB; }}
                  />
                  <div className="carousel-body">
                    <p className="carousel-kicker">
                      #{carouselIdx + 1} on Product Hunt
                    </p>
                    <h3 className="carousel-name">{activeTrending.name}</h3>
                    <p className="carousel-tagline">
                      {activeTrending.tagline || activeTrending.description || ''}
                    </p>
                    <div className="carousel-footer">
                      <span className="vote-badge">
                        <TriangleIcon size={10} style={{ transform: 'rotate(0deg)' }} />
                        {formatVotes(activeTrending.votesCount)}
                      </span>
                      {(activeTrending.topics || []).slice(0, 2).map((t) => (
                        <span key={t.slug} className="tag-pill">{t.name}</span>
                      ))}
                      {activeTrending.website && (
                        <a
                          href={activeTrending.website}
                          target="_blank"
                          rel="noreferrer"
                          className="visit-link"
                        >
                          Visit <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {trendingItems.length > 1 && (
                  <div className="carousel-controls">
                    <div className="carousel-dots">
                      {trendingItems.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`carousel-dot${i === carouselIdx ? ' active' : ''}`}
                          onClick={() => setCarouselIdx(i)}
                          aria-label={`Trending item ${i + 1}`}
                        />
                      ))}
                    </div>
                    <div className="carousel-nav">
                      <button type="button" className="btn-icon" onClick={prevCarousel} aria-label="Previous">
                        <ChevronLeft size={16} />
                      </button>
                      <button type="button" className="btn-icon" onClick={nextCarousel} aria-label="Next">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {!loadingTrending && !activeTrending && (
              <div className="empty-state" style={{ padding: '24px' }}>
                <p>No trending products yet.</p>
              </div>
            )}
          </section>

          {/* Launching Today */}
          <section>
            <div className="section-head">
              <h2 className="section-title">
                <Rocket size={18} className="section-icon" />
                Launching Today
              </h2>
            </div>

            {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

            {loadingTopToday && (
              <div className="product-list">
                {[1, 2, 3, 4, 5].map((k) => (
                  <div key={k} className="product-item skeleton" style={{ height: 68 }} />
                ))}
              </div>
            )}

            {!loadingTopToday && visibleProducts.length === 0 && (
              <div className="empty-state">
                <Rocket size={28} strokeWidth={1.5} />
                <p>No products found for today.</p>
              </div>
            )}

            {!loadingTopToday && visibleProducts.length > 0 && (
              <div className="product-list">
                {visibleProducts.map((product, index) => (
                  <article key={product.id || index} className="product-item">
                    <span className="product-rank">
                      {product.rank || index + 1}
                    </span>
                    <img
                      className="product-thumb"
                      src={product.thumbnail || FALLBACK_THUMB}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => { e.target.src = FALLBACK_THUMB; }}
                    />
                    <div className="product-info">
                      <p className="product-name">{product.name}</p>
                      <p className="product-tagline">
                        {truncate(product.tagline || product.description, 90)}
                      </p>
                      <div className="product-tags">
                        {(product.topics || []).slice(0, 3).map((t) => (
                          <span key={`${product.id}-${t.slug}`} className="tag-pill">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="product-stats">
                      <span className="vote-badge">
                        <TriangleIcon size={10} />
                        {formatVotes(product.votesCount)}
                      </span>
                      {Number(product.commentsCount) > 0 && (
                        <span className="comment-count">
                          <MessageSquare size={11} />
                          {product.commentsCount}
                        </span>
                      )}
                      {product.url && (
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noreferrer"
                          className="visit-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Visit <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!loadingTopToday && topPaginationActive && (
              <div className="pagination">
                <span className="page-info">Page {topPage} of {topTotalPages}</span>
                <div className="page-btns">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={topPage <= 1}
                    onClick={() => setTopPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={topPage >= topTotalPages}
                    onClick={() => setTopPage((p) => Math.min(topTotalPages, p + 1))}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>

        {/* ASIDE — News Feed */}
        <aside className="content-aside">
          <div className="news-aside">
            <div className="news-aside-header">
              <h2 className="news-aside-title">
                <Newspaper size={16} className="news-aside-icon" />
                AI News
              </h2>
            </div>

            {loadingNews && (
              <div className="news-list">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 14, marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 12, width: '70%' }} />
                  </div>
                ))}
              </div>
            )}

            {!loadingNews && newsItems.length === 0 && (
              <div className="empty-state" style={{ margin: 16, padding: 24 }}>
                <p>No news available yet.</p>
              </div>
            )}

            {!loadingNews && newsItems.length > 0 && (
              <div className="news-list">
                {newsItems.map((item) => {
                  const colors = getSourceColors(item.link || '');
                  const source = item.source || getSourceLabel(item.link || '');
                  return (
                    <article key={item._id || item.link} className="news-item">
                      <span
                        className="news-source-badge"
                        style={{ background: colors.bg, color: colors.color }}
                      >
                        {source}
                      </span>
                      <p className="news-title">{item.title}</p>
                      {item.summary && (
                        <p className="news-summary">
                          {truncate(item.summary, 100)}
                        </p>
                      )}
                      <div className="news-meta">
                        <span className="news-time">
                          <Clock size={11} />
                          {timeAgo(item.publishedAt)}
                        </span>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="news-read-link"
                          >
                            Read <ArrowUpRight size={11} />
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      <NewsletterCTA />
      <Footer />
    </div>
  );
}

export default ListingsPage;
