import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import { useToast } from '../../hooks/useToast';
import LoadingSpinner from '../../components/LoadingSpinner';
import './AdminPage.css';

export default function ContentPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { success, error: showError, ToastComponent } = useToast();
  const [content, setContent] = useState({ hero: {}, features: [], faq: [], testimonials: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      loadContent();
    }
  }, [isAdmin]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getContent();
      // Transform API response to component format
      const transformed = {
        hero: { 
          title: res.data.hero_title || '', 
          subtitle: res.data.hero_subtitle || '' 
        },
        features: [],
        faq: res.data.faq || [],
        testimonials: res.data.testimonials || []
      };
      setContent(transformed);
    } catch (err) {
      showError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateContent(content);
      success('Content updated');
    } catch (err) {
      showError('Failed to update content');
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field, value) => {
    setContent(c => ({ ...c, hero: { ...c.hero, [field]: value } }));
  };

  const addFaq = () => {
    setContent(c => ({ ...c, faq: [...c.faq, { q: 'New question', a: 'New answer' }] }));
  };

  const updateFaq = (index, field, value) => {
    setContent(c => ({
      ...c,
      faq: c.faq.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const deleteFaq = (index) => {
    setContent(c => ({ ...c, faq: c.faq.filter((_, i) => i !== index) }));
  };

  const moveFaq = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= content.faq.length) return;
    const newFaq = [...content.faq];
    [newFaq[index], newFaq[newIndex]] = [newFaq[newIndex], newFaq[index]];
    setContent(c => ({ ...c, faq: newFaq }));
  };

  const updateTestimonial = (index, field, value) => {
    setContent(c => ({
      ...c,
      testimonials: c.testimonials.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }));
  };

  if (authLoading || !isAdmin) return <LoadingSpinner fullScreen />;

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Content Management</h1>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="admin-nav">
          <Link to="/admin/users" className="nav-link">Users</Link>
          <Link to="/admin/ai-models" className="nav-link">AI Models</Link>
          <Link to="/admin/pricing" className="nav-link">Pricing</Link>
          <Link to="/admin/settings" className="nav-link">Settings</Link>
          <Link to="/admin/content" className="nav-link active">Content</Link>
          <Link to="/admin/payments" className="nav-link">Payments</Link>
          <Link to="/admin/audit-log" className="nav-link">Audit Log</Link>
          <Link to="/admin/trash" className="nav-link">Trash</Link>
        </div>

        {loading ? <LoadingSpinner /> : (
          <>
            {/* Hero Section */}
            <div className="settings-section">
              <h3>Hero Section</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label className="label">Title</label>
                  <input type="text" value={content.hero.title || ''} onChange={(e) => updateHero('title', e.target.value)} className="input" />
                </div>
                <div className="form-group">
                  <label className="label">Subtitle</label>
                  <textarea value={content.hero.subtitle || ''} onChange={(e) => updateHero('subtitle', e.target.value)} className="input" rows={2} />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="settings-section">
              <h3>Features</h3>
              <p className="text-muted text-sm mb-md">Features are managed via the Features section above.</p>
            </div>

            {/* FAQ */}
            <div className="settings-section">
              <div className="section-header">
                <h3>FAQ</h3>
                <button className="btn btn-secondary btn-sm" onClick={addFaq}>Add Question</button>
              </div>
              <div className="faq-edit-list">
                {content.faq.map((item, index) => (
                  <div key={index} className="faq-edit-item">
                    <div className="faq-edit-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => moveFaq(index, -1)} disabled={index === 0}>↑</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveFaq(index, 1)} disabled={index === content.faq.length - 1}>↓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => deleteFaq(index)}>🗑</button>
                    </div>
                    <div className="faq-edit-fields">
                      <input type="text" value={item.q} onChange={(e) => updateFaq(index, 'q', e.target.value)} className="input" placeholder="Question" />
                      <textarea value={item.a} onChange={(e) => updateFaq(index, 'a', e.target.value)} className="input" rows={2} placeholder="Answer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="settings-section">
              <h3>Testimonials</h3>
              <div className="testimonials-edit">
                {(content.testimonials || []).map((t, index) => (
                  <div key={index} className="testimonial-edit-item">
                    <div className="form-group">
                      <label className="label">Name</label>
                      <input type="text" value={t.name || ''} onChange={(e) => updateTestimonial(index, 'name', e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="label">Role</label>
                      <input type="text" value={t.role || ''} onChange={(e) => updateTestimonial(index, 'role', e.target.value)} className="input" />
                    </div>
                    <div className="form-group">
                      <label className="label">Quote</label>
                      <textarea value={t.quote || ''} onChange={(e) => updateTestimonial(index, 'quote', e.target.value)} className="input" rows={2} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <ToastComponent />
    </div>
  );
}