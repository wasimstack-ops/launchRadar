import { useEffect, useState } from 'react';
import api from '../../api/client';

const initialForm = {
  title: '',
  description: '',
  category: '',
  link: '',
  tags: '',
};

function ListingForm({ editingListing, onSaved, onCancelEdit }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editingListing) {
      setForm(initialForm);
      setError('');
      return;
    }

    setForm({
      title: editingListing.title || '',
      description: editingListing.description || '',
      category: editingListing.category || '',
      link: editingListing.link || '',
      tags: Array.isArray(editingListing.tags) ? editingListing.tags.join(', ') : '',
    });
    setError('');
  }, [editingListing]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      link: form.link.trim(),
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    try {
      if (editingListing?._id) {
        await api.put(`/api/admin/listings/${editingListing._id}`, payload);
      } else {
        await api.post('/api/admin/listings', payload);
      }

      setForm(initialForm);
      if (onSaved) onSaved();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || 'Failed to save listing';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ marginBottom: 12 }}>{editingListing ? 'Edit Listing' : 'Create Listing'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
        <input name="title" placeholder="Title" value={form.title} onChange={handleChange} required />
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          required
        />
        <input name="category" placeholder="Category" value={form.category} onChange={handleChange} required />
        <input name="link" placeholder="Link" value={form.link} onChange={handleChange} required />
        <input
          name="tags"
          placeholder="Tags (comma separated)"
          value={form.tags}
          onChange={handleChange}
        />

        {error ? <p style={{ color: '#b00020', margin: 0 }}>{error}</p> : null}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : editingListing ? 'Update' : 'Create'}
          </button>
          {editingListing ? (
            <button
              type="button"
              onClick={() => {
                setForm(initialForm);
                if (onCancelEdit) onCancelEdit();
              }}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

export default ListingForm;
