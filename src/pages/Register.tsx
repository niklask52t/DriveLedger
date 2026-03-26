import { useState, useMemo } from 'react';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';
import type { Page } from '../types';

interface RegisterProps {
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

export default function Register({ onNavigate }: RegisterProps) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);

  const checks = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
    { label: 'Passwords match', met: password.length > 0 && password === confirmPassword },
  ], [password, confirmPassword]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password || !confirmPassword || !registrationToken.trim()) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register(email.trim(), username.trim(), password, registrationToken.trim());
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
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-[480px] shrink-0 bg-zinc-900 border-r border-zinc-800 flex-col items-center justify-center px-12">
        <div className="max-w-xs text-center">
          <img src="/logo.png" alt="DriveLedger" className="h-16 w-auto object-contain mx-auto mb-8" />
          <h1 className="text-3xl font-bold text-zinc-50 mb-4">
            Start managing your vehicles.
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            Create an account to track expenses, plan purchases and stay on top of maintenance.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-zinc-950">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <img src="/logo.png" alt="DriveLedger" className="h-9 w-auto object-contain" />
          </div>

          <h2 className="text-2xl font-semibold text-zinc-50 mb-1">Create account</h2>
          <p className="text-sm text-zinc-500 mb-8">Fill in the details below to get started.</p>

          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 pr-10 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
                  autoComplete="new-password"
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
              <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
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

            {/* Password checks */}
            {password.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {checks.map((c) => (
                  <div key={c.label} className="flex items-center gap-2">
                    {c.met ? (
                      <Check size={13} className="text-emerald-400 shrink-0" />
                    ) : (
                      <X size={13} className="text-zinc-600 shrink-0" />
                    )}
                    <span className={`text-xs ${c.met ? 'text-zinc-400' : 'text-zinc-600'}`}>{c.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Registration token</label>
              <input
                type="text"
                value={registrationToken}
                onChange={(e) => setRegistrationToken(e.target.value)}
                placeholder="Paste your invitation token"
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create account
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
