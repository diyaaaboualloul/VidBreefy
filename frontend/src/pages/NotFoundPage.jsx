import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="error-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary btn-lg">
            Go Home
          </Link>
          <Link to="/summarize" className="btn btn-secondary btn-lg">
            Summarize a Video
          </Link>
        </div>
      </div>
    </div>
  );
}