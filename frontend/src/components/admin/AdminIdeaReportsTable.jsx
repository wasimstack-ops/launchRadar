import { useEffect, useState } from 'react';
import api from '../../api/client';

function AdminIdeaReportsTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1 });

  const fetchRows = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '20',
      });
      if (search) params.set('search', search);

      const response = await api.get(`/api/admin/idea-reports?${params.toString()}`);
      const data = response.data?.data || {};
      setRows(Array.isArray(data.items) ? data.items : []);
      setPagination(data.pagination || { total: 0, totalPages: 1, page: nextPage });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to load idea reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
  }, [search]);

  useEffect(() => {
    fetchRows(page);
  }, [page]);

  const totalPages = Math.max(1, Number(pagination.totalPages || 1));

  return (
    <section>
      <div className="admin-section-head">
        <div>
          <h2 className="admin-section-title">Idea Reports</h2>
          <p className="admin-section-subtitle">Review analyses generated on the platform.</p>
        </div>
      </div>

      <div className="admin-filter-grid">
        <input
          className="input"
          placeholder="Search title or idea"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="admin-section-subtitle">Total: {pagination.total || 0}</div>
      </div>

      {error ? <p className="admin-alert error">{error}</p> : null}

      {loading ? (
        <p>Loading reports...</p>
      ) : (
        <div className="admin-table-wrap compact">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Founder</th>
                <th>Score</th>
                <th>Tier</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">No reports found.</td>
                </tr>
              ) : (
                rows.map((report) => (
                  <tr key={report._id}>
                    <td>{report.title || 'Untitled idea'}</td>
                    <td>{report.user?.name || report.user?.email || '-'}</td>
                    <td>{report.investorScore || '-'}</td>
                    <td>{report.trendTier || '-'}</td>
                    <td>{report.user?.plan || 'free'}</td>
                    <td>{report.user?.subscriptionStatus || 'inactive'}</td>
                    <td>{report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-pagination">
        <button type="button" className="admin-btn" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span className="admin-section-subtitle">Page {page} of {totalPages}</span>
        <button type="button" className="admin-btn" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          Next
        </button>
      </div>
    </section>
  );
}

export default AdminIdeaReportsTable;
