import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { summariesAPI, authAPI, userAPI } from '../api';
import { useToast } from '../hooks/useToast';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user, logout, isPro, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { success, error: showError, ToastComponent } = useToast();
  
  const [activeTab, setActiveTab] = useState('history');
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Settings state
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // API Keys state (Pro users)
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newApiProvider, setNewApiProvider] = useState('');
  const [newApiModel, setNewApiModel] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [addingKey, setAddingKey] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
    if (user) {
      setEmail(user.email);
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadSummaries();
      if (isPro) {
        loadApiKeys();
      }
    }
  }, [user, activeTab, page, search, isPro]);

  const loadApiKeys = async () => {
    if (!isPro) return;
    try {
      const res = await userAPI.getApiKeys();
      setApiKeys(res.data?.keys || []);
    } catch (err) {
      console.error('Failed to load API keys', err);
    }
  };

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const params = { 
        page, 
        limit: 20, 
        search,
        ...(activeTab === 'bookmarks' ? { isBookmarked: true } : {})
      };
      const res = await summariesAPI.getAll(params);
      setSummaries(res.data.summaries || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      showError('Failed to load summaries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await summariesAPI.delete(deleteId);
      success('Summary deleted');
      setSummaries(prev => prev.filter(s => s.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      showError('Failed to delete summary');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleBookmark = async (id) => {
    try {
      await summariesAPI.toggleBookmark(id);
      setSummaries(prev => prev.map(s => 
        s.id === id ? { ...s, isBookmarked: !s.isBookmarked } : s
      ));
      success('Bookmark updated');
    } catch (err) {
      showError('Failed to update bookmark');
    }
  };

  const handleUpgradeToPro = async () => {
    if (!confirm('Activate Pro access now? (Payment integration coming soon)')) return;
    try {
      const res = await authAPI.upgradeToPro();
      success('🎉 Welcome to Pro! Unlimited summaries activated.');
      // Update localStorage with fresh user data from response
      localStorage.setItem('vidbreefy_user', JSON.stringify(res.data.user));
      window.location.reload();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to upgrade');
    }
  };

  const handleUpdateEmail = async () => {
    if (email === user.email) return;
    setSettingsLoading(true);
    try {
      await authAPI.updateEmail({ email });
      success('Email updated! Please verify your new email.');
      setCurrentPassword('');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update email');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    setSettingsLoading(true);
    try {
      await authAPI.changePassword({ 
        currentPassword, 
        newPassword 
      });
      success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user.email) {
      showError('Please type your email correctly to confirm');
      return;
    }
    setSettingsLoading(true);
    try {
      await authAPI.deleteAccount();
      logout();
      navigate('/');
      success('Account deleted');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleAddApiKey = async () => {
    if (!newApiProvider || !newApiKey) {
      showError('Provider and API key are required');
      return;
    }
    setApiKeysLoading(true);
    try {
      await userAPI.addApiKey({ provider: newApiProvider, model_name: newApiModel, api_key: newApiKey });
      success('API key added successfully');
      setNewApiProvider('');
      setNewApiModel('');
      setNewApiKey('');
      loadApiKeys();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to add API key');
    } finally {
      setApiKeysLoading(false);
    }
  };

  const handleDeleteApiKey = async (provider) => {
    if (!confirm(`Remove API key for ${provider}?`)) return;
    try {
      await userAPI.deleteApiKey(provider);
      success('API key removed');
      loadApiKeys();
    } catch (err) {
      showError('Failed to remove API key');
    }
  };

  const getYoutubeThumbnail = (url) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"[&\]]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/default.jpg` : null;
  };

  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>Manage your summaries and account</p>
          </div>
          <a
            href="/vidbreefy-extension.zip"
            download
            className="btn btn-download"
          >
            Download Extension
          </a>
        </div>

        {/* Subscription Card */}
        <div className={`subscription-card ${isPro ? 'pro' : 'free'}`}>
          <div className="sub-info">
            <h3>{isPro ? 'Pro Plan' : 'Free Plan'}</h3>
            {isPro ? (
              <p>Unlimited summaries with all features unlocked</p>
            ) : (
              <p>3 summaries per day • Upgrade for unlimited access</p>
            )}
          </div>
          {!isPro && (
            <button className="btn btn-primary" onClick={handleUpgradeToPro}>
              Activate Pro
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); setPage(1); }}
          >
            History
          </button>
          <button 
            className={`tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => { setActiveTab('bookmarks'); setPage(1); }}
            disabled={!isPro}
          >
            Bookmarks {isPro ? '' : '(Pro)'}
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* History / Bookmarks Tab */}
        {(activeTab === 'history' || activeTab === 'bookmarks') && (
          <div className="tab-content">
            {/* Search */}
            <div className="search-bar">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
                <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search summaries..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input"
              />
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : summaries.length === 0 ? (
              <div className="empty-state">
                <p>No summaries yet</p>
                <button className="btn btn-primary" onClick={() => navigate('/summarize')}>
                  Summarize your first video
                </button>
              </div>
            ) : (
              <>
                <div className="summaries-list">
                  {summaries.map((item) => (
                    <div key={item.id} className="summary-item">
                      {item.thumbnail_url && (
                        <img 
                          src={item.thumbnail_url} 
                          alt={item.video_title || 'Video thumbnail'}
                          className="summary-thumb"
                        />
                      )}
                      <div className="summary-info">
                        <h4 onClick={() => navigate(`/summary/${item.share_hash || item.id}`)}>
                          {item.video_title || 'YouTube Video'}
                        </h4>
                        <div className="summary-meta">
                          <span className="format">{(item.format_type || 'short').toUpperCase()}</span>
                          <span className="date">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                      <div className="summary-actions">
                        {isPro && (
                          <button 
                            className={`btn btn-ghost btn-sm bookmark-btn ${item.is_bookmarked ? 'bookmarked' : ''}`}
                            onClick={() => handleToggleBookmark(item.id)}
                            title="Toggle bookmark"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill={item.is_bookmarked ? 'currentColor' : 'none'}>
                              <path d="M4 2H12V14H4V2Z" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M4 2H12V14H4V2Z" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDeleteId(item.id)}
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4H14M5 4V2H11V4M6 7V12M10 7V12M3 4L4 14H12L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="tab-content settings-content">
            {/* Update Email */}
            <div className="settings-section">
              <h3>Update Email</h3>
              <div className="settings-form">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="New email address"
                />
                <button 
                  className="btn btn-primary"
                  onClick={handleUpdateEmail}
                  disabled={settingsLoading || email === user?.email}
                >
                  Update Email
                </button>
              </div>
             <p className="settings-hint">Changing your email will require re-verification.</p>
            </div>

            {/* Change Password */}
            <div className="settings-section">
              <h3>Change Password</h3>
              <div className="settings-form">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input"
                  placeholder="Current password"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="New password"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Confirm new password"
                />
                <button 
                  className="btn btn-primary"
                  onClick={handleChangePassword}
                  disabled={settingsLoading || !currentPassword || !newPassword || !confirmPassword}
                >
                  Change Password
                </button>
              </div>
            </div>

            {/* My API Keys - Pro Only */}
            {isPro && (
              <div className="settings-section">
                <h3>My API Keys</h3>
                <p className="settings-hint">Use your own API key instead of the default admin key. Supports Groq, OpenAI, Anthropic, Gemini, DeepSeek.</p>
                
                {/* List existing keys */}
                {apiKeys.length > 0 && (
                  <div className="api-keys-list">
                    {apiKeys.map((key) => (
                      <div key={key.provider} className="api-key-item">
                        <div className="api-key-info">
                          <span className="api-key-provider">{key.provider.toUpperCase()}</span>
                          {key.model_name && <span className="api-key-model">{key.model_name}</span>}
                          <span className="api-key-date">Added {new Date(key.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="api-key-masked">{'•'.repeat(20)}****</div>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteApiKey(key.provider)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new key */}
                <div className="api-key-add-form">
                  <select 
                    value={newApiProvider} 
                    onChange={(e) => setNewApiProvider(e.target.value)}
                    className="input"
                  >
                    <option value="">Select provider</option>
                    <option value="groq">Groq (free, fast)</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="gemini">Gemini</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                  <input 
                    type="text" 
                    value={newApiModel} 
                    onChange={(e) => setNewApiModel(e.target.value)}
                    className="input"
                    placeholder="Model (optional, e.g. gpt-4o-mini)"
                  />
                  <input 
                    type="password" 
                    value={newApiKey} 
                    onChange={(e) => setNewApiKey(e.target.value)}
                    className="input"
                    placeholder="API Key"
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={handleAddApiKey}
                    disabled={apiKeysLoading || !newApiProvider || !newApiKey}
                  >
                    {apiKeysLoading ? 'Adding...' : 'Add Key'}
                  </button>
                </div>
              </div>
            )}

            {/* Delete Account */}
            <div className="settings-section danger-zone">
              <h3>Delete Account</h3>
              <p>This action cannot be undone. All your data will be permanently deleted.</p>
              <div className="settings-form">
                <input
                  type="email"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="input"
                  placeholder={`Type ${user?.email} to confirm`}
                />
                <button 
                  className="btn btn-danger"
                  onClick={handleDeleteAccount}
                  disabled={settingsLoading || deleteConfirm !== user?.email}
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Summary"
        size="sm"
      >
        <p>Are you sure you want to delete this summary? This action cannot be undone.</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>

      <ToastComponent />
    </div>
  );
}