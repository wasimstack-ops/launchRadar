import { useState } from 'react';
import ListingForm from '../components/listings/ListingForm';
import ListingsTable from '../components/listings/ListingsTable';
import PendingSubmissionsTable from '../components/listings/PendingSubmissionsTable';
import AdminOperationsPanel from '../components/admin/AdminOperationsPanel';
import AdminCryptoTable from '../components/admin/AdminCryptoTable';

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
    <main style={{ maxWidth: 1040, margin: '30px auto', padding: 16 }}>
      <h1 style={{ marginBottom: 20 }}>Admin Dashboard</h1>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => setActiveSection('create')}
          style={{ background: activeSection === 'create' ? '#0f766e' : '#6b7280' }}
        >
          Create Listing
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('listings')}
          style={{ background: activeSection === 'listings' ? '#0f766e' : '#6b7280' }}
        >
          Listings
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('submissions')}
          style={{ background: activeSection === 'submissions' ? '#0f766e' : '#6b7280' }}
        >
          Pending Submissions
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('operations')}
          style={{ background: activeSection === 'operations' ? '#0f766e' : '#6b7280' }}
        >
          Operations
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('crypto')}
          style={{ background: activeSection === 'crypto' ? '#0f766e' : '#6b7280' }}
        >
          Crypto
        </button>
      </div>

      {activeSection === 'create' ? (
        <>
          <h2 style={{ marginBottom: 12 }}>{editingListing ? 'Edit Listing' : 'Create Listing'}</h2>
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
          <h2 style={{ marginBottom: 12 }}>All Listings</h2>
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
          <h2 style={{ marginBottom: 12 }}>Moderation Queue</h2>
          <PendingSubmissionsTable onApproved={() => setRefreshSignal((value) => value + 1)} />
        </>
      ) : null}

      {activeSection === 'operations' ? <AdminOperationsPanel refreshSignal={refreshSignal} /> : null}

      {activeSection === 'crypto' ? <AdminCryptoTable /> : null}
    </main>
  );
}

export default AdminDashboardPage;
