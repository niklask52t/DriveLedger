import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, Globe, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { ApiError } from '../api';
import type { Page } from '../types';

interface LoginProps {
  onNavigate: (page: Page) => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const { login } = useAuth();
  const { t, lang, setLang, languages } = useI18n();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcOnly, setOidcOnly] = useState(false);
  const [oidcProviderName, setOidcProviderName] = useState('SSO');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [customMotd, setCustomMotd] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.oidcEnabled) {
          setOidcEnabled(true);
          setOidcProviderName(data.oidcProviderName || 'SSO');
        }
        if (data.oidcOnly) setOidcOnly(true);
        if (data.customLogoUrl) setCustomLogoUrl(data.customLogoUrl);
        if (data.customMotd) setCustomMotd(data.customMotd);
      })
      .catch(() => { /* ignore config fetch errors */ });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setError('');
    setLoading(true);

    try {
      await login(identifier.trim(), password);
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
          <img src={customLogoUrl || '/logo.png'} alt="DriveLedger" className="h-24 w-auto object-contain mx-auto mb-8" />
          <h1 className="text-3xl font-bold text-zinc-50 mb-4">
            {t('login.tagline')}
          </h1>
          <p className="text-zinc-400 text-base leading-relaxed">
            {t('login.subtitle')}
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-zinc-950">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <img src={customLogoUrl || '/logo.png'} alt="DriveLedger" className="h-9 w-auto object-contain" />
          </div>

          <h2 className="text-2xl font-semibold text-zinc-50 mb-1">{t('auth.sign_in')}</h2>
          <p className="text-sm text-zinc-500 mb-8">
            {oidcOnly ? `Sign in with ${oidcProviderName} to continue` : t('auth.enter_credentials')}
          </p>

          {customMotd && (
            <div className="bg-violet-400/10 border border-violet-400/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-violet-300">{customMotd}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {!oidcOnly && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  {t('auth.email_or_username')}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.enter_password')}
                    className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 pr-10 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-sm text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                >
                  {t('auth.forgot_password')}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {t('auth.sign_in')}
              </button>
            </form>
          )}

          {oidcEnabled && (
            <div className={oidcOnly ? '' : 'mt-6'}>
              {!oidcOnly && (
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-zinc-950 px-3 text-zinc-500">or</span>
                  </div>
                </div>
              )}
              <a
                href="/api/oidc/authorize"
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-50 rounded-lg h-10 px-5 text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn size={16} />
                Sign in with {oidcProviderName}
              </a>
            </div>
          )}

          {!oidcOnly && (
            <p className="mt-8 text-center text-sm text-zinc-500">
              {t('auth.no_account')}{' '}
              <button
                onClick={() => onNavigate('register')}
                className="text-violet-400 hover:text-violet-300 transition-colors font-medium cursor-pointer"
              >
                {t('auth.create_one')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
