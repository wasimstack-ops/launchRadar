import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Rocket } from 'lucide-react';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const CATEGORIES = [
  'AI Tools',
  'Developer Tools',
  'Productivity',
  'Machine Learning',
  'LLMs & Chatbots',
  'AI Art & Design',
  'Data & Analytics',
  'Automation',
  'Startups',
  'Other',
];

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
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        link: form.link.trim(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        thumbnail: form.thumbnail.trim(),
      };
      await api.post('/api/submissions', payload);
      setSuccess(true);
      setForm(initialForm);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />

      <div className="submit-shell">
        <div className="submit-inner">
          <div className="submit-header">
            <p className="submit-eyebrow">
              <Rocket size={13} /> Submit a launch
            </p>
            <h1 className="submit-title">Share an AI product</h1>
            <p className="submit-sub">
              Spotted a great new AI tool? Submit it for review — approved listings are featured on the homepage.
            </p>
          </div>

          {success ? (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-md)',
              borderRadius: 'var(--r-lg)',
              padding: 40,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}>
              <CheckCircle size={40} style={{ color: 'var(--green)' }} strokeWidth={1.5} />
              <h2 style={{ fontSize: '1.375rem', fontWeight: 800 }}>Submission received!</h2>
              <p style={{ color: 'var(--text-2)', maxWidth: 380 }}>
                Thanks for contributing. Our team will review your submission and it'll appear on the site if approved.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSuccess(false)}>
                  Submit another
                </button>
                <Link to="/" className="btn btn-primary btn-sm">
                  Browse products <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="submit-card">
              <form className="submit-form" onSubmit={handleSubmit}>
                <div className="field-group">
                  <label htmlFor="title" className="field-label">Product name *</label>
                  <input
                    id="title" name="title" className="input"
                    placeholder="e.g. Perplexity AI"
                    value={form.title} onChange={handleChange} required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="description" className="field-label">Description *</label>
                  <textarea
                    id="description" name="description" className="input"
                    placeholder="What does this product do? What problem does it solve?"
                    value={form.description} onChange={handleChange} rows={4} required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="category" className="field-label">Category *</label>
                  <select
                    id="category" name="category" className="input-select"
                    value={form.category} onChange={handleChange}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="field-group">
                  <label htmlFor="link" className="field-label">Product URL *</label>
                  <input
                    id="link" name="link" className="input" type="url"
                    placeholder="https://example.com"
                    value={form.link} onChange={handleChange} required
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="tags" className="field-label">
                    Tags <span style={{ color: 'var(--text-3)' }}>(comma separated)</span>
                  </label>
                  <input
                    id="tags" name="tags" className="input"
                    placeholder="e.g. chatbot, search, productivity"
                    value={form.tags} onChange={handleChange}
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="thumbnail" className="field-label">
                    Thumbnail URL <span style={{ color: 'var(--text-3)' }}>(optional)</span>
                  </label>
                  <input
                    id="thumbnail" name="thumbnail" className="input" type="url"
                    placeholder="https://example.com/logo.png"
                    value={form.thumbnail} onChange={handleChange}
                  />
                </div>

                {error && <p className="form-error">{error}</p>}

                <div className="submit-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Submitting…' : (<>Submit for review <ArrowRight size={15} /></>)}
                  </button>
                  <Link to="/" className="btn btn-ghost">
                    <ArrowLeft size={14} /> Cancel
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default SubmitListingPage;