import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';

function ListingFormPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [score, setScore] = useState(5);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get(`/api/listings/${id}`);
        setListing(response.data?.data || null);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || 'Failed to load listing detail');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleRate = async (event) => {
    event.preventDefault();
    setRatingMessage('');

    try {
      setRatingLoading(true);
      const response = await api.post(`/api/listings/${id}/rating`, { score: Number(score) });
      setListing(response.data?.data || listing);
      setRatingMessage('Rating submitted.');
    } catch (requestError) {
      setRatingMessage(requestError?.response?.data?.message || 'Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <main className="detail-wrap">
      <Link to="/">Back to Listings</Link>
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {listing ? (
        <article className="detail-card">
          <p className="listing-meta">{listing.category}</p>
          <h1>{listing.title}</h1>
          <p>{listing.description}</p>
          <p>
            Rating: {listing.ratingCount ? `${listing.ratingAverage} (${listing.ratingCount})` : 'Not rated'}
          </p>
          <div className="tag-row">
            {(listing.tags || []).map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <form onSubmit={handleRate} style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
            <label htmlFor="score">Rate:</label>
            <select id="score" value={score} onChange={(event) => setScore(event.target.value)}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
            <button type="submit" disabled={ratingLoading}>
              {ratingLoading ? 'Saving...' : 'Submit Rating'}
            </button>
          </form>
          {ratingMessage ? <p>{ratingMessage}</p> : null}
          <a href={listing.link} target="_blank" rel="noreferrer">Open Product Website</a>
        </article>
      ) : null}
    </main>
  );
}

export default ListingFormPage;
