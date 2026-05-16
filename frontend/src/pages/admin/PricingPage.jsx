import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/LoadingSpinner';
import './AdminPage.css';

export default function PricingPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { success, error: showError, ToastComponent } = useToast();
  const [pricing, setPricing] = useState({ proPrice: 7 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadPricing();
    }
  }, [isAdmin]);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getPricing();
      setPricing(res.data);
    } catch (err) {
      showError('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updatePricing(pricing);
      success('Pricing updated');
    } catch (err) {
      showError('Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !isAdmin) return <LoadingSpinner fullScreen />;

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Pricing</h1>
        </div>

        <div className="admin-nav">
          <Link to="/admin/users" className="nav-link">Users</Link>
          <Link to="/admin/ai-models" className="nav-link">AI Models</Link>
          <Link to="/admin/pricing" className="nav-link active">Pricing</Link>
          <Link to="/admin/settings" className="nav-link">Settings</Link>
          <Link to="/admin/content" className="nav-link">Content</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/audit-log" className="nav-link">Audit Log</Link>
          <Link to="/admin/trash" className="nav-link">Trash</Link>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="settings-section">
            <h3>Pro Plan Price</h3>
            <div className="settings-form">
              <div className="input-group">
                <label className="label">Monthly Price (USD)</label>
                <input
                  type="number"
                  value={pricing.proPrice}
                  onChange={(e) => setPricing({ proPrice: parseFloat(e.target.value) })}
                  className="input"
                  min="1"
                  step="0.01"
                />
              </div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
      <ToastComponent />
    </div>
  );
}