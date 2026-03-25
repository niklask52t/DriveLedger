import { useState, type FormEvent } from 'react';
import { Gauge, ArrowLeft, Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../api';
import { ApiError } from '../api';
import type { Page } from '../types';

interface ForgotPasswordProps {
  onNavigate: (page: Page) => void;
}

export default function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
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
          {sent ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 mb-4">
                <CheckCircle size={28} className="text-success" />
              </div>
              <h2 className="text-xl font-semibold text-dark-50 mb-2">Check your email</h2>
              <p className="text-dark-400 text-sm mb-6">
                If an account with that email exists, we&apos;ve sent a password reset link. Please check your inbox and spam folder.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="text-primary-400 hover:text-primary-300 font-medium text-sm transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-dark-50 mb-2">Forgot your password?</h2>
              <p className="text-dark-400 text-sm mb-6">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-6">
                  <AlertCircle size={18} className="text-danger shrink-0" />
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-lg px-4 py-2.5 transition-all duration-200 shadow-lg shadow-primary-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Mail size={18} />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Back link */}
        {!sent && (
          <div className="text-center mt-6">
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-1.5 text-dark-400 hover:text-dark-200 text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
