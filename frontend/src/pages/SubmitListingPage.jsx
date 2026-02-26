import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const CATEGORIES = ['Crypto Tokens', 'Airdrops', 'Startups', 'AI Tools', 'Deals/Coupons'];

const initialForm = {
  title: '',
  description: '',
  category: CATEGORIES[0],
  link: '',
  tags: '',
  thumbnail: '',
};

function SubmitListingPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        link: form.link.trim(),
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        thumbnail: form.thumbnail.trim(),
      };

      await api.post('/api/submissions', payload);

      setSuccess('Submission received. Awaiting admin approval.');
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to submit idea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="submit-wrap">
      <section className="submit-card">
        <h1>Upload Your Idea</h1>
        <p>Share your product idea for moderation and approval.</p>

        <form className="submit-form" onSubmit={handleSubmit}>
          <input name="title" placeholder="Title" value={form.title} onChange={handleChange} required />

          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            required
          />

          <select name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <input name="link" placeholder="Link" value={form.link} onChange={handleChange} required />
          <input
            name="tags"
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={handleChange}
          />
          <input
            name="thumbnail"
            placeholder="Thumbnail URL (optional)"
            value={form.thumbnail}
            onChange={handleChange}
          />

          {success ? <p className="form-success">{success}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Idea'}</button>
        </form>

        <p className="inline-links">
          <Link to="/">Back to Public Dashboard</Link>
        </p>
      </section>
    </main>
  );
}

export default SubmitListingPage;