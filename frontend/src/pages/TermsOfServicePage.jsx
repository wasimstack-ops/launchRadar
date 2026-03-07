import { Helmet } from 'react-helmet-async';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

function TermsOfServicePage() {
  return (
    <div>
      <Helmet>
        <title>Terms of Service | wayb</title>
        <meta name="description" content="Terms of service for wayb." />
      </Helmet>

      <Navbar />

      <main className="legal-shell">
        <div className="legal-inner">
          <span className="legal-kicker">Legal</span>
          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-lead">
            These terms govern access to and use of wayb, including idea scoring, rankings, and product discovery
            features.
          </p>

          <section className="legal-card">
            <h2>Use of the platform</h2>
            <p>
              You may use wayb for lawful business and research purposes. You are responsible for the accuracy of the
              information you submit and for maintaining the security of your account.
            </p>
          </section>

          <section className="legal-card">
            <h2>Generated analysis</h2>
            <p>
              Idea reports, scores, and recommendations are informational tools. They are not investment, legal, or
              financial advice and should not be treated as guarantees of business outcomes.
            </p>
          </section>

          <section className="legal-card">
            <h2>Accounts and access</h2>
            <p>
              We may suspend access for abuse, fraud, excessive automated usage, or actions that degrade platform
              reliability for other users.
            </p>
          </section>

          <section className="legal-card">
            <h2>Updates</h2>
            <p>
              The product and these terms may evolve over time. Continued use of wayb after updates means you accept
              the latest version published on the site.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default TermsOfServicePage;
