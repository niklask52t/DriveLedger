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
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary-600/10 via-primary-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-gradient-to-t from-accent/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-gradient-to-t from-primary-400/5 to-transparent rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Banner - Logo + Text side by side */}
      <div className="relative z-10 flex items-center gap-5 mb-10">
        <img
          src="/logo.png"
          alt="DriveLedger"
          className="w-[72px] h-[72px] rounded-2xl shadow-2xl shadow-primary-600/20 ring-1 ring-white/10"
        />
        {/* Placeholder for banner image - replace with /banner.png later */}
        <div className="flex flex-col">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-dark-100 to-dark-300 bg-clip-text text-transparent">
            DriveLedger
          </h1>
          <p className="text-dark-400 text-sm mt-0.5 tracking-wide">
            Your personal vehicle finance manager
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[420px] relative z-10">
        <div className="bg-dark-900/70 backdrop-blur-2xl border border-dark-700/60 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
          {/* Card accent top border */}
          <div className="h-1 bg-gradient-to-r from-primary-500 via-primary-400 to-accent" />

          <div className="p-8">
            <h2 className="text-xl font-bold text-dark-50 mb-1">Welcome back</h2>
            <p className="text-dark-500 text-sm mb-7">Sign in to your account to continue</p>

            {error && (
              <div className="flex items-center gap-2.5 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 mb-6">
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
                  className="w-full bg-dark-800/80 border border-dark-600 rounded-xl px-4 py-3 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
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
                    className="w-full bg-dark-800/80 border border-dark-600 rounded-xl px-4 py-3 pr-12 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-dark-500 hover:text-dark-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-sm text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-xl px-4 py-3 transition-all duration-200 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/35 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer"
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
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-dark-500 text-sm">
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
