import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/LoadingSpinner';
import './AdminPage.css';

export default function AIModelsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { success, error: showError, ToastComponent } = useToast();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      loadModels();
    }
  }, [isAdmin]);

  const loadModels = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getModels();
      setModels(res.data?.ai_models || []);
    } catch (err) {
      showError('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const model = models.find(m => m.id === id);
      await adminAPI.updateModel(id, { enabled: !model.enabled });
      setModels(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
      success('Model updated');
    } catch (err) {
      showError('Failed to update model');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await adminAPI.updateModel(id, { is_default: true });
      setModels(prev => prev.map(m => ({ ...m, is_default: m.id === id })));
      success('Default model updated');
    } catch (err) {
      showError('Failed to set default');
    }
  };

  const handleApiKeySave = async (id, apiKey) => {
    if (!apiKey) return;
    try {
      const model = models.find(m => m.id === id);
      await adminAPI.updateModel(id, { 
        api_key: apiKey,
        provider: model.provider,
        model_name: model.model_name,
        enabled: model.enabled,
        is_default: model.is_default
      });
      setModels(prev => prev.map(m => m.id === id ? { ...m, api_key: apiKey, configured: true } : m));
      success('API key saved');
    } catch (err) {
      showError('Failed to save API key');
    }
  };

  if (authLoading || !isAdmin) return <LoadingSpinner fullScreen />;

  // Group models by provider
  const providers = {};
  for (const model of models) {
    const p = model.provider.toLowerCase();
    if (!providers[p]) providers[p] = [];
    providers[p].push(model);
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>AI Models</h1>
        </div>

        <div className="admin-nav">
          <Link to="/admin/users" className="nav-link">Users</Link>
          <Link to="/admin/ai-models" className="nav-link active">AI Models</Link>
          <Link to="/admin/pricing" className="nav-link">Pricing</Link>
          <Link to="/admin/settings" className="nav-link">Settings</Link>
          <Link to="/admin/content" className="nav-link">Content</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/audit-log" className="nav-link">Audit Log</Link>
          <Link to="/admin/trash" className="nav-link">Trash</Link>
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            <div className="info-banner">
              <span className="info-icon">ℹ️</span>
              <div>
                <strong>Add your API keys below</strong> — Each provider needs its own key.
                Get free keys: 
                <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">Groq</a> • 
                <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">OpenAI</a> • 
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Gemini</a>
              </div>
            </div>

            {Object.entries(providers).map(([provider, providerModels]) => {
              const anyConfigured = providerModels.some(m => m.configured);
              const defaultModel = providerModels.find(m => m.is_default);
              const anyEnabled = providerModels.some(m => m.enabled);

              return (
                <div key={provider} className="provider-section">
                  <div className="provider-header">
                    <div className="provider-title">
                      <span className="provider-badge">{provider.toUpperCase()}</span>
                      <span className={`provider-status ${anyConfigured ? 'configured' : 'missing'}`}>
                        {anyConfigured ? '✅ Key Added' : '⚠️ No Key'}
                      </span>
                    </div>
                    {defaultModel && (
                      <span className="default-indicator">Default: {defaultModel.model_name}</span>
                    )}
                  </div>

                  <div className="models-grid">
                    {providerModels.map(model => (
                      <div key={model.id} className={`model-card ${!model.enabled ? 'disabled' : ''}`}>
                        <div className="model-card-header">
                          <strong>{model.model_name}</strong>
                          <div className="model-card-actions">
                            {model.is_default ? (
                              <span className="badge badge-primary">Default</span>
                            ) : (
                              <button 
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleSetDefault(model.id)}
                                disabled={!model.enabled}
                              >
                                Set Default
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="model-card-body">
                          <label className="model-label">API Key</label>
                          <input
                            type="password"
                            className="input api-key-field"
                            defaultValue={model.api_key || ''}
                            placeholder={`Paste ${provider} API key...`}
                            onBlur={(e) => handleApiKeySave(model.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.target.blur();
                            }}
                          />
                          <div className="model-status-row">
                            <span className={`status-tag ${model.enabled ? 'enabled' : 'disabled'}`}>
                              {model.enabled ? '● Enabled' : '○ Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="admin-footer-info">
              <h3>📝 How it works</h3>
              <ul>
                <li><strong>Free users</strong> — Use the default model (usually Groq, which is free)</li>
                <li><strong>Pro users</strong> — Can choose any enabled model from their dashboard</li>
                <li><strong>Disabled models</strong> — Won't appear in the model selector</li>
                <li><strong>API keys</strong> — Stored encrypted. We never log or expose your keys.</li>
              </ul>
            </div>
          </>
        )}
      </div>
      <ToastComponent />
    </div>
  );
}