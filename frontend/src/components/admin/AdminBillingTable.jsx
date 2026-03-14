import { useEffect, useState } from 'react';
import api from '../../api/client';

function AdminBillingTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1 });

  const fetchRows = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/admin/billing/subscriptions?page=${nextPage}&limit=20`);
      const data = response.data?.data || {};
      setRows(Array.isArray(data.items) ? data.items : []);
      setPagination(data.pagination || { total: 0, totalPages: 1, page: nextPage });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to load billing data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(page);
  }, [page]);

  const totalPages = Math.max(1, Number(pagination.totalPages || 1));

  return (
    <section>
      <div className="admin-section-head">
        <div>
          <h2 className="admin-section-title">Billing</h2>
          <p className="admin-section-subtitle">Active subscriptions and Stripe metadata.</p>
        </div>
      </div>

      {error ? <p className="admin-alert error">{error}</p> : null}

      {loading ? (
        <p>Loading billing...</p>
      ) : (
        <div className="admin-table-wrap compact">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Stripe Customer</th>
                <th>Current Period End</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">No subscriptions found.</td>
                </tr>
              ) : (
                rows.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.plan || 'free'}</td>
                    <td>{user.subscriptionStatus || 'inactive'}</td>
                    <td>{user.stripeCustomerId || '-'}</td>
                    <td>{user.stripeCurrentPeriodEnd ? new Date(user.stripeCurrentPeriodEnd).toLocaleDateString() : '-'}</td>
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

export default AdminBillingTable;
