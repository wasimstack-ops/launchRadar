import { useEffect, useState } from 'react';
import api from '../../api/client';

function ListingsTable({ refreshSignal, onEdit, onDeleted }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 8;

  const fetchListings = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/api/listings');
      setListings(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      const message = requestError?.response?.data?.message || 'Failed to fetch listings';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [refreshSignal]);

  useEffect(() => {
    setPage(1);
  }, [listings.length]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this listing?');
    if (!confirmed) return;

    try {
      await api.delete(`/api/admin/listings/${id}`);
      await fetchListings();
      if (onDeleted) onDeleted(id);
    } catch (requestError) {
      const message = requestError?.response?.data?.message || 'Failed to delete listing';
      setError(message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginatedListings = listings.slice(start, start + PAGE_SIZE);

  return (
    <section>
      <h2 className="admin-section-title">Listings</h2>

      {loading ? <p>Loading...</p> : null}
      {error ? <p className="admin-alert error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedListings.map((listing) => (
              <tr key={listing._id}>
                <td>{listing.title}</td>
                <td>{listing.category}</td>
                <td>
                  <div className="admin-actions">
                    <button type="button" className="admin-btn" onClick={() => onEdit && onEdit(listing)}>
                      Edit
                    </button>
                    <button type="button" className="admin-btn ghost" onClick={() => handleDelete(listing._id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && listings.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  No listings found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {!loading && listings.length > 0 ? (
        <div className="admin-pagination">
          <p style={{ margin: 0 }}>
            Page {safePage} of {totalPages}
          </p>
          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="admin-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default ListingsTable;
