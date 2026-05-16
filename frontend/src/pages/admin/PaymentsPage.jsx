import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/LoadingSpinner';
import './AdminPage.css';

export default function PaymentsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { success, error: showError, ToastComponent } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (isAdmin) {
      loadPayments();
    }
  }, [isAdmin, page, search]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getPayments({ page, search, limit: 25 });
      setPayments(res.data.payments || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      showError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (id) => {
    if (!confirm('Are you sure you want to refund this payment?')) return;
    try {
      // Stub: actual refund would call adminAPI.refundPayment(id)
      success('Refund initiated (stub)');
    } catch (err) {
      showError('Refund failed');
    }
  };

  const formatAmount = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  if (authLoading || !isAdmin) return <LoadingSpinner fullScreen />;

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Payments</h1>
        </div>

        <div className="admin-nav">
          <Link to="/admin/users" className="nav-link">Users</Link>
          <Link to="/admin/ai-models" className="nav-link">AI Models</Link>
          <Link to="/admin/pricing" className="nav-link">Pricing</Link>
          <Link to="/admin/settings" className="nav-link">Settings</Link>
          <Link to="/admin/content" className="nav-link">Content</Link>
          <Link to="/admin/payments" className="nav-link active">Payments</Link>
          <Link to="/admin/audit-log" className="nav-link">Audit Log</Link>
          <Link to="/admin/trash" className="nav-link">Trash</Link>
        </div>

        {/* Search */}
        <div className="search-bar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
            <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input type="text" placeholder="Search by email or transaction ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input" />
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Email</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td><code>{p.transactionId || p.id}</code></td>
                    <td>{p.email}</td>
                    <td>{formatAmount(p.amount)}</td>
                    <td>{p.currency?.toUpperCase() || 'USD'}</td>
                    <td><span className={`badge ${p.status === 'completed' ? 'badge-success' : 'badge-error'}`}>{p.status}</span></td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRefund(p.id)} disabled={p.status !== 'completed'}>
                        Refund
                      </button>
                    </td>
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