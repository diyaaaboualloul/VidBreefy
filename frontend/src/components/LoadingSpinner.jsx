import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 'md', fullScreen = false }) {
  const sizeClass = `spinner-${size}`;
  
  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className={`loading-spinner ${sizeClass}`}>
          <div className="spinner-circle"></div>
        </div>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className={`loading-spinner ${sizeClass}`}>
      <div className="spinner-circle"></div>
    </div>
  );
}