import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { summariesAPI } from '../api';
import { useToast } from '../hooks/useToast';
import LoadingSpinner from '../components/LoadingSpinner';
import './SummaryPage.css';

export default function SummaryPage() {
  const { hash } = useParams();
  const { success, error: showError, ToastComponent } = useToast();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (hash) {
      loadSummary();
    }
  }, [hash]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await summariesAPI.getByHash(hash);
      // Normalize API response to component field names
      const raw = res.data.summary;
      setSummary({
        title: raw.video_title,
        summary: raw.summary_text,
        url: raw.video_id ? `https://youtube.com/watch?v=${raw.video_id}` : null,
        format: raw.format_type,
        viewCount: raw.view_count,
        createdAt: raw.created_at,
        thumbnailUrl: raw.thumbnail_url,
        userEmail: raw.user_email,
      });
      // Increment view count
      summariesAPI.incrementView(hash).catch(() => {});
    } catch (err) {
      showError('Summary not found');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary?.summary) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary.summary);
      } else {
        // Fallback for HTTP context
        const ta = document.createElement('textarea');
        ta.value = summary.summary;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const getYoutubeThumbnail = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"[&\]]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` : null;
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!summary) {
    return (
      <div className="summary-page">
        <div className="container">
          <div className="error-state">
            <h1>Summary Not Found</h1>
            <p>This summary may have been deleted or the link is invalid.</p>
          </div>
        </div>
        <ToastComponent />
      </div>
    );
  }

  return (
    <div className="summary-page">
      {/* SEO */}
      <title>{summary.title || 'Video Summary'} | VidBreefy</title>
      <meta name="description" content={summary.summary?.slice(0, 160) || 'Watch this YouTube video summary on VidBreefy'} />
      <meta property="og:title" content={summary.title || 'Video Summary'} />
      <meta property="og:description" content={summary.summary?.slice(0, 200) || 'Video summary'} />
      {summary.url && <meta property="og:image" content={`https://img.youtube.com/vi/${getYoutubeThumbnail(summary.url)?.split('/').pop()}/maxresdefault.jpg`} />}
      <meta property="og:type" content="article" />
      <link rel="canonical" href={`https://vidbreefy.com/summary/${hash}`} />

      <div className="container">
        <div className="summary-card">
          {/* Video Info */}
          {summary.url && (
            <div className="summary-video">
              <img 
                src={getYoutubeThumbnail(summary.url)} 
                alt={summary.title || 'Video thumbnail'}
                className="video-thumbnail"
              />
              <a href={summary.url} target="_blank" rel="noopener noreferrer" className="watch-btn">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 4L16 10L4 16V4Z" fill="currentColor"/>
                </svg>
                Watch on YouTube
              </a>
            </div>
          )}

          <div className="summary-content">
            <h1>{summary.title || 'Video Summary'}</h1>
            
            <div className="summary-meta">
              <span className="format-badge">{summary.format?.toUpperCase() || 'SHORT'}</span>
              {summary.viewCount !== undefined && (
                <span className="view-count">{summary.viewCount} views</span>
              )}
              {summary.createdAt && (
                <span className="date">{new Date(summary.createdAt).toLocaleDateString()}</span>
              )}
            </div>

            <div className="summary-text">
              <p>{summary.summary}</p>
            </div>

            <div className="summary-actions">
              <button className="btn btn-primary" onClick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy Summary'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": summary.title || 'Video Summary',
        "text": summary.summary,
        "datePublished": summary.createdAt,
        "viewCount": summary.viewCount
      }) }} />

      <ToastComponent />
    </div>
  );
}