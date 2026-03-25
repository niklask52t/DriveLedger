import { useState, useMemo, type FormEvent } from 'react';
import { Eye, EyeOff, UserPlus, AlertCircle, Loader2, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';
import type { Page } from '../types';

interface RegisterProps {
  onNavigate: (page: Page) => void;
}

interface PasswordCheck {
  label: string;
  met: boolean;
}

export default function Register({ onNavigate }: RegisterProps) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordChecks: PasswordCheck[] = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains a number', met: /[0-9]/.test(password) },
  ], [password]);

  const allChecksMet = passwordChecks.every((c) => c.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const strengthPercent = useMemo(() => {
    const passed = passwordChecks.filter((c) => c.met).length;
    return (passed / passwordChecks.length) * 100;
  }, [passwordChecks]);

  const strengthColor = strengthPercent <= 25 ? 'bg-danger' : strengthPercent <= 50 ? 'bg-warning' : strengthPercent <= 75 ? 'bg-accent' : 'bg-success';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allChecksMet) {
      setError('Password does not meet all requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    if (!registrationToken.trim()) {
      setError('Registration token is required.');
      return;
    }

    setLoading(true);
    try {
      await register(email, username, password, registrationToken);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
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
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Banner */}
      <div className="relative z-10 flex items-center gap-5 mb-10">
        <img src="/logo.png" alt="DriveLedger" className="w-[72px] h-[72px] rounded-2xl shadow-2xl shadow-primary-600/20 ring-1 ring-white/10" />
        <div className="flex flex-col">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-dark-100 to-dark-300 bg-clip-text text-transparent">DriveLedger</h1>
          <p className="text-dark-400 text-sm mt-0.5 tracking-wide">Your personal vehicle finance manager</p>
        </div>
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="bg-dark-900/70 backdrop-blur-2xl border border-dark-700/60 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
          <div className="h-1 bg-gradient-to-r from-primary-500 via-primary-400 to-accent" />
          <div className="p-8">
          <h2 className="text-xl font-bold text-dark-50 mb-1">Create Account</h2>
          <p className="text-dark-500 text-sm mb-7">Join DriveLedger with an invite token</p>

          {error && (
            <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-6">
              <AlertCircle size={18} className="text-danger shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Choose a username"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
              />
            </div>

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
                  autoComplete="new-password"
                  placeholder="Create a strong password"
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

              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                      style={{ width: `${strengthPercent}%` }}
                    />
                  </div>
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
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  className={`w-full bg-dark-800 border rounded-lg px-4 py-2.5 pr-11 text-dark-100 placeholder-dark-500 focus:ring-1 outline-none transition-colors ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-success/50 focus:border-success focus:ring-success'
                        : 'border-danger/50 focus:border-danger focus:ring-danger'
                      : 'border-dark-700 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-danger mt-1">Passwords do not match</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Registration Token
                <span className="text-dark-500 font-normal ml-1">(invite only)</span>
              </label>
              <input
                type="text"
                value={registrationToken}
                onChange={(e) => setRegistrationToken(e.target.value)}
                required
                placeholder="Paste your invite token"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors font-mono text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !allChecksMet || !passwordsMatch}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-lg px-4 py-2.5 transition-all duration-200 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-6"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              )}
            </button>
          </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-dark-500 text-sm">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('login')}
            className="text-primary-400 hover:text-primary-300 font-medium transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
