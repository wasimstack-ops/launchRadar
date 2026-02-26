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
      <h2 style={{ marginBottom: 12 }}>Listings</h2>

      {loading ? <p>Loading...</p> : null}
      {error ? <p style={{ color: '#b00020' }}>{error}</p> : null}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Title</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Category</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedListings.map((listing) => (
            <tr key={listing._id}>
              <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{listing.title}</td>
              <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{listing.category}</td>
              <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>
                <button type="button" onClick={() => onEdit && onEdit(listing)} style={{ marginRight: 8 }}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(listing._id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}

          {!loading && listings.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ padding: '10px 6px' }}>
                No listings found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {!loading && listings.length > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <p style={{ margin: 0 }}>
            Page {safePage} of {totalPages}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Prev
            </button>
            <button
              type="button"
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
