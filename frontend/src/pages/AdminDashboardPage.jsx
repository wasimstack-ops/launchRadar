import { useState } from 'react';
import ListingForm from '../components/listings/ListingForm';
import ListingsTable from '../components/listings/ListingsTable';
import PendingSubmissionsTable from '../components/listings/PendingSubmissionsTable';
import AdminOperationsPanel from '../components/admin/AdminOperationsPanel';
import AdminCryptoTable from '../components/admin/AdminCryptoTable';
import AdminSubscribersTable from '../components/admin/AdminSubscribersTable';

function AdminDashboardPage() {
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

  return (
    <main className="admin-shell">
      <h1 className="admin-title">Admin Dashboard</h1>

      <div className="admin-tabs">
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
      </div>

      {activeSection === 'create' ? (
        <>
          <h2 className="admin-section-title">{editingListing ? 'Edit Listing' : 'Create Listing'}</h2>
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
    </main>
  );
}

export default AdminDashboardPage;
