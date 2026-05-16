import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import './AdminPage.css';

export default function TrashPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { success, error: showError, ToastComponent } = useToast();
  const [trash, setTrash] = useState({ summaries: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [restoreLoading, setRestoreLoading] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      loadTrash();
    }
  }, [isAdmin]);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getTrash();
      setTrash({ summaries: res.data?.summaries || [], users: [] });
    } catch (err) {
      showError('Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (type, id) => {
    setRestoreLoading(id);
    try {
      await adminAPI.restoreTrash(type, id);
      success('Restored successfully');
      loadTrash();
    } catch (err) {
      showError('Failed to restore');
    } finally {
      setRestoreLoading(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminAPI.permanentDelete(deleteTarget.type, deleteTarget.id);
      success('Permanently deleted');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      loadTrash();
    } catch (err) {
      showError('Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = (type, id) => {
    setDeleteTarget({ type, id });
    setShowDeleteModal(true);
  };

  if (authLoading || !isAdmin) return <LoadingSpinner fullScreen />;

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Trash</h1>
        </div>

        <div className="admin-nav">
          <Link to="/admin/users" className="nav-link">Users</Link>
          <Link to="/admin/ai-models" className="nav-link">AI Models</Link>
          <Link to="/admin/pricing" className="nav-link">Pricing</Link>
          <Link to="/admin/settings" className="nav-link">Settings</Link>
          <Link to="/admin/content" className="nav-link">Content</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/audit-log" className="nav-link">Audit Log</Link>
          <Link to="/admin/trash" className="nav-link active">Trash</Link>
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            {/* Deleted Summaries */}
            <div className="settings-section">
              <h3>Deleted Summaries ({trash.summaries?.length || 0})</h3>
              {trash.summaries?.length === 0 ? (
                <p className="text-muted">No deleted summaries</p>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Deleted At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trash.summaries.map(s => (
                        <tr key={s.id}>
                          <td>{s.title || 'Untitled'}</td>
                          <td>{new Date(s.deletedAt).toLocaleDateString()}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn btn-ghost btn-sm" onClick={() => handleRestore('summaries', s.id)} disabled={restoreLoading === s.id}>
                                {restoreLoading === s.id ? 'Restoring...' : 'Restore'}
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => confirmDelete('summaries', s.id)}>
                                Delete Forever
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Deleted Users */}
            <div className="settings-section">
              <h3>Deleted Users ({trash.users?.length || 0})</h3>
              {trash.users?.length === 0 ? (
                <p className="text-muted">No deleted users</p>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Deleted At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trash.users.map(u => (
                        <tr key={u.id}>
                          <td>{u.email}</td>
                          <td>{new Date(u.deletedAt).toLocaleDateString()}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn btn-ghost btn-sm" onClick={() => handleRestore('users', u.id)} disabled={restoreLoading === u.id}>
                                {restoreLoading === u.id ? 'Restoring...' : 'Restore'}
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => confirmDelete('users', u.id)}>
                                Delete Forever
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Permanent Delete" size="sm">
        <p>Are you sure you want to permanently delete this {deleteTarget?.type}? This action cannot be undone.</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handlePermanentDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete Forever'}
          </button>
        </div>
      </Modal>

      <ToastComponent />
    </div>
  );
}