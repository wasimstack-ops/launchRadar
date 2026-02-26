import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

function CategoryProductsPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [topics, setTopics] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
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
    const loadProducts = async () => {
      if (!slug) return;
      setLoadingProducts(true);
      setError('');
      try {
        const response = await api.get(`/api/producthunt/products?topic=${encodeURIComponent(slug)}`);
        const data = Array.isArray(response.data?.data) ? response.data.data : [];
        setProducts(data);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Failed to load products');
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, [slug]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return [...products]
      .filter((item) => {
        if (!term) return true;
        return (
          String(item?.name || '').toLowerCase().includes(term) ||
          String(item?.tagline || '').toLowerCase().includes(term) ||
          String(item?.description || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => Number(b?.votesCount || 0) - Number(a?.votesCount || 0));
  }, [products, searchTerm]);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    setCurrentUser(null);
    navigate('/auth');
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
          <button type="button" className="active" onClick={() => navigate('/')}>Best Products</button>
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
              className={`phx-cat-chip${slug === topic.slug ? ' active' : ''}`}
              onClick={() => navigate(`/category/${topic.slug}`)}
            >
              {topic.name}
            </button>
          ))}
        </div>
      </section>

      <section className="phx-content">
        <section className="phx-main">
          <div className="phx-main-head">
            <h1>Top Products Launching Today</h1>
            <p>{slug ? `Category: ${slug}` : ''}</p>
          </div>

          {error ? <p className="form-error">{error}</p> : null}
          {loadingProducts ? <div className="phx-loading">Loading products...</div> : null}

          {!loadingProducts && filteredProducts.length === 0 ? (
            <div className="pd-empty-state">
              <p>No products found for this category.</p>
            </div>
          ) : null}

          {!loadingProducts ? (
            <div className="phx-list">
              {filteredProducts.map((product, index) => (
                <article key={product.ph_id} className="phx-item">
                  <div className="phx-rank">{index + 1}</div>
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
                        <span key={`${product.ph_id}-${topic.slug}`}>{topic.name}</span>
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
        </section>
      </section>
    </main>
  );
}

export default CategoryProductsPage;
