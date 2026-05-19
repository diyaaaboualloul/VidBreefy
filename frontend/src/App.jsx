import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import './styles/global.css';

// Pages
import LandingPage from './pages/LandingPage';
import SummarizePage from './pages/SummarizePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import SummaryPage from './pages/SummaryPage';
import NotFoundPage from './pages/NotFoundPage';

// Admin Pages
import AIModelsPage from './pages/admin/AIModelsPage';
import ContentPage from './pages/admin/ContentPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import PaymentsPage from './pages/admin/PaymentsPage';
import PricingPage from './pages/admin/PricingPage';
import SettingsPage from './pages/admin/SettingsPage';
import TrashPage from './pages/admin/TrashPage';
import UsersListPage from './pages/admin/UsersListPage';
import UserDetailPage from './pages/admin/UserDetailPage';

// Layout wrapper — provides scroll reveal inside Router context
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollReveal({ children }) {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    const timeout = setTimeout(() => {
      document.querySelectorAll('.reveal:not(.revealed)').forEach(el => observer.observe(el));
    }, 100);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [location.pathname]);
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollReveal>
          <div className="app">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/summarize" element={<SummarizePage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/summary/:hash" element={<SummaryPage />} />
                <Route path="/404" element={<NotFoundPage />} />

                {/* Admin Routes */}
                <Route path="/admin" element={<UsersListPage />} />
                <Route path="/admin/users" element={<UsersListPage />} />
                <Route path="/admin/users/:id" element={<UserDetailPage />} />
                <Route path="/admin/ai-models" element={<AIModelsPage />} />
                <Route path="/admin/pricing" element={<PricingPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/content" element={<ContentPage />} />
                <Route path="/admin/payments" element={<PaymentsPage />} />
                <Route path="/admin/audit-log" element={<AuditLogPage />} />
                <Route path="/admin/trash" element={<TrashPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </ScrollReveal>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;