import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api, ApiError } from '../api';
import type { Page, AppConfig } from '../types';

interface ForgotPasswordProps {
  onNavigate: (page: Page) => void;
}

export default function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config: AppConfig = await api.getConfig();
        if (!cancelled) setEmailEnabled(config.emailEnabled);
      } catch {
        // Config not available
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setError('');
    setLoading(true);

    try {
      await api.forgotPassword(email.trim());
      setSent(true);
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

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {!emailEnabled ? (
            /* Email not enabled */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={22} className="text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-50 mb-2">Email not configured</h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Password reset via email is not available. Please contact your administrator to reset your password.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium inline-flex items-center gap-2"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </button>
            </div>
          ) : sent ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={22} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-50 mb-2">Check your email</h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                If an account with <span className="text-zinc-300">{email}</span> exists, we've sent a password reset link.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium inline-flex items-center gap-2"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </button>
            </div>
          ) : (
            /* Form */
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-5">
                  <Mail size={22} className="text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-50 mb-2">Forgot password?</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-5">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Send reset link
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
