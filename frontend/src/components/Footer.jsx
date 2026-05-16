import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#14b8a6"/>
                <path d="M8 12L16 8L24 12V20L16 24L8 20V12Z" stroke="white" strokeWidth="2"/>
                <circle cx="16" cy="16" r="4" fill="white"/>
              </svg>
              <span>VidBreefy</span>
            </Link>
            <p className="footer-tagline">
              Summarize any YouTube video in seconds with AI.
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-section">
              <h4>Product</h4>
              <Link to="/summarize">Summarize</Link>
              <Link to="/#pricing">Pricing</Link>
              <Link to="/#features">Features</Link>
            </div>

            <div className="footer-section">
              <h4>Company</h4>
              <a href="mailto:info@5ostudios.com">Contact</a>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>

            <div className="footer-section">
              <h4>Connect</h4>
              <a href="https://twitter.com/vidbreefy" target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href="https://github.com/vidbreefy" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://discord.gg/vidbreefy" target="_blank" rel="noopener noreferrer">Discord</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} VidBreefy. All rights reserved.</p>
          <p className="footer-studio">
            Made with ⚡ by <a href="mailto:diyaa@5ostudios.com">Diyaa</a>
          </p>
        </div>
      </div>
    </footer>
  );
}