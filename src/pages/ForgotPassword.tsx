import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Mail, CheckCircle2, AlertTriangle, Globe } from 'lucide-react';
import { api, ApiError } from '../api';
import { useI18n } from '../contexts/I18nContext';
import type { Page, AppConfig } from '../types';

interface ForgotPasswordProps {
  onNavigate: (page: Page) => void;
}

export default function ForgotPassword({ onNavigate }: ForgotPasswordProps) {
  const { t, lang, setLang, languages } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

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
        setError(t('auth.unexpected_error'));
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
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-zinc-950 relative">
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

      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {!emailEnabled ? (
            /* Email not enabled */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={22} className="text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-50 mb-2">{t('forgot.email_not_configured')}</h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                {t('forgot.email_not_configured_desc')}
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium inline-flex items-center gap-2"
              >
                <ArrowLeft size={14} />
                {t('auth.back_to_login')}
              </button>
            </div>
          ) : sent ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={22} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-50 mb-2">{t('forgot.check_email')}</h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                {t('forgot.check_email_desc', { email })}
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium inline-flex items-center gap-2"
              >
                <ArrowLeft size={14} />
                {t('auth.back_to_login')}
              </button>
            </div>
          ) : (
            /* Form */
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-5">
                  <Mail size={22} className="text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-50 mb-2">{t('forgot.title')}</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {t('forgot.description')}
                </p>
              </div>

              {error && (
                <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-5">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">{t('forgot.email_address')}</label>
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
                  {t('auth.send_reset_link')}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => onNavigate('login')}
                  className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium inline-flex items-center gap-2"
                >
                  <ArrowLeft size={14} />
                  {t('auth.back_to_login')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
