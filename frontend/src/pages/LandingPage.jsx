import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicContentAPI } from '../api';
import './LandingPage.css';

export default function LandingPage() {
  const [faqItems, setFaqItems] = useState([]);

  useEffect(() => {
    // Load FAQ from backend settings
    publicContentAPI.getContent('faq')
      .then(res => {
        if (res.data?.faq) {
          setFaqItems(res.data.faq);
        }
      })
      .catch(() => {
        // Use hardcoded FAQ as fallback
        setFaqItems([
          { q: 'How does VidBreefy work?', a: 'Paste any YouTube URL, and our AI extracts the key points to create a concise summary.' },
          { q: 'What formats are available?', a: 'Choose from TL;DR (quick overview), Short (detailed points), or Detailed (comprehensive analysis).' },
          { q: 'How many videos can I summarize free?', a: 'Free users get 3 summaries per day. Pro members enjoy unlimited summaries.' },
          { q: 'Can I save my summaries?', a: 'Yes! Create a free account to save your summary history and bookmark important videos.' },
          { q: 'What is the Chrome extension?', a: 'Our browser extension lets you summarize videos without leaving YouTube. Available for Pro users.' },
          { q: 'Can I share summaries with others?', a: 'Absolutely! Every summary gets a unique link you can share with anyone.' },
          { q: 'Which AI models are supported?', a: 'Free users get Groq. Pro users access GPT-4, Claude, Gemini, and other premium models.' },
          { q: 'How do I cancel my subscription?', a: 'You can cancel anytime from your dashboard settings. No questions asked.' },
        ]);
      });
  }, []);

  const testimonials = [
    { name: 'Sarah Chen', role: 'Content Creator', quote: "VidBreefy saves me hours every week. I can quickly check video content before deciding what to watch fully." },
    { name: 'Marcus Johnson', role: 'Research Analyst', quote: "The detailed summaries are incredibly accurate. It's become essential for my research workflow." },
    { name: 'Emily Rodriguez', role: 'Product Manager', quote: "Pro subscription pays for itself. The AI quality is top-notch and the Chrome extension is so convenient." },
  ];

  return (
    <div className="landing-page">
      {/* SEO */}
      <title>VidBreefy - AI YouTube Video Summarizer | Summarize Any Video in Seconds</title>
      <meta name="description" content="Summarize any YouTube video in seconds with AI. Get quick TL;DR, Short, or Detailed summaries. Try VidBreefy free today!" />
      <meta property="og:title" content="VidBreefy - AI YouTube Video Summarizer" />
      <meta property="og:description" content="Summarize any YouTube video in seconds with AI. Get quick summaries in TL;DR, Short, or Detailed formats." />
      <meta property="og:type" content="website" />
      <link rel="canonical" href="https://vidbreefy.com" />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          {/* Animated Logo */}
          <div className="hero-logo">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <rect width="80" height="80" rx="20" fill="#14b8a6" fillOpacity="0.1"/>
              <rect x="8" y="8" width="64" height="64" rx="16" fill="#14b8a6"/>
              <path d="M32 28L52 40L32 52V28Z" fill="white" fillOpacity="0.9"/>
              <circle cx="52" cy="40" r="6" fill="white" fillOpacity="0.6"/>
            </svg>
          </div>

          {/* Headline */}
          <h1 className="hero-title">
            Don't watch for hours.<br/>Know everything in seconds.
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle">
            Paste any YouTube URL and get the key points instantly. 
            No more watching hours — just read what matters, when you want.
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta">
            <Link to="/summarize" className="btn btn-primary btn-lg">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2V14M10 14L6 10M10 14L14 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="2" y="16" width="16" height="2" rx="1" fill="currentColor"/>
              </svg>
              Summarize a Video
            </Link>
            <Link to="/register" className="btn btn-secondary btn-lg">
              Get Started Free
            </Link>
          </div>

          {/* 3-Step Flow */}
          <div className="hero-steps">
            <div className="step">
              <div className="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M13 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 13L11 16L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 4L20 4L20 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Paste URL</span>
            </div>
            <div className="step-arrow">
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
                <path d="M0 12H44M44 12L36 4M44 12L36 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="step">
              <div className="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span>AI Analyzes</span>
            </div>
            <div className="step-arrow">
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
                <path d="M0 12H44M44 12L36 4M44 12L36 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="step">
              <div className="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12H15M9 8H15M9 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <span>Get Summary</span>
            </div>
          </div>

          {/* Stats */}
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">3</div>
              <div className="stat-label">Free summaries daily</div>
            </div>
            <div className="stat">
              <div className="stat-number">3</div>
              <div className="stat-label">Output formats</div>
            </div>
            <div className="stat">
              <div className="stat-number">10x</div>
              <div className="stat-label">Faster than watching</div>
            </div>
          </div>

          {/* Hero Image from Gemini */}
          <div className="hero-image-container">
            <img 
              src="/hero-image.png" 
              alt="VidBreefy - AI YouTube Video Summarizer" 
              className="hero-image"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <h2 className="section-title">Everything you need to digest video content</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="12" stroke="#14b8a6" strokeWidth="2"/>
                  <path d="M12 16L15 19L21 13" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>AI-Powered Summaries</h3>
              <p>Advanced AI extracts the most important points from any YouTube video. Accurate, fast, and reliable.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="4" width="24" height="24" rx="4" stroke="#14b8a6" strokeWidth="2"/>
                  <path d="M10 16H22M10 12H22M10 20H18" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>3 Summary Formats</h3>
              <p>TL;DR for quick overviews, Short for key points, or Detailed for comprehensive analysis.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="6" width="24" height="20" rx="3" stroke="#14b8a6" strokeWidth="2"/>
                  <circle cx="16" cy="16" r="4" stroke="#14b8a6" strokeWidth="2"/>
                  <circle cx="16" cy="16" r="1" fill="#14b8a6"/>
                </svg>
              </div>
              <h3>Chrome Extension</h3>
              <p>Summarize videos without leaving YouTube. One click to get the full picture.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M20 6H26C27.1046 6 28 6.89543 28 8V24C28 25.1046 27.1046 26 26 26H6C4.89543 26 4 25.1046 4 24V8C4 6.89543 4.89543 6 6 6H14" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M12 12L16 16L24 8" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Shareable Links</h3>
              <p>Every summary gets a unique link you can share with teammates, friends, or on social media.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing" id="pricing">
        <div className="container">
          <h2 className="section-title">Simple, transparent pricing</h2>
          <div className="pricing-grid">
            {/* Free Plan */}
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Free</h3>
                <div className="pricing-price">
                  <span className="price-amount">$0</span>
                  <span className="price-period">/month</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6 11L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  3 summaries per day
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6 11L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Groq AI model only
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6 11L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Ad-supported experience
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6 11L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  50 history items
                </li>
                <li className="feature-disabled">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4L12 12M12 4L4 12" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Chrome extension
                </li>
              </ul>
              <Link to="/register" className="btn btn-secondary btn-lg">
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="pricing-card pricing-card-pro">
              <div className="pricing-badge">MOST POPULAR</div>
              <div className="pricing-header">
                <h3>Pro</h3>
                <div className="pricing-price">
                  <span className="price-amount">$7</span>
                  <span className="price-period">/month</span>
                </div>
              </div>
              <ul className="pricing-features">
                <li>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6 11L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Unlimited summaries
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6 11L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  All AI models (GPT-4, Claude, Gemini)
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6 11L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Ad-free experience
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6 11L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Unlimited history
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6 11L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Chrome extension
                </li>
              </ul>
              <Link to="/register?pro=true" className="btn btn-primary btn-lg">
                Start Pro Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Chrome Extension CTA */}
      <section className="extension-cta">
        <div className="container">
          <div className="extension-content">
            <div className="extension-left">
              <div className="extension-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="12" fill="#14b8a6" fillOpacity="0.15"/>
                  <path d="M24 14V28M24 28L18 22M24 28L30 22" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="14" y="32" width="20" height="3" rx="1.5" fill="#14b8a6"/>
                </svg>
              </div>
              <div>
                <h2>Get the VidBreefy Chrome Extension</h2>
                <p className="extension-desc">Summarize any YouTube video without leaving the page. One click and you have the full summary.</p>
                <div className="extension-features">
                  <span>✓ Works on any YouTube video</span>
                  <span>✓ One-click summarize</span>
                  <span>✓ Copy & share instantly</span>
                </div>
                <a 
                  href="/vidbreefy-extension.zip" 
                  download
                  className="btn btn-primary btn-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open('http://142.132.189.59:3001/../tmp/vidbreefy-extension.zip', '_blank');
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 3V13M10 13L6 9M10 13L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 17H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Download Extension
                </a>
              </div>
            </div>
            <div className="extension-right">
              <div className="install-guide">
                <h4>How to Install</h4>
                <ol>
                  <li>
                    <span className="step-num">1</span>
                    <span>Download the extension zip above</span>
                  </li>
                  <li>
                    <span className="step-num">2</span>
                    <span>Open Chrome → <code>chrome://extensions/</code></span>
                  </li>
                  <li>
                    <span className="step-num">3</span>
                    <span>Toggle <strong>Developer mode</strong> (top right)</span>
                  </li>
                  <li>
                    <span className="step-num">4</span>
                    <span>Click <strong>Load unpacked</strong> → select the unzipped folder</span>
                  </li>
                  <li>
                    <span className="step-num">5</span>
                    <span>Click the VidBreefy icon in Chrome toolbar → Summarize!</span>
                  </li>
                </ol>
                <p className="chrome-note">* Currently requires Chrome. Firefox/Edge support coming soon.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq">
        <div className="container">
          <h2 className="section-title">Frequently asked questions</h2>
          <div className="faq-list">
            {faqItems.map((item, index) => (
              <details key={index} className="faq-item">
                <summary>
                  <span>{item.q}</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <div className="container">
          <h2 className="section-title">Loved by content creators everywhere</h2>
          <div className="testimonials-grid">
            {testimonials.map((item, index) => (
              <div key={index} className="testimonial-card">
                <p className="testimonial-quote">"{item.quote}"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">
                    {item.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="author-name">{item.name}</p>
                    <p className="author-role">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to save time?</h2>
            <p>Join thousands of creators who trust VidBreefy for video summaries.</p>
            <Link to="/summarize" className="btn btn-primary btn-lg">
              Try VidBreefy Free
            </Link>
          </div>
        </div>
      </section>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "VidBreefy",
        "description": "AI-powered YouTube video summarizer that extracts key points in seconds.",
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "7",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "RecurringChargeSpecification",
            "billingDuration": "P1M"
          }
        }
      }) }} />
    </div>
  );
}