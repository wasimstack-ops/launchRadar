import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

function CommunityPage() {
  return (
    <div>
      <Helmet>
        <title>Community | wayb</title>
        <meta
          name="description"
          content="Explore the wayb community hub for builders, ranked ideas, and product intelligence."
        />
      </Helmet>

      <Navbar />

      <main className="legal-shell">
        <div className="legal-inner">
          <span className="legal-kicker">Community</span>
          <h1 className="legal-title">Build with the wayb network.</h1>
          <p className="legal-lead">
            wayb is built for founders, operators, and early-stage teams who want sharper signals before they commit
            to building. Use the platform to compare ideas, track launches, and understand what is gaining traction.
          </p>

          <section className="legal-card">
            <h2>Where to start</h2>
            <p>These are the parts of the platform that are live and useful today.</p>
            <div className="legal-links-grid">
              <Link to="/" className="legal-link-card">
                <strong>Product Directory</strong>
                <span>Browse launches, trending products, and daily signals.</span>
              </Link>
              <Link to="/leaderboard" className="legal-link-card">
                <strong>Global Leaderboard</strong>
                <span>See how scored ideas rank across the platform.</span>
              </Link>
              <Link to="/?compose=1" className="legal-link-card">
                <strong>Score Your Idea</strong>
                <span>Generate an investor-style report and compare against other builders.</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CommunityPage;
