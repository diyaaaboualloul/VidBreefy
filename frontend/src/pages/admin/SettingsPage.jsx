import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/LoadingSpinner';
import './AdminPage.css';

export default function SettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { success, error: showError, ToastComponent } = useToast();
  const [settings, setSettings] = useState({
    siteName: '',
    contactEmail: '',
    twitter: '',
    github: '',
    discord: '',
    metaTitle: '',
    metaDescription: ''
  });
  const [apiKeys, setApiKeys] = useState({
    groq: { key: '', configured: false },
    openai: { key: '', configured: false },
    gemini: { key: '', configured: false },
    youtube: { key: '', configured: false },
    paddleVendorId: '',
    paddleWebhookKey: '',
    adsenseId: ''
  });
  const [youtubeInput, setYoutubeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    }
  }, [isAdmin]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSettings();
      setSettings(res.data);
      // Load API keys from env check (frontend can't see backend env, so show placeholder status)
      // Check YouTube API key status from backend settings
      let youtubeConfigured = false;
      if (res.data.youtube_data_api_key) {
        youtubeConfigured = true;
        setYoutubeInput('***configured***');
      }
      setApiKeys({
        groq: { key: localStorage.getItem('groq_configured') === 'true' ? '***configured***' : '', configured: localStorage.getItem('groq_configured') === 'true' },
        openai: { key: '', configured: false },
        gemini: { key: '', configured: false },
        youtube: { key: youtubeConfigured ? '***configured***' : '', configured: youtubeConfigured },
        paddleVendorId: res.data.paddleVendorId || '',
        paddleWebhookKey: res.data.paddleWebhookKey || '',
        adsenseId: res.data.adsenseId || ''
      });
    } catch (err) {
      showError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      success('Settings updated');
    } catch (err) {
      showError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleYoutubeKeySave = async () => {
    if (!youtubeInput || youtubeInput === '***configured***') return;
    try {
      await adminAPI.saveYoutubeKey(youtubeInput);
      setApiKeys(p => ({ ...p, youtube: { key: '***configured***', configured: true } }));
      setYoutubeInput('***configured***');
      success('YouTube API key saved!');
    } catch (err) {
      showError('Failed to save YouTube API key');
    }
  };

  if (authLoading || !isAdmin) return <LoadingSpinner fullScreen />;

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Settings</h1>
        </div>

        <div className="admin-nav">
          <Link to="/admin/users" className="nav-link">Users</Link>
          <Link to="/admin/ai-models" className="nav-link">AI Models</Link>
          <Link to="/admin/pricing" className="nav-link">Pricing</Link>
          <Link to="/admin/settings" className="nav-link active">Settings</Link>
          <Link to="/admin/content" className="nav-link">Content</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/audit-log" className="nav-link">Audit Log</Link>
          <Link to="/admin/trash" className="nav-link">Trash</Link>
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            {/* API Configuration Section */}
            <div className="settings-section">
              <div className="section-header">
                <h3>🔑 API Configuration</h3>
                <span className="section-hint">Configure your API keys in the backend .env file</span>
              </div>

              <div className="api-keys-grid">
                {/* Groq */}
                <div className="api-key-card">
                  <div className="api-key-header">
                    <span className="api-provider">Groq</span>
                    <span className={`api-status ${apiKeys.groq.configured ? 'configured' : 'missing'}`}>
                      {apiKeys.groq.configured ? '✅ Configured' : '⚠️ Not Set'}
                    </span>
                  </div>
                  <div className="api-key-info">
                    <p><strong>Used for:</strong> Default AI summarization</p>
                    <p><strong>Get free key:</strong> <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">console.groq.com</a></p>
                    <p><strong>Cost:</strong> FREE — generous daily limit</p>
                  </div>
                  <div className="api-key-hint">
                    Add to <code>/vidbreefy/backend/.env</code>: <code>GROQ_API_KEY=your_key_here</code>
                  </div>
                </div>

                {/* OpenAI */}
                <div className="api-key-card">
                  <div className="api-key-header">
                    <span className="api-provider">OpenAI</span>
                    <span className={`api-status ${apiKeys.openai.configured ? 'configured' : 'missing'}`}>
                      {apiKeys.openai.configured ? '✅ Configured' : '⚠️ Not Set'}
                    </span>
                  </div>
                  <div className="api-key-info">
                    <p><strong>Used for:</strong> GPT-4o, GPT-4o-mini models</p>
                    <p><strong>Get key:</strong> <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a></p>
                    <p><strong>Cost:</strong> Pay per use (~$$0.01/summary)</p>
                  </div>
                  <div className="api-key-hint">
                    Add to <code>.env</code>: <code>OPENAI_API_KEY=sk-...</code>
                  </div>
                </div>

                {/* Gemini */}
                <div className="api-key-card">
                  <div className="api-key-header">
                    <span className="api-provider">Google Gemini</span>
                    <span className={`api-status ${apiKeys.gemini.configured ? 'configured' : 'missing'}`}>
                      {apiKeys.gemini.configured ? '✅ Configured' : '⚠️ Not Set'}
                    </span>
                  </div>
                  <div className="api-key-info">
                    <p><strong>Used for:</strong> Gemini 1.5 models</p>
                    <p><strong>Get key:</strong> <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com</a></p>
                    <p><strong>Cost:</strong> FREE tier available</p>
                  </div>
                  <div className="api-key-hint">
                    Add to <code>.env</code>: <code>GEMINI_API_KEY=...</code>
                  </div>
                </div>

                {/* YouTube */}
                <div className="api-key-card">
                  <div className="api-key-header">
                    <span className="api-provider">YouTube Data API</span>
                    <span className={`api-status ${apiKeys.youtube.configured ? 'configured' : 'missing'}`}>
                      {apiKeys.youtube.configured ? '✅ Configured' : '⚠️ Not Set'}
                    </span>
                  </div>
                  <div className="api-key-info">
                    <p><strong>Used for:</strong> Transcript fallback (if youtube-transcript-api fails)</p>
                    <p><strong>Get key:</strong> <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></p>
                    <p><strong>Cost:</strong> FREE — 10,000 units/day</p>
                  </div>
                  <div className="api-key-hint">
                    {apiKeys.youtube.configured ? (
                      <span style={{color: 'var(--color-primary)', fontWeight: 600}}>✅ YouTube API Key configured</span>
                    ) : (
                      <>
                        <div className="form-group" style={{marginTop: '8px'}}>
                          <input
                            type="password"
                            className="input"
                            value={youtubeInput}
                            onChange={(e) => setYoutubeInput(e.target.value)}
                            placeholder="Paste YouTube Data API key..."
                            style={{fontSize: '12px'}}
                          />
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={handleYoutubeKeySave} style={{marginTop: '6px'}}>
                          Save YouTube Key
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Paddle */}
                <div className="api-key-card">
                  <div className="api-key-header">
                    <span className="api-provider">Paddle</span>
                    <span className={`api-status ${apiKeys.paddleVendorId ? 'configured' : 'missing'}`}>
                      {apiKeys.paddleVendorId ? '✅ Configured' : '⚠️ Not Set'}
                    </span>
                  </div>
                  <div className="api-key-info">
                    <p><strong>Used for:</strong> Pro subscription payments ($7/month)</p>
                    <p><strong>Your account:</strong> Already have it (sells WordPress plugin)</p>
                    <p><strong>Find keys:</strong> vendors.paddle.com → Authentication</p>
                  </div>
                  <div className="form-group">
                    <label className="label">Vendor ID</label>
                    <input type="text" value={apiKeys.paddleVendorId} onChange={(e) => setApiKeys(p => ({ ...p, paddleVendorId: e.target.value }))} className="input" placeholder="vendor_12345" />
                  </div>
                  <div className="form-group">
                    <label className="label">Webhook Key</label>
                    <input type="password" value={apiKeys.paddleWebhookKey} onChange={(e) => setApiKeys(p => ({ ...p, paddleWebhookKey: e.target.value }))} className="input" placeholder="..." />
                  </div>
                </div>

                {/* AdSense */}
                <div className="api-key-card">
                  <div className="api-key-header">
                    <span className="api-provider">Google AdSense</span>
                    <span className={`api-status ${apiKeys.adsenseId ? 'configured' : 'pending'}`}>
                      {apiKeys.adsenseId ? '✅ Configured' : '⏳ Pending Approval'}
                    </span>
                  </div>
                  <div className="api-key-info">
                    <p><strong>Used for:</strong> Show ads on Free tier (you earn money)</p>
                    <p><strong>Get ID:</strong> <a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer">google.com/adsense</a></p>
                    <p><strong>Approval:</strong> Takes 1-2 weeks. Ads show after approval.</p>
                  </div>
                  <div className="form-group">
                    <label className="label">Publisher ID</label>
                    <input type="text" value={apiKeys.adsenseId} onChange={(e) => setApiKeys(p => ({ ...p, adsenseId: e.target.value }))} className="input" placeholder="pub-xxxxxxxxxxxx" />
                  </div>
                </div>
              </div>
            </div>

            {/* General Settings */}
            <div className="settings-section">
              <h3>🌐 General Settings</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label className="label">
                    Site Name
                    <span className="field-hint">Shown in header and browser tab</span>
                  </label>
                  <input type="text" value={settings.siteName} onChange={(e) => setSettings(s => ({ ...s, siteName: e.target.value }))} className="input" placeholder="VidBreefy" />
                </div>
                <div className="form-group">
                  <label className="label">
                    Contact Email
                    <span className="field-hint">Shown in footer and contact forms</span>
                  </label>
                  <input type="email" value={settings.contactEmail} onChange={(e) => setSettings(s => ({ ...s, contactEmail: e.target.value }))} className="input" placeholder="info@5ostudios.com" />
                </div>
              </div>

              <h3>🔗 Social Links</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label className="label">
                    Twitter / X
                    <span className="field-hint">Full URL to your profile</span>
                  </label>
                  <input type="text" value={settings.twitter || ''} onChange={(e) => setSettings(s => ({ ...s, twitter: e.target.value }))} className="input" placeholder="https://twitter.com/yourprofile" />
                </div>
                <div className="form-group">
                  <label className="label">
                    GitHub
                    <span className="field-hint">Full URL to your repository</span>
                  </label>
                  <input type="text" value={settings.github || ''} onChange={(e) => setSettings(s => ({ ...s, github: e.target.value }))} className="input" placeholder="https://github.com/yourrepo" />
                </div>
                <div className="form-group">
                  <label className="label">
                    Discord
                    <span className="field-hint">Full invite URL</span>
                  </label>
                  <input type="text" value={settings.discord || ''} onChange={(e) => setSettings(s => ({ ...s, discord: e.target.value }))} className="input" placeholder="https://discord.gg/yourserver" />
                </div>
              </div>

              <h3>📝 SEO Meta Templates</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label className="label">
                    Default Meta Title
                    <span className="field-hint">Used when page title isn't set. Use {'{page}'} as placeholder.</span>
                  </label>
                  <input type="text" value={settings.metaTitle || ''} onChange={(e) => setSettings(s => ({ ...s, metaTitle: e.target.value }))} className="input" placeholder="{page} | VidBreefy" />
                </div>
                <div className="form-group">
                  <label className="label">
                    Default Meta Description
                    <span className="field-hint">Used for search engine results</span>
                  </label>
                  <textarea value={settings.metaDescription || ''} onChange={(e) => setSettings(s => ({ ...s, metaDescription: e.target.value }))} className="input" rows={3} placeholder="Summarize any YouTube video in seconds with AI..." />
                </div>
              </div>

              <h3>📊 Usage & Limits</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label className="label">
                    Guest Daily Summary Limit
                    <span className="field-hint">Free summaries per day for non-logged-in users</span>
                  </label>
                  <input type="number" min="1" max="1000" value={settings.guest_daily_limit || 3} onChange={(e) => setSettings(s => ({ ...s, guest_daily_limit: parseInt(e.target.value) || 3 }))} className="input" placeholder="3" />
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
      <ToastComponent />
    </div>
  );
}