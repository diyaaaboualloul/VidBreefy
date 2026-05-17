import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { summariesAPI, aiAPI } from '../api';
import { useToast } from '../hooks/useToast';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import './SummarizePage.css';

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;

export default function SummarizePage() {
  const { user, isPro } = useAuth();
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('short');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [dailyCount, setDailyCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExtensionFallback, setShowExtensionFallback] = useState(false);
  const { success, error: showError, ToastComponent } = useToast();
  const navigate = useNavigate();

  // Load daily count for guests
  useEffect(() => {
    if (!user) {
      const stored = localStorage.getItem('vidbreefy_daily_count');
      const today = new Date().toISOString().split('T')[0];
      if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today) {
          setDailyCount(data.count);
        }
      }
    }
  }, [user]);

  const canSummarize = user || dailyCount < 3;

  const handlePaste = useCallback((e) => {
    setTimeout(() => {
      if (YOUTUBE_REGEX.test(url)) {
        setError('');
      }
    }, 0);
  }, [url]);

  const handleUrlChange = (e) => {
    const value = e.target.value;
    setUrl(value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setStreamingContent('');
    setShowExtensionFallback(false);

    if (!YOUTUBE_REGEX.test(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    if (!canSummarize) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    setIsStreaming(true);

    try {
      // Step 1: Get video info + transcript from backend
      const res = await summariesAPI.create({ url, format });
      setResult(res.data);

      if (!res.data.transcript) {
        setShowExtensionFallback(true);
        setIsStreaming(false);
        setLoading(false);
        return;
      }

      // Step 2: Stream AI summary using the transcript
      const videoTitle = res.data.video_title || getVideoTitle();
      const streamRes = await aiAPI.stream({
        action: 'summarize',
        transcript: res.data.transcript,
        videoTitle,
        isGuest: !user,
      });

      const reader = streamRes.data.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              setStreamingContent(fullText);
            }
          } catch (_) {}
        }
      }

      setStreamingContent(fullText);
      success('Summary ready!');

      if (!user) {
        const today = new Date().toISOString().split('T')[0];
        const newCount = dailyCount + 1;
        localStorage.setItem('vidbreefy_daily_count', JSON.stringify({ date: today, count: newCount }));
        setDailyCount(newCount);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to summarize video';
      setError(msg);
      const transcriptFail =
        msg.toLowerCase().includes('transcript') ||
        msg.toLowerCase().includes('caption') ||
        msg.toLowerCase().includes('subtitle') ||
        err.response?.status === 500;
      if (transcriptFail) {
        setResult(null);
        setStreamingContent('');
        setShowExtensionFallback(true);
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleCopy = async () => {
    const text = streamingContent || result?.summary || '';
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  function formatMarkdown(text) {
    if (!text) return '';
    text = text.replace(/\*\*(.*?)\b/g, '<strong>$1</strong>');
    text = text.replace(/^### (.+)$/gm, '<div class="result-section-title">$1</div>');
    text = text.replace(/^## (.+)$/gm, '<div class="result-section-title">$1</div>');
    text = text.replace(/^[\-\*•] (.+)$/gm, '<div class="result-bullet">$1</div>');
    text = text.replace(/^\d+\. (.+)$/gm, '<div class="result-bullet">$1</div>');
    text = text.replace(/\n\n/g, '</p><p style="margin-top:8px">');
    text = text.replace(/\n/g, '<br/>');
    return text;
  }

  const handleShare = () => {
    if (result?.shareHash) {
      const shareUrl = `${window.location.origin}/summary/${result.shareHash}`;
      navigator.clipboard.writeText(shareUrl);
      success('Share link copied!');
    }
  };

  const getYoutubeId = (url) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"[&\]]+)/);
    return match ? match[1] : null;
  };

  const getYoutubeThumbnail = (url) => {
    const id = getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
  };

  const getVideoTitle = () => {
    if (result?.title) return result.title;
    const id = getYoutubeId(url);
    return id ? `YouTube Video` : 'Video Summary';
  };

  return (
    <div className="summarize-page">
      <div className="container">
        <div className="summarize-header">
          <h1>Summarize a Video</h1>
          <p>Enter any YouTube URL to get an AI-powered summary</p>
        </div>

        {/* Info Banner */}
        <div className="info-banner">
          <span className="info-icon">💡</span>
          <div>
            <strong>How it works:</strong> Paste a YouTube URL → We extract the transcript → AI summarizes it → You get the key points in seconds.
            <span className="info-note"> Videos with auto-generated captions work best. ~30-40% of videos may need the <a href="/vidbreefy-extension.zip" download style={{color:'inherit'}}>VidBreefy Extension</a> for manual transcripts.</span>
          </div>
        </div>

        <form className="summarize-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <div className="input-label-row">
              <label className="label">YouTube URL</label>
              <span className="input-hint">Supports: youtube.com/watch, youtu.be, youtube.com/embed</span>
            </div>
            <input
              type="url"
              value={url}
              onChange={handleUrlChange}
              onPaste={handlePaste}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`input ${error ? 'input-error' : ''}`}
              disabled={loading}
            />
            {error && <p className="error-text">{error}</p>}
            <p className="input-hint" style={{marginTop: '4px', color: '#94a3b8', fontSize: '12px'}}>
              Video must have English captions/subtitles for best results
            </p>
          </div>

          <div className="format-toggle">
            <div className="format-label-row">
              <label className="label">Summary Format</label>
              <div className="format-hint">
                <span className="hint-icon" title="TL;DR = 1-2 sentences, Short = paragraph, Detailed = sections with timestamps">ℹ️</span>
              </div>
            </div>
            <div className="toggle-buttons">
              <button
                type="button"
                className={`toggle-btn ${format === 'tldr' ? 'active' : ''}`}
                onClick={() => setFormat('tldr')}
                disabled={loading}
              >
                <span className="format-name">TL;DR</span>
                <span className="format-desc">1-2 sentences</span>
              </button>
              <button
                type="button"
                className={`toggle-btn ${format === 'short' ? 'active' : ''}`}
                onClick={() => setFormat('short')}
                disabled={loading}
              >
                <span className="format-name">Short</span>
                <span className="format-desc">3-5 sentences</span>
              </button>
              <button
                type="button"
                className={`toggle-btn ${format === 'detailed' ? 'active' : ''}`}
                onClick={() => setFormat('detailed')}
                disabled={loading}
              >
                <span className="format-name">Detailed</span>
                <span className="format-desc">With timestamps</span>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary btn-lg summarize-btn ${loading ? 'loading' : ''}`}
            disabled={loading || !url}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Analyzing video...</span>
              </>
            ) : (
              <>
                <span>Summarize Video</span>
                {!user && dailyCount >= 3 && (
                  <span className="btn-warning-icon" title="Daily limit reached">⚠️</span>
                )}
              </>
            )}
          </button>

          {!url && (
            <a
              href="https://chrome.google.com/webstore/detail/vidbreefy/becjajmdehionlpcgmhnmbpgmhkhdgoh"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-extension-hint"
            >
              Install VidBreefy Extension for better transcript extraction
            </a>
          )}

          {!user && (
            <div className="daily-limit-info">
              <span className={`limit-badge ${dailyCount >= 3 ? 'reached' : ''}`}>
                {dailyCount >= 3 ? '❌ Limit reached' : `✅ ${3 - dailyCount} free summaries left today`}
              </span>
              {dailyCount >= 3 ? (
                <p className="limit-message">
                  <a onClick={() => navigate('/register')} style={{color: '#14b8a6', cursor: 'pointer', textDecoration: 'underline'}}>Sign up free</a> for unlimited summaries
                </p>
              ) : (
                <p className="limit-message">
                  <a onClick={() => navigate('/login')} style={{color: '#14b8a6', cursor: 'pointer', textDecoration: 'underline'}}>Sign in</a> for more • 
                  <a onClick={() => navigate('/pricing')} style={{color: '#14b8a6', cursor: 'pointer', textDecoration: 'underline'}}> Upgrade to Pro</a> for unlimited
                </p>
              )}
            </div>
          )}

          {user && !isPro && (
            <div className="pro-upgrade-hint">
              <span>✨ You have unlimited summaries!</span>
              <a onClick={() => navigate('/dashboard')} style={{color: '#14b8a6', marginLeft: '8px', cursor: 'pointer', textDecoration: 'underline'}}>View dashboard →</a>
            </div>
          )}
        </form>

        {/* Extension Fallback — when transcript fails */}
        {showExtensionFallback && (
          <div className="extension-fallback animate-slideUp">
            <div className="fallback-icon">🎬</div>
            <div className="fallback-content">
              <h3>This video needs the VidBreefy Extension</h3>
              <p>
                The video doesn't have auto-generated captions, so our website can't extract the transcript.
                The VidBreefy Extension reads captions directly from YouTube for better accuracy.
              </p>
              <div className="fallback-actions">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Open in YouTube
                </a>
                <a
                  href="/vidbreefy-extension.zip"
                  download
                  className="btn btn-secondary"
                >
                  Download Extension
                </a>
              </div>
              <p className="fallback-note">
                Install the extension → go to the YouTube video → click VidBreefy icon
              </p>
            </div>
          </div>
        )}

        {/* AdSense for non-pro users */}
        {!user && !isPro && (
          <div className="adsense-container">
            <ins 
              className="adsbygoogle"
              style={{ display: 'block', width: '100%', height: '100px' }}
              data-ad-client="ca-pub-xxxxxxxxxx"
              data-ad-slot="xxxxxxxxxx"
              data-ad-format="horizontal"
            />
            <p className="ads-hint">Ads help support the service • <a onClick={() => navigate('/pricing')} style={{color: '#14b8a6', cursor: 'pointer'}}>Go Pro to remove ads</a></p>
          </div>
        )}

        {(result || streamingContent) && !showExtensionFallback && (
          <div className="result-container animate-slideUp">
            <div className="result-header">
              {getYoutubeThumbnail(url) && (
                <img
                  src={getYoutubeThumbnail(url)}
                  alt={getVideoTitle()}
                  className="video-thumbnail"
                />
              )}
              <div className="result-info">
                <h2>{getVideoTitle()}</h2>
                <div className="result-meta">
                  <span className="format-badge">SUMMARY</span>
                  {result?.createdAt && (
                    <span className="date">
                      {new Date(result.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="result-summary streaming-result">
              {isStreaming && <span className="streaming-cursor"></span>}
              <div className="result-summary streaming-result" dangerouslySetInnerHTML={{ __html: formatMarkdown(streamingContent || result?.summary || '') }} />
            </div>

            <div className="result-actions">
              <button className="btn btn-secondary" onClick={handleCopy}>
                {copied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8L6 11L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M3 11V3C3 2.44772 3.44772 2 4 2H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Copy
                  </>
                )}
              </button>
              
              {result.shareHash && (
                <button className="btn btn-secondary" onClick={handleShare}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6 7L10 5M6 9L10 11" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  Share
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal for guests or when limit reached */}
      <Modal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign up to continue"
        size="sm"
      >
        <div className="auth-modal-content">
          <p>Create a free account or sign in to summarize more videos.</p>
          <div className="auth-modal-actions">
            <button 
              className="btn btn-primary btn-lg"
              onClick={() => { setShowAuthModal(false); navigate('/register'); }}
            >
              Create Account
            </button>
            <button 
              className="btn btn-secondary btn-lg"
              onClick={() => { setShowAuthModal(false); navigate('/login'); }}
            >
              Sign In
            </button>
          </div>
        </div>
      </Modal>

      <ToastComponent />
    </div>
  );
}