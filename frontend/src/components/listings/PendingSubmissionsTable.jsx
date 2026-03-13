import { useEffect, useState } from 'react';
import api from '../../api/client';

const CATEGORY_OPTIONS = [
  'All',
  'Crypto Tokens',
  'Airdrops',
  'Startups',
  'AI Tools',
  'Deals/Coupons',
];

function getSubmitterLabel(submission) {
  if (submission?.submittedByEmail) return submission.submittedByEmail;

  const { submittedBy } = submission || {};
  if (!submittedBy) return 'Unknown';
  if (typeof submittedBy === 'string') return submittedBy;

  return submittedBy.name || submittedBy.email || submittedBy._id || 'Unknown';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function PendingSubmissionsTable({ onApproved }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortByDate, setSortByDate] = useState('newest');
  const PAGE_SIZE = 8;

  const fetchSubmissions = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/api/admin/submissions', {
        params: {
          status: statusFilter,
          category: categoryFilter,
          search: searchTerm,
          sort: sortByDate,
        },
      });
      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      setSubmissions(data);
    } catch (requestError) {
      const message = requestError?.response?.data?.message || 'Failed to fetch submissions';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter, categoryFilter, searchTerm, sortByDate]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter, searchTerm, sortByDate, submissions.length]);

  const handleAction = async (id, action) => {
    setActingId(id);
    setError('');

    try {
      await api.patch(`/api/admin/submissions/${id}/${action}`);
      await fetchSubmissions();

      if (action === 'approve' && onApproved) {
        onApproved();
      }
    } catch (requestError) {
      const message = requestError?.response?.data?.message || `Failed to ${action} submission`;
      setError(message);
    } finally {
      setActingId('');
    }
  };

  const totalPages = Math.max(1, Math.ceil(submissions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginatedSubmissions = submissions.slice(start, start + PAGE_SIZE);

  return (
    <section style={{ marginTop: 28 }}>
      <h2 className="admin-section-title">Submissions Moderation</h2>

      <div className="admin-filter-grid">
        <input
          className="input"
          type="text"
          placeholder="Search by title, description, category, or email"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select className="input-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="input-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select className="input-select" value={sortByDate} onChange={(event) => setSortByDate(event.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {loading ? <p>Loading...</p> : null}
      {error ? <p className="admin-alert error">{error}</p> : null}

      <div className="admin-table-wrap compact">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Submitted By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSubmissions.map((submission) => {
              const isRowActing = actingId === submission._id;

              return (
                <tr key={submission._id}>
                  <td>{submission.title}</td>
                  <td>{submission.category}</td>
                  <td style={{ textTransform: 'capitalize' }}>{submission.status}</td>
                  <td>{getSubmitterLabel(submission)}</td>
                  <td>{formatDate(submission.createdAt)}</td>
                  <td>
                    {submission.status === 'pending' ? (
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn primary"
                          onClick={() => handleAction(submission._id, 'approve')}
                          disabled={isRowActing}
                        >
                          {isRowActing ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="admin-btn ghost"
                          onClick={() => handleAction(submission._id, 'reject')}
                          disabled={isRowActing}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {!loading && submissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No submissions found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {!loading && submissions.length > 0 ? (
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

export default PendingSubmissionsTable;
