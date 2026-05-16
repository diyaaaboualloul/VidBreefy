import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import './AdminPage.css';

export default function UserDetailPage() {
  const { id } = useParams();
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { success, error: showError, ToastComponent } = useToast();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin && id) {
      loadUser();
    }
  }, [isAdmin, id]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUser(id);
      setUser(res.data);
    } catch (err) {
      showError('Failed to load user');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, data = {}) => {
    setActionLoading(true);
    try {
      await adminAPI.updateUser(id, { action, ...data });
      success(`User ${action} successful`);
      loadUser();
    } catch (err) {
      showError(`Failed to ${action} user`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await adminAPI.deleteUser(id);
      success('User deleted');
      navigate('/admin/users');
    } catch (err) {
      showError('Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (authLoading || !isAdmin) {
    return <LoadingSpinner fullScreen />;
  }

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return <div className="admin-page"><div className="admin-container">User not found</div></div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>User Details</h1>
          <Link to="/admin/users" className="btn btn-ghost">← Back to Users</Link>
        </div>

        {/* Admin Navigation */}
        <div className="admin-nav">
          <Link to="/admin/users" className="nav-link">Users</Link>
          <Link to="/admin/ai-models" className="nav-link">AI Models</Link>
          <Link to="/admin/pricing" className="nav-link">Pricing</Link>
          <Link to="/admin/settings" className="nav-link">Settings</Link>
          <Link to="/admin/content" className="nav-link">Content</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/audit-log" className="nav-link">Audit Log</Link>
          <Link to="/admin/trash" className="nav-link">Trash</Link>
        </div>

        <div className="user-detail-card">
          <div className="user-detail-header">
            <div className="user-avatar-large">
              {user.email[0].toUpperCase()}
            </div>
            <div>
              <h2>{user.email}</h2>
              <p>Joined {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="user-detail-grid">
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                {user.status}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Subscription</span>
              <span className={`badge ${user.tier === 'pro' ? 'badge-primary' : ''}`}>
                {user.tier === 'pro' ? 'Pro' : 'Free'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Summaries</span>
              <span className="detail-value">{user.summaryCount || 0}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last Active</span>
              <span className="detail-value">
                {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>

          <div className="user-actions">
            {user.tier === 'free' ? (
              <button className="btn btn-primary" onClick={() => handleAction('upgrade')} disabled={actionLoading}>
                Upgrade to Pro
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => handleAction('downgrade')} disabled={actionLoading}>
                Downgrade to Free
              </button>
            )}

            {user.status === 'active' ? (
              <button className="btn btn-secondary" onClick={() => handleAction('ban')} disabled={actionLoading}>
                Ban User
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => handleAction('unban')} disabled={actionLoading}>
                Unban User
              </button>
            )}

            <button className="btn btn-secondary" onClick={() => handleAction('reset')} disabled={actionLoading}>
              Reset Password
            </button>

            <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)} disabled={actionLoading}>
              Delete User
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete User" size="sm">
        <p>Are you sure you want to permanently delete this user? This action cannot be undone.</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>

      <ToastComponent />
    </div>
  );
}