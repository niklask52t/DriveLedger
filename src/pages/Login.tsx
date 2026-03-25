import { useState, type FormEvent } from 'react';
import { Gauge, Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';
import type { Page } from '../types';

interface LoginProps {
  onNavigate: (page: Page) => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? 'Invalid email or password.' : err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary-600/8 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary-500/5 via-transparent to-transparent rounded-full blur-3xl" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Road lines */}
        <svg className="absolute bottom-0 left-0 w-full h-40 opacity-[0.04]" viewBox="0 0 1200 160" preserveAspectRatio="none">
          <path d="M0 160 L600 40 L1200 160" stroke="white" strokeWidth="2" fill="none" />
          <path d="M0 160 L600 60 L1200 160" stroke="white" strokeWidth="1" fill="none" strokeDasharray="20 15" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-600/30 mb-4">
            <Gauge size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-dark-50 tracking-tight">DriveLedger</h1>
          <p className="text-dark-400 mt-1">Your personal vehicle finance manager</p>
        </div>

        {/* Card */}
        <div className="bg-dark-900/80 backdrop-blur-xl border border-dark-800 rounded-2xl p-8 shadow-2xl shadow-black/30">
          <h2 className="text-xl font-semibold text-dark-50 mb-6">Welcome back</h2>

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

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
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
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-lg px-4 py-2.5 transition-all duration-200 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-dark-400 text-sm">
          Don&apos;t have an account?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
