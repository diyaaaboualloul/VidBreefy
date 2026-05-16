import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/LoadingSpinner';
import './AdminPage.css';

export default function AuditLogPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { error: showError, ToastComponent } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminFilter, setAdminFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
    }
  }, [isAdmin, page, adminFilter, dateFrom, dateTo]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (adminFilter) params.admin = adminFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const res = await adminAPI.getAuditLog(params);
      setLogs(res.data.logs || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      showError('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  if (authLoading || !isAdmin) return <LoadingSpinner fullScreen />;

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Audit Log</h1>
        </div>

        <div className="admin-nav">
          <Link to="/admin/users" className="nav-link">Users</Link>
          <Link to="/admin/ai-models" className="nav-link">AI Models</Link>
          <Link to="/admin/pricing" className="nav-link">Pricing</Link>
          <Link to="/admin/settings" className="nav-link">Settings</Link>
          <Link to="/admin/content" className="nav-link">Content</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/audit-log" className="nav-link active">Audit Log</Link>
          <Link to="/admin/trash" className="nav-link">Trash</Link>
        </div>

        {/* Filters */}
        <div className="filters-row">
          <input type="text" placeholder="Filter by admin email" value={adminFilter} onChange={(e) => { setAdminFilter(e.target.value); setPage(1); }} className="input" />
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="input" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="input" />
          <button className="btn btn-secondary btn-sm" onClick={loadLogs}>Refresh</button>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td><span className="text-sm">{formatDate(log.createdAt)}</span></td>
                    <td>{log.adminEmail}</td>
                    <td><span className="badge badge-primary">{log.action}</span></td>
                    <td>{log.target || '-'}</td>
                    <td><code className="text-sm">{JSON.stringify(log.details || {})}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
          </div>
        )}
      </div>
      <ToastComponent />
    </div>
  );
}