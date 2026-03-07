import { Helmet } from 'react-helmet-async';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

function PrivacyPolicyPage() {
  return (
    <div>
      <Helmet>
        <title>Privacy Policy | wayb</title>
        <meta name="description" content="Privacy policy for wayb." />
      </Helmet>

      <Navbar />

      <main className="legal-shell">
        <div className="legal-inner">
          <span className="legal-kicker">Legal</span>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-lead">
            This page explains the core data we collect to operate wayb and how that information is used.
          </p>

          <section className="legal-card">
            <h2>Information we collect</h2>
            <p>
              We collect account details you provide directly, such as your name and email address, and platform data
              needed to operate the product, including submitted ideas, generated reports, saved preferences, and
              subscription status.
            </p>
          </section>

          <section className="legal-card">
            <h2>How we use it</h2>
            <p>
              We use this information to authenticate your account, generate idea reports, maintain rankings,
              deliver platform updates, and improve product quality and reliability.
            </p>
          </section>

          <section className="legal-card">
            <h2>Data sharing</h2>
            <p>
              We do not sell personal information. Data may be processed by infrastructure, analytics, or AI service
              providers strictly for product operation.
            </p>
          </section>

          <section className="legal-card">
            <h2>Contact</h2>
            <p>
              If you need changes to your data or have privacy questions, use the email address associated with your
              wayb account when contacting the team.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PrivacyPolicyPage;
