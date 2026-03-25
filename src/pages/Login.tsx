import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';
import type { Page } from '../types';

interface LoginProps {
  onNavigate: (page: Page) => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? 'Invalid credentials.' : err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-primary-600/8 to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-1/3 w-[500px] h-[300px] bg-gradient-to-t from-accent/4 to-transparent rounded-full blur-[100px]" />
      </div>

      {/* Banner */}
      <div className="relative z-10 flex items-center gap-4 mb-12">
        <img
          src="/logo.png"
          alt="DriveLedger"
          className="w-16 h-16 rounded-2xl shadow-xl shadow-black/30"
        />
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-dark-300 bg-clip-text text-transparent">
            DriveLedger
          </h1>
          <p className="text-dark-500 text-sm tracking-wide">
            Vehicle finance manager
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm relative z-10">
        <div className="rounded-2xl bg-dark-900 p-8 shadow-2xl shadow-black/50">
          <h2 className="text-lg font-semibold text-dark-50 mb-6">Sign in to your account</h2>

          {error && (
            <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 mb-5">
              <AlertCircle size={16} className="text-danger shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-400 mb-1">
                Email or Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
                placeholder="you@example.com or username"
                className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3.5 py-2.5 text-dark-100 placeholder-dark-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-colors text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-dark-400">Password</label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3.5 py-2.5 pr-10 text-dark-100 placeholder-dark-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-600 hover:text-dark-400 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-lg px-4 py-2.5 transition-colors shadow-md shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-5 text-dark-500 text-sm">
          Don&apos;t have an account?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="text-primary-400 hover:text-primary-300 font-medium transition-colors cursor-pointer"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
