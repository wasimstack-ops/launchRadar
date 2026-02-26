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
      <h2 style={{ marginBottom: 12 }}>Submissions Moderation</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search by title, description, category, or email"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select value={sortByDate} onChange={(event) => setSortByDate(event.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {loading ? <p>Loading...</p> : null}
      {error ? <p style={{ color: '#b00020' }}>{error}</p> : null}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Title</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Category</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Status</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Submitted By</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Date</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedSubmissions.map((submission) => {
            const isRowActing = actingId === submission._id;

            return (
              <tr key={submission._id}>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{submission.title}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{submission.category}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee', textTransform: 'capitalize' }}>
                  {submission.status}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>
                  {getSubmitterLabel(submission)}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>
                  {formatDate(submission.createdAt)}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>
                  {submission.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAction(submission._id, 'approve')}
                        disabled={isRowActing}
                        style={{ marginRight: 8 }}
                      >
                        {isRowActing ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(submission._id, 'reject')}
                        disabled={isRowActing}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span style={{ color: '#64748b' }}>-</span>
                  )}
                </td>
              </tr>
            );
          })}

          {!loading && submissions.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '10px 6px' }}>
                No submissions found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {!loading && submissions.length > 0 ? (
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

export default PendingSubmissionsTable;
