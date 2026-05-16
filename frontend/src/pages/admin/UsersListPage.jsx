import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/LoadingSpinner';
import './AdminPage.css';

export default function UsersListPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { success, error: showError, ToastComponent } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, page, search, sortField, sortDir]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25, search, sort: sortField, dir: sortDir };
      const res = await adminAPI.getUsers(params);
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminAPI.exportUsers();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      success('Users exported');
    } catch (err) {
      showError('Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || !isAdmin) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Users</h1>
          <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {/* Search */}
        <div className="search-bar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
            <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input"
          />
        </div>

        {/* Admin Navigation */}
        <div className="admin-nav">
          <Link to="/admin/users" className="nav-link active">Users</Link>
          <Link to="/admin/ai-models" className="nav-link">AI Models</Link>
          <Link to="/admin/pricing" className="nav-link">Pricing</Link>
          <Link to="/admin/settings" className="nav-link">Settings</Link>
          <Link to="/admin/content" className="nav-link">Content</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/audit-log" className="nav-link">Audit Log</Link>
          <Link to="/admin/trash" className="nav-link">Trash</Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('email')}>
                      Email {sortField === 'email' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('createdAt')}>
                      Signup {sortField === 'createdAt' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Subscription</th>
                    <th onClick={() => handleSort('summaryCount')}>
                      Summaries {sortField === 'summaryCount' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => handleSort('lastActiveAt')}>
                      Last Active {sortField === 'lastActiveAt' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${user.tier === 'pro' ? 'badge-primary' : ''}`}>
                          {user.tier === 'pro' ? 'Pro' : 'Free'}
                        </span>
                      </td>
                      <td>{user.summaryCount || 0}</td>
                      <td>
                        {user.lastActiveAt 
                          ? new Date(user.lastActiveAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td>
                        <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>
                        <Link to={`/admin/users/${user.id}`} className="btn btn-ghost btn-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <ToastComponent />
    </div>
  );
}