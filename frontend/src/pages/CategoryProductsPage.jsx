import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronLeft,
  MessageSquare,
  Search,
  TriangleIcon,
} from 'lucide-react';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const FALLBACK_THUMB = 'https://placehold.co/400x225/141b27/6366f1?text=?';
const FALLBACK_ICON  = 'https://placehold.co/64x64/141b27/6366f1?text=?';

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

function formatVotes(n) {
  const count = Number(n) || 0;
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

function CategoryProductsPage() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [topics, setTopics] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');

  // Load topics for the category chip row
  useEffect(() => {
    setLoadingTopics(true);
    const fetch = async () => {
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
      } catch {
        // non-fatal, chips just won't show
      } finally {
        setLoadingTopics(false);
      }
    };
    fetch();
  }, []);

  // Load products for this category
  useEffect(() => {
    if (!slug) return;
    setLoadingProducts(true);
    setError('');
    api.get(`/api/producthunt/products?topic=${encodeURIComponent(slug)}`)
      .then((r) => setProducts(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load products'))
      .finally(() => setLoadingProducts(false));
  }, [slug]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return [...products]
      .filter((p) => {
        if (!term) return true;
        return (
          String(p?.name || '').toLowerCase().includes(term) ||
          String(p?.tagline || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => Number(b?.votesCount || 0) - Number(a?.votesCount || 0));
  }, [products, searchTerm]);

  // Derive a display name from slug
  const categoryName = topics.find((t) => t.slug === slug)?.name
    || slug?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    || 'Category';

  return (
    <div>
      <Navbar />

      {/* Page header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 0 }}>
        <div className="container" style={{ paddingTop: 28 }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--text-2)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 16,
            }}
          >
            <ChevronLeft size={15} /> Back to all products
          </button>

          <h1 style={{
            fontSize: 'clamp(1.6rem, 4vw, 2.25rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: 6,
          }}>
            {categoryName}
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem' }}>
            {loadingProducts ? 'Loading…' : `${filteredProducts.length} products`}
          </p>
        </div>
      </div>

      {/* Category chip nav */}
      <section className="category-section" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="category-inner">
          <div className="category-chips">
            <button
              type="button"
              className="cat-chip"
              onClick={() => navigate('/')}
            >
              All
            </button>
            {!loadingTopics && topics.map((topic) => (
              <button
                key={topic.id || topic.slug}
                type="button"
                className={`cat-chip${topic.slug === slug ? ' active' : ''}`}
                onClick={() => navigate(`/category/${topic.slug}`)}
              >
                {topic.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Search bar */}
      <div className="container" style={{ paddingTop: 20, paddingBottom: 0 }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-3)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: 38, borderRadius: 'var(--r-full)' }}
            placeholder={`Search ${categoryName}…`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Product grid */}
      <div className="container" style={{ paddingTop: 20, paddingBottom: 60 }}>
        {error && <p className="form-error" style={{ marginBottom: 16 }}>{error}</p>}

        {loadingProducts && (
          <div className="product-grid">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="product-card skeleton" style={{ height: 260 }} />
            ))}
          </div>
        )}

        {!loadingProducts && filteredProducts.length === 0 && (
          <div className="empty-state">
            <Search size={28} strokeWidth={1.5} />
            <p>No products found{searchTerm ? ` for "${searchTerm}"` : ' in this category'}.</p>
          </div>
        )}

        {!loadingProducts && filteredProducts.length > 0 && (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <article key={product.ph_id || product.id} className="product-card">
                <img
                  className="card-thumb"
                  src={product.thumbnail || FALLBACK_THUMB}
                  alt={product.name}
                  loading="lazy"
                  onError={(e) => { e.target.src = FALLBACK_THUMB; }}
                />
                <div className="card-body">
                  <h3 className="card-name">{product.name}</h3>
                  <p className="card-tagline">
                    {truncate(product.tagline || product.description, 110)}
                  </p>
                  {(product.topics || []).length > 0 && (
                    <div className="card-tags">
                      {(product.topics || []).slice(0, 3).map((t) => (
                        <span key={`${product.ph_id}-${t.slug}`} className="tag-pill">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="card-footer">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                    </div>
                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noreferrer"
                        className="visit-link"
                      >
                        Visit <ArrowUpRight size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default CategoryProductsPage;
