import { useEffect, useState } from 'react';
import api from '../../api/client';

function AdminSubscribersTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [activeFilter, setActiveFilter] = useState('all');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, page: 1, limit: 20 });

  useEffect(() => {
    let cancelled = false;

    const fetchRows = async () => {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (activeFilter !== 'all') {
          query.set('active', activeFilter);
        }

        const response = await api.get(`/api/admin/alerts/subscriptions?${query.toString()}`);
        if (cancelled) return;

        const data = Array.isArray(response?.data?.data) ? response.data.data : [];
        const nextPagination = response?.data?.pagination || {};

        setRows(data);
        setPagination({
          total: Number(nextPagination.total || 0),
          totalPages: Number(nextPagination.totalPages || 0),
          page: Number(nextPagination.page || page),
          limit: Number(nextPagination.limit || limit),
        });
      } catch (requestError) {
        if (cancelled) return;
        setRows([]);
        setError(requestError?.response?.data?.message || 'Failed to load subscribers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRows();
    return () => {
      cancelled = true;
    };
  }, [page, limit, activeFilter]);

  const totalPages = Math.max(1, pagination.totalPages || 1);

  return (
    <section>
      <div className="admin-section-head">
        <div className="admin-actions">
          <label htmlFor="sub-active-filter" style={{ fontWeight: 600 }}>Status:</label>
          <select
            id="sub-active-filter"
            className="input-select"
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <span className="admin-section-subtitle">Total: {pagination.total}</span>
      </div>

      {error ? <p className="admin-alert error">{error}</p> : null}

      {loading ? (
        <p>Loading subscribers...</p>
      ) : (
        <div className="admin-table-wrap compact">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Frequency</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">No subscribers found.</td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item._id}>
                    <td>{item.email}</td>
                    <td>{item.frequency || 'weekly'}</td>
                    <td>{item.isActive ? 'Active' : 'Inactive'}</td>
                    <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-pagination">
        <div className="admin-actions">
          <button type="button" className="admin-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
            Prev
          </button>
          <span className="admin-section-subtitle">Page {page} of {totalPages}</span>
          <button
            type="button"
            className="admin-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

export default AdminSubscribersTable;
