import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ListingForm from '../components/listings/ListingForm';
import ListingsTable from '../components/listings/ListingsTable';
import PendingSubmissionsTable from '../components/listings/PendingSubmissionsTable';
import AdminOperationsPanel from '../components/admin/AdminOperationsPanel';
import AdminCryptoTable from '../components/admin/AdminCryptoTable';
import AdminSubscribersTable from '../components/admin/AdminSubscribersTable';
import AdminUsersTable from '../components/admin/AdminUsersTable';
import AdminBillingTable from '../components/admin/AdminBillingTable';
import AdminIdeaReportsTable from '../components/admin/AdminIdeaReportsTable';
import AdminEventsPanel from '../components/admin/AdminEventsPanel';

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [editingListing, setEditingListing] = useState(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [activeSection, setActiveSection] = useState('create');

  const handleSaved = () => {
    setEditingListing(null);
    setRefreshSignal((value) => value + 1);
    setActiveSection('listings');
  };

  const handleDeleted = (deletedId) => {
    if (editingListing?._id === deletedId) {
      setEditingListing(null);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminKey');
    navigate('/admin/login', { replace: true });
  };

  return (
    <main className="admin-shell">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-brand">
            <div className="admin-sidebar-logo">W</div>
            <div>
              <p className="admin-sidebar-title">WAYB Admin</p>
              <p className="admin-sidebar-sub">Operations Console</p>
            </div>
          </div>

          <nav className="admin-sidebar-nav">
            <button
              type="button"
              onClick={() => setActiveSection('create')}
              className={`admin-tab${activeSection === 'create' ? ' active' : ''}`}
            >
              Create Listing
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('listings')}
              className={`admin-tab${activeSection === 'listings' ? ' active' : ''}`}
            >
              Listings
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('submissions')}
              className={`admin-tab${activeSection === 'submissions' ? ' active' : ''}`}
            >
              Pending Submissions
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('operations')}
              className={`admin-tab${activeSection === 'operations' ? ' active' : ''}`}
            >
              Operations
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('crypto')}
              className={`admin-tab${activeSection === 'crypto' ? ' active' : ''}`}
            >
              Crypto
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('subscribers')}
              className={`admin-tab${activeSection === 'subscribers' ? ' active' : ''}`}
            >
              Subscribers
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('users')}
              className={`admin-tab${activeSection === 'users' ? ' active' : ''}`}
            >
              Users
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('billing')}
              className={`admin-tab${activeSection === 'billing' ? ' active' : ''}`}
            >
              Billing
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('reports')}
              className={`admin-tab${activeSection === 'reports' ? ' active' : ''}`}
            >
              Idea Reports
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('events')}
              className={`admin-tab${activeSection === 'events' ? ' active' : ''}`}
            >
              Events
            </button>
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-profile-card">
              <div className="admin-profile-avatar">A</div>
              <div>
                <p className="admin-profile-name">Admin</p>
                <p className="admin-profile-meta">Key access</p>
              </div>
            </div>
            <button type="button" className="admin-btn ghost" onClick={handleAdminLogout}>
              Log out
            </button>
          </div>
        </aside>

        <section className="admin-main">
          <div className="admin-header">
            <div>
              <h1 className="admin-title">Admin Dashboard</h1>
              <p className="admin-section-subtitle">Manage listings, users, billing, and platform operations.</p>
            </div>
          </div>

          {activeSection === 'create' ? (
            <>
              <ListingForm
                editingListing={editingListing}
                onSaved={handleSaved}
                onCancelEdit={() => {
                  setEditingListing(null);
                  setActiveSection('listings');
                }}
              />
            </>
          ) : null}

          {activeSection === 'listings' ? (
            <>
              <h2 className="admin-section-title">All Listings</h2>
              <ListingsTable
                refreshSignal={refreshSignal}
                onEdit={(listing) => {
                  setEditingListing(listing);
                  setActiveSection('create');
                }}
                onDeleted={handleDeleted}
              />
            </>
          ) : null}

          {activeSection === 'submissions' ? (
            <>
              <h2 className="admin-section-title">Moderation Queue</h2>
              <PendingSubmissionsTable onApproved={() => setRefreshSignal((value) => value + 1)} />
            </>
          ) : null}

          {activeSection === 'operations' ? <AdminOperationsPanel refreshSignal={refreshSignal} /> : null}

          {activeSection === 'crypto' ? <AdminCryptoTable /> : null}

          {activeSection === 'subscribers' ? (
            <>
              <h2 className="admin-section-title">Newsletter Subscribers</h2>
              <AdminSubscribersTable />
            </>
          ) : null}

          {activeSection === 'users' ? <AdminUsersTable /> : null}

          {activeSection === 'billing' ? <AdminBillingTable /> : null}

          {activeSection === 'reports' ? <AdminIdeaReportsTable /> : null}
          {activeSection === 'events'  ? <AdminEventsPanel />      : null}
        </section>
      </div>
    </main>
  );
}

export default AdminDashboardPage;
