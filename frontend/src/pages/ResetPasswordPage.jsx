import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authAPI } from '../api';
import { useToast } from '../hooks/useToast';
import LoadingSpinner from '../components/LoadingSpinner';
import './AuthPage.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const { success, error: showError, ToastComponent } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { password: '', confirmPassword: '' }
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    if (!token) {
      showError('Invalid reset token');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ 
        email, 
        token, 
        password: data.password 
      });
      setDone(true);
      success('Password reset successful! You can now sign in.');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Invalid reset link</h1>
            <p>This password reset link is invalid or has expired.</p>
          </div>
          <p className="auth-footer">
            <Link to="/forgot-password">Request a new one</Link>
          </p>
        </div>
        <ToastComponent />
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="success-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="#10B981" strokeWidth="3"/>
                <path d="M14 24L21 31L34 18" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1>Password reset!</h1>
            <p>Your password has been reset successfully.</p>
          </div>
          <Link to="/login" className="btn btn-primary btn-lg auth-submit">
            Sign in with new password
          </Link>
        </div>
        <ToastComponent />
      </div>
    );
  }

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
          <h1>Set new password</h1>
          <p>Enter your new password below</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="label">New password</label>
            <input
              type="password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder="Min 8 characters"
              {...register('password', { 
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                },
                pattern: {
                  value: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                  message: 'Password must contain a letter and a number'
                }
              })}
            />
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          <div className="form-group">
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Repeat password"
              {...register('confirmPassword', { 
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match'
              })}
            />
            {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </div>
      <ToastComponent />
    </div>
  );
}