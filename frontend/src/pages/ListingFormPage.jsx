import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  MessageSquare,
  Star,
  Tag,
  TriangleIcon,
} from 'lucide-react';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const FALLBACK_THUMB = 'https://placehold.co/72x72/141b27/6366f1?text=?';

function ListingFormPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState(5);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
  const [ratingError, setRatingError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/api/listings/${id}`)
      .then((r) => setListing(r.data?.data || null))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load this listing'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRate = async (e) => {
    e.preventDefault();
    setRatingMessage('');
    setRatingError('');
    setRatingLoading(true);
    try {
      const r = await api.post(`/api/listings/${id}/rating`, { score: Number(score) });
      setListing(r.data?.data || listing);
      setRatingMessage('Rating submitted — thanks!');
    } catch (err) {
      setRatingError(err?.response?.data?.message || 'Failed to submit rating. Sign in to rate.');
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <div>
      <Navbar />

      <div className="detail-shell">
        <div className="detail-inner">
          <Link to="/" className="detail-back">
            <ArrowLeft size={14} /> Back to products
          </Link>

          {loading && (
            <div className="detail-card">
              <div className="detail-header">
                <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 'var(--r-md)' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 14, width: '30%' }} />
                  <div className="skeleton" style={{ height: 24, width: '60%' }} />
                </div>
              </div>
              <div className="detail-body">
                <div className="skeleton" style={{ height: 14, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '80%' }} />
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="empty-state" style={{ marginTop: 0 }}>
              <p style={{ color: 'var(--red)' }}>{error}</p>
              <Link to="/" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>
                Go home
              </Link>
            </div>
          )}

          {listing && !loading && (
            <div className="detail-card fade-up">
              {/* Header */}
              <div className="detail-header">
                <img
                  className="detail-thumb"
                  src={listing.thumbnail || FALLBACK_THUMB}
                  alt={listing.title}
                  onError={(e) => { e.target.src = FALLBACK_THUMB; }}
                />
                <div className="detail-meta">
                  <p className="detail-category">{listing.category}</p>
                  <h1 className="detail-title">{listing.title}</h1>
                  {listing.ratingCount > 0 && (
                    <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <Star size={14} style={{ color: '#fbbf24' }} />
                      {Number(listing.ratingAverage).toFixed(1)} · {listing.ratingCount} rating{listing.ratingCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="detail-body">
                {/* Stats */}
                {(listing.ratingCount > 0 || listing.ratingAverage > 0) && (
                  <div className="detail-stats">
                    <div className="stat-item">
                      <span className="stat-value" style={{ color: '#fbbf24' }}>
                        {Number(listing.ratingAverage).toFixed(1)}
                      </span>
                      <span className="stat-label">Avg Rating</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{listing.ratingCount}</span>
                      <span className="stat-label">Ratings</span>
                    </div>
                  </div>
                )}

                {/* Description */}
                {listing.description && (
                  <p className="detail-description">{listing.description}</p>
                )}

                {/* Tags */}
                {(listing.tags || []).length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Tag size={13} /> Tags
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {listing.tags.map((tag) => (
                        <span key={tag} className="tag-pill">#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visit link */}
                {listing.link && (
                  <div>
                    <a
                      href={listing.link}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ display: 'inline-flex' }}
                    >
                      Visit Product Website <ArrowUpRight size={15} />
                    </a>
                  </div>
                )}

                {/* Rating form */}
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
                    Rate this product
                  </p>
                  <form className="rating-form" onSubmit={handleRate}>
                    <label htmlFor="score" className="rating-label">
                      <Star size={14} style={{ color: '#fbbf24' }} /> Score:
                    </label>
                    <select
                      id="score"
                      className="rating-select"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                    >
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>{v} star{v !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={ratingLoading}
                    >
                      {ratingLoading ? 'Saving…' : 'Submit'}
                    </button>
                  </form>
                  {ratingMessage && <p className="form-success" style={{ marginTop: 8 }}>{ratingMessage}</p>}
                  {ratingError && <p className="form-error" style={{ marginTop: 8 }}>{ratingError}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ListingFormPage;
