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
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <label htmlFor="sub-active-filter" style={{ fontWeight: 600 }}>Status:</label>
        <select
          id="sub-active-filter"
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
        <span style={{ color: '#6b7280', fontSize: 14 }}>Total: {pagination.total}</span>
      </div>

      {error ? <p className="form-error" style={{ marginBottom: 12 }}>{error}</p> : null}

      {loading ? (
        <p>Loading subscribers...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Frequency</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '14px 8px', color: '#6b7280' }}>No subscribers found.</td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item._id}>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f3f4f6' }}>{item.email}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f3f4f6' }}>{item.frequency || 'weekly'}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f3f4f6' }}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f3f4f6' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
          Prev
        </button>
        <span style={{ fontSize: 14 }}>Page {page} of {totalPages}</span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
        >
          Next
        </button>
      </div>
    </section>
  );
}

export default AdminSubscribersTable;
