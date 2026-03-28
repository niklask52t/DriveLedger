import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Download, Upload, Save } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { translations as builtInTranslations, languages } from '../../i18n';
import { api } from '../../api';

export default function TranslationEditorTab() {
  const { t, lang: currentLang } = useI18n();
  const [selectedLang, setSelectedLang] = useState(currentLang === 'en' ? 'de' : currentLang);
  const [search, setSearch] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // All translation keys from English
  const allKeys = useMemo(() => Object.keys(builtInTranslations['en'] || {}), []);

  // Load custom translations for selected language
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/translations/${selectedLang}`, {
          headers: api.getToken() ? { 'Authorization': `Bearer ${api.getToken()}` } : {},
          credentials: 'include',
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setCustomValues(data || {});
        }
      } catch {
        // Ignore
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLang]);

  // Filtered keys
  const filteredKeys = useMemo(() => {
    if (!search.trim()) return allKeys;
    const q = search.toLowerCase();
    return allKeys.filter(
      (key) =>
        key.toLowerCase().includes(q) ||
        (builtInTranslations['en']?.[key] || '').toLowerCase().includes(q) ||
        (builtInTranslations[selectedLang]?.[key] || '').toLowerCase().includes(q)
    );
  }, [allKeys, search, selectedLang]);

  const handleValueChange = (key: string, value: string) => {
    setCustomValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Only save values that differ from built-in
      const toSave: Record<string, string> = {};
      for (const [key, value] of Object.entries(customValues)) {
        if (value && value !== builtInTranslations[selectedLang]?.[key]) {
          toSave[key] = value;
        }
      }
      const res = await fetch(`/api/translations/${selectedLang}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(api.getToken() ? { 'Authorization': `Bearer ${api.getToken()}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(toSave),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('translations.save_success') });
      } else {
        setMessage({ type: 'error', text: t('translations.save_error') });
      }
    } catch {
      setMessage({ type: 'error', text: t('translations.save_error') });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    // Merge built-in with custom overrides for full export
    const merged: Record<string, string> = { ...(builtInTranslations[selectedLang] || {}) };
    for (const [k, v] of Object.entries(customValues)) {
      if (v) merged[k] = v;
    }
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations-${selectedLang}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (typeof imported !== 'object') throw new Error('Invalid JSON');

      const res = await fetch(`/api/translations/${selectedLang}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(api.getToken() ? { 'Authorization': `Bearer ${api.getToken()}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(imported),
      });

      if (res.ok) {
        setCustomValues(imported);
        setMessage({ type: 'success', text: t('translations.import_success') });
      } else {
        setMessage({ type: 'error', text: t('translations.import_error') });
      }
    } catch {
      setMessage({ type: 'error', text: t('translations.import_error') });
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getDisplayValue = (key: string) => {
    return customValues[key] || builtInTranslations[selectedLang]?.[key] || '';
  };

  const isModified = (key: string) => {
    return customValues[key] && customValues[key] !== builtInTranslations[selectedLang]?.[key];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">{t('translations.title')}</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Edit translations for any language. Custom translations override the built-in defaults.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Language selector */}
        <select
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2 text-sm"
        >
          {languages.filter((l) => l.code !== 'en').map((l) => (
            <option key={l.code} value={l.code}>
              {l.label} ({l.code})
            </option>
          ))}
        </select>

        {/* Search */}
        <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search size={16} className="text-zinc-500" />
          <input
            type="text"
            placeholder={t('translations.search_keys')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-zinc-200 outline-none flex-1"
          />
        </div>

        {/* Action buttons */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? t('common.saving') : t('translations.save_translations')}
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm"
        >
          <Download size={16} />
          {t('translations.export_json')}
        </button>
        <button
          onClick={handleImport}
          className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm"
        >
          <Upload size={16} />
          {t('translations.import_json')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`text-sm px-4 py-2 rounded-lg ${
            message.type === 'success'
              ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-800'
              : 'bg-red-900/50 text-red-300 border border-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Translation table */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/80 sticky top-0 z-10">
              <tr>
                <th className="text-left text-zinc-400 font-medium px-4 py-3 w-[250px]">{t('translations.key')}</th>
                <th className="text-left text-zinc-400 font-medium px-4 py-3 w-[300px]">{t('translations.english_value')}</th>
                <th className="text-left text-zinc-400 font-medium px-4 py-3">{t('translations.current_value')}</th>
                <th className="text-center text-zinc-400 font-medium px-4 py-3 w-[80px]"></th>
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((key) => (
                <tr key={key} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-2 text-zinc-400 font-mono text-xs break-all">{key}</td>
                  <td className="px-4 py-2 text-zinc-300 text-xs">{builtInTranslations['en']?.[key] || ''}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={getDisplayValue(key)}
                      onChange={(e) => handleValueChange(key, e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded px-2 py-1 text-xs focus:border-violet-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    {isModified(key) && (
                      <span className="inline-block w-2 h-2 rounded-full bg-violet-500" title={t('translations.modified')} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-600">
        {filteredKeys.length} / {allKeys.length} keys shown
      </p>
    </div>
  );
}
