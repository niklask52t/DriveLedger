import { useState, useMemo, type FormEvent } from 'react';
import { Gauge, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Check, X } from 'lucide-react';
import { api } from '../api';
import { ApiError } from '../api';
import type { Page } from '../types';

interface ResetPasswordProps {
  onNavigate: (page: Page) => void;
}

export default function ResetPassword({ onNavigate }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Extract token from URL
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  }, []);

  const passwordChecks = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains a number', met: /[0-9]/.test(password) },
  ], [password]);

  const allChecksMet = passwordChecks.every((c) => c.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
    if (!allChecksMet) {
      setError('Password does not meet all requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary-600/8 via-transparent to-transparent rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-600/30 mb-4">
            <Gauge size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-dark-50 tracking-tight">DriveLedger</h1>
        </div>

        {/* Card */}
        <div className="bg-dark-900/80 backdrop-blur-xl border border-dark-800 rounded-2xl p-8 shadow-2xl shadow-black/30">
          {success ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 mb-4">
                <CheckCircle size={28} className="text-success" />
              </div>
              <h2 className="text-xl font-semibold text-dark-50 mb-2">Password Reset</h2>
              <p className="text-dark-400 text-sm mb-6">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-lg px-6 py-2.5 transition-all duration-200 shadow-lg shadow-primary-600/25 cursor-pointer"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-dark-50 mb-2">Reset your password</h2>
              <p className="text-dark-400 text-sm mb-6">Enter your new password below.</p>

              {!token && (
                <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-lg px-4 py-3 mb-6">
                  <AlertCircle size={18} className="text-warning shrink-0" />
                  <p className="text-sm text-warning">No reset token found. Please use the link from your email.</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-6">
                  <AlertCircle size={18} className="text-danger shrink-0" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Enter new password"
                      className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 pr-11 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {passwordChecks.map((check) => (
                        <div key={check.label} className="flex items-center gap-1.5 text-xs">
                          {check.met ? (
                            <Check size={12} className="text-success" />
                          ) : (
                            <X size={12} className="text-dark-500" />
                          )}
                          <span className={check.met ? 'text-success' : 'text-dark-500'}>{check.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    className={`w-full bg-dark-800 border rounded-lg px-4 py-2.5 text-dark-100 placeholder-dark-500 focus:ring-1 outline-none transition-colors ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? 'border-success/50 focus:border-success focus:ring-success'
                          : 'border-danger/50 focus:border-danger focus:ring-danger'
                        : 'border-dark-700 focus:border-primary-500 focus:ring-primary-500'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !token || !allChecksMet || !passwordsMatch}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-lg px-4 py-2.5 transition-all duration-200 shadow-lg shadow-primary-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
