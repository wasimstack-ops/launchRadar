import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link to="/" className="footer-logo">
          <span className="footer-logo-icon">
            <Zap size={12} />
          </span>
          LaunchRadar
        </Link>

        <div className="footer-links">
          <Link to="/" className="footer-link">Products</Link>
          <Link to="/submit" className="footer-link">Submit</Link>
          <Link to="/auth" className="footer-link">Sign In</Link>
        </div>

        <p className="footer-copy">
          © {year} LaunchRadar · Powered by Product Hunt API
        </p>
      </div>
    </footer>
  );
}

export default Footer;
