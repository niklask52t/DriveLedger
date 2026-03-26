import { useState, useMemo } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api, ApiError } from '../api';
import type { Page } from '../types';

interface ResetPasswordProps {
  onNavigate: (page: Page) => void;
}

function getStrength(pw: string): { score: number; color: string; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score, color: 'bg-red-400', label: 'Weak' };
  if (score <= 3) return { score, color: 'bg-amber-400', label: 'Fair' };
  if (score <= 4) return { score, color: 'bg-sky-400', label: 'Good' };
  return { score, color: 'bg-emerald-400', label: 'Strong' };
}

export default function ResetPassword({ onNavigate }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);

  // Extract token from URL
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!token) {
      setError('No reset token found. Please use the link from your email.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {success ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={22} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-50 mb-2">Password reset successful</h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                Go to sign in
              </button>
            </div>
          ) : (
            /* Form */
            <>
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-zinc-50 mb-2">Reset your password</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Choose a new password for your account.
                </p>
              </div>

              {error && (
                <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-5">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {!token && (
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-3 mb-5">
                  <p className="text-sm text-amber-400">
                    No reset token found in the URL. Please use the link sent to your email.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">New password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 pr-10 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2.5">
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.color} rounded-full transition-all duration-300`}
                          style={{ width: `${Math.min(100, (strength.score / 6) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1.5">{strength.label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm new password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 pr-10 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Reset password
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => onNavigate('login')}
                  className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium inline-flex items-center gap-2"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
