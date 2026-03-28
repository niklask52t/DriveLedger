import { useState, useMemo, useEffect } from 'react';
import { Eye, EyeOff, Loader2, Check, X, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { api, ApiError } from '../api';
import type { Page, AppConfig } from '../types';

interface RegisterProps {
  onNavigate: (page: Page) => void;
}

export default function Register({ onNavigate }: RegisterProps) {
  const { register } = useAuth();
  const { t, lang, setLang, languages } = useI18n();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [openRegistration, setOpenRegistration] = useState(false);

  useEffect(() => {
    api.getConfig().then((cfg: AppConfig) => {
      setOpenRegistration(cfg.openRegistration === true);
    }).catch(() => {});
  }, []);

  function getStrength(pw: string): { score: number; color: string; label: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 2) return { score, color: 'bg-red-400', label: t('password.weak') };
    if (score <= 3) return { score, color: 'bg-amber-400', label: t('password.fair') };
    if (score <= 4) return { score, color: 'bg-sky-400', label: t('password.good') };
    return { score, color: 'bg-emerald-400', label: t('password.strong') };
  }

  const strength = useMemo(() => getStrength(password), [password, t]);

  const checks = useMemo(() => [
    { label: t('password.min_8_chars'), met: password.length >= 8 },
    { label: t('password.uppercase'), met: /[A-Z]/.test(password) },
    { label: t('password.lowercase'), met: /[a-z]/.test(password) },
    { label: t('password.number'), met: /[0-9]/.test(password) },
    { label: t('password.special_char'), met: /[^A-Za-z0-9]/.test(password) },
    { label: t('password.passwords_match'), met: password.length > 0 && password === confirmPassword },
  ], [password, confirmPassword, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password || !confirmPassword || (!openRegistration && !registrationToken.trim())) return;

    if (password !== confirmPassword) {
      setError(t('password.passwords_no_match'));
      return;
    }

    if (password.length < 8) {
      setError(t('password.min_8_error'));
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
        setError(t('auth.unexpected_error'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <div className="relative">
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 cursor-pointer"
          >
            <Globe size={14} />
            <span>{languages.find((l) => l.code === lang)?.label ?? lang}</span>
          </button>
          {langMenuOpen && (
            <div className="absolute right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-hidden min-w-[120px]">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setLangMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer ${
                    l.code === lang
                      ? 'bg-violet-500/10 text-violet-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Left branding panel */}
      <div className="hidden lg:flex w-[480px] shrink-0 bg-zinc-900 border-r border-zinc-800 flex-col items-center justify-center px-12">
        <div className="max-w-xs text-center">
          <img src="/logo.png" alt="DriveLedger" className="h-16 w-auto object-contain mx-auto mb-8" />
          <h1 className="text-3xl font-bold text-zinc-50 mb-4">
            {t('auth.start_managing')}
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            {t('auth.create_account_desc')}
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

          <h2 className="text-2xl font-semibold text-zinc-50 mb-1">{t('auth.sign_up')}</h2>
          <p className="text-sm text-zinc-500 mb-8">{t('auth.fill_details')}</p>

          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('auth.username')}</label>
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
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('auth.email')}</label>
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
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.create_strong_password')}
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
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('auth.confirm_password')}</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.repeat_password')}
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

            {!openRegistration && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('auth.registration_token')}</label>
                <input
                  type="text"
                  value={registrationToken}
                  onChange={(e) => setRegistrationToken(e.target.value)}
                  placeholder={t('auth.paste_invitation_token')}
                  className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {t('auth.sign_up')}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-zinc-500">
            {t('auth.have_account')}{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
              {t('auth.sign_in')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
