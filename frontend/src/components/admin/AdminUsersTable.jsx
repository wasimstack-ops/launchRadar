import { useEffect, useState } from 'react';
import api from '../../api/client';

const PLAN_OPTIONS = ['all', 'free', 'pro', 'business'];
const STATUS_OPTIONS = ['all', 'inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'];

function AdminUsersTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
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
      if (plan !== 'all') params.set('plan', plan);
      if (status !== 'all') params.set('status', status);

      const response = await api.get(`/api/admin/users?${params.toString()}`);
      const data = response.data?.data || {};
      setRows(Array.isArray(data.items) ? data.items : []);
      setPagination(data.pagination || { total: 0, totalPages: 1, page: nextPage });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
  }, [search, plan, status]);

  useEffect(() => {
    fetchRows(page);
  }, [page]);

  const totalPages = Math.max(1, Number(pagination.totalPages || 1));

  return (
    <section>
      <div className="admin-section-head">
        <div>
          <h2 className="admin-section-title">Users</h2>
          <p className="admin-section-subtitle">Search and review user plans, roles, and subscription state.</p>
        </div>
      </div>

      <div className="admin-filter-grid">
        <input
          className="input"
          placeholder="Search name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="input-select" value={plan} onChange={(event) => setPlan(event.target.value)}>
          {PLAN_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <select className="input-select" value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="admin-section-subtitle">Total: {pagination.total || 0}</div>
      </div>

      {error ? <p className="admin-alert error">{error}</p> : null}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="admin-table-wrap compact">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Company</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">No users found.</td>
                </tr>
              ) : (
                rows.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.profileRole || user.role}</td>
                    <td>{user.plan || 'free'}</td>
                    <td>{user.subscriptionStatus || 'inactive'}</td>
                    <td>{user.company || '-'}</td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</td>
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

export default AdminUsersTable;
