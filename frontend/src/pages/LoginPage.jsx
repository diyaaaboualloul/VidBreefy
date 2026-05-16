import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import './AuthPage.css';

export default function LoginPage() {
  const { login: loginUser } = useAuth();
  const navigate = useNavigate();
  const { success, error: showError, ToastComponent } = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await loginUser(data.email, data.password);
      success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      showError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#14b8a6"/>
              <path d="M8 12L16 8L24 12V20L16 24L8 20V12Z" stroke="white" strokeWidth="2"/>
              <circle cx="16" cy="16" r="4" fill="white"/>
            </svg>
          </Link>
          <h1>Welcome back</h1>
          <p>Sign in to continue summarizing</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="label">Email address</label>
            <input
              type="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              placeholder="you@example.com"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
            />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              type="password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder="Your password"
              {...register('password', { 
                required: 'Password is required'
              })}
            />
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          <Link to="/forgot-password" className="forgot-password">
            Forgot password?
          </Link>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
      <ToastComponent />
    </div>
  );
}