import { useState, useEffect } from 'react';
import { Loader2, Check, Save } from 'lucide-react';
import { api } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { cn } from '../../lib/utils';

const TAB_OPTIONS: { id: string; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'costs', label: 'Costs' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'repairs', label: 'Repairs' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'taxes', label: 'Taxes' },
  { id: 'loans', label: 'Loans' },
  { id: 'savings', label: 'Savings' },
  { id: 'supplies', label: 'Supplies' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'planner', label: 'Planner' },
  { id: 'purchase-planner', label: 'Purchase Planner' },
  { id: 'services', label: 'Services' },
];

const FUEL_ECONOMY_OPTIONS = [
  { value: 'l_per_100km', label: 'L/100km' },
  { value: 'mpg_us', label: 'MPG (US)' },
  { value: 'mpg_uk', label: 'MPG (UK)' },
  { value: 'km_per_l', label: 'KM/L' },
];

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CHF', label: 'CHF' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

interface AdminDefaults {
  language: string;
  theme: string;
  unitSystem: string;
  fuelEconomyUnit: string;
  currency: string;
  dateFormat: string;
  visibleTabs: string[];
}

export default function AdminDefaultsTab() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState<AdminDefaults>({
    language: 'en',
    theme: 'dark',
    unitSystem: 'metric',
    fuelEconomyUnit: 'l_per_100km',
    currency: 'EUR',
    dateFormat: 'DD.MM.YYYY',
    visibleTabs: [],
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAdminDefaults();
        setDefaults(data);
      } catch (err) {
        console.error('Failed to load admin defaults:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateAdminDefaults(defaults);
      setDefaults(updated);
      setMessage({ type: 'success', text: 'Defaults saved successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save defaults.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTab = (tabId: string) => {
    setDefaults((prev) => ({
      ...prev,
      visibleTabs: prev.visibleTabs.includes(tabId)
        ? prev.visibleTabs.filter((t) => t !== tabId)
        : [...prev.visibleTabs, tabId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  const selectClass = 'w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500';

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Description */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300">{t('settings.admin_defaults')}</h3>
        <p className="text-xs text-zinc-500 mt-1">{t('settings.admin_defaults_desc')}</p>
      </div>

      {/* Default Language */}
      <Section title="Default Language" description="Language applied to new user accounts.">
        <select
          value={defaults.language}
          onChange={(e) => setDefaults((prev) => ({ ...prev, language: e.target.value }))}
          className={selectClass}
        >
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
      </Section>

      {/* Default Theme */}
      <Section title="Default Theme" description="Theme applied to new user accounts.">
        <div className="flex gap-3">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setDefaults((prev) => ({ ...prev, theme: t }))}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                defaults.theme === t
                  ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50'
              )}
            >
              {t === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
      </Section>

      {/* Default Unit System */}
      <Section title="Default Unit System" description="Unit system applied to new user accounts.">
        <div className="flex gap-3">
          {(['metric', 'imperial'] as const).map((unit) => (
            <button
              key={unit}
              onClick={() => setDefaults((prev) => ({ ...prev, unitSystem: unit }))}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                defaults.unitSystem === unit
                  ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50'
              )}
            >
              {unit === 'metric' ? 'Metric (km, liters)' : 'Imperial (miles, gallons)'}
            </button>
          ))}
        </div>
      </Section>

      {/* Default Fuel Economy Unit */}
      <Section title="Default Fuel Economy Unit" description="Fuel economy unit applied to new user accounts.">
        <select
          value={defaults.fuelEconomyUnit}
          onChange={(e) => setDefaults((prev) => ({ ...prev, fuelEconomyUnit: e.target.value }))}
          className={selectClass}
        >
          {FUEL_ECONOMY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Section>

      {/* Default Currency */}
      <Section title="Default Currency" description="Currency applied to new user accounts.">
        <select
          value={defaults.currency}
          onChange={(e) => setDefaults((prev) => ({ ...prev, currency: e.target.value }))}
          className={selectClass}
        >
          {CURRENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Section>

      {/* Default Date Format */}
      <Section title="Default Date Format" description="Date format applied to new user accounts.">
        <select
          value={defaults.dateFormat}
          onChange={(e) => setDefaults((prev) => ({ ...prev, dateFormat: e.target.value }))}
          className={selectClass}
        >
          {DATE_FORMAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Section>

      {/* Default Visible Tabs */}
      <Section title="Default Visible Tabs" description="Tabs visible by default for new user accounts.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TAB_OPTIONS.map((tab) => {
            const isChecked = (defaults.visibleTabs || []).includes(tab.id);
            return (
              <label
                key={tab.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                  isChecked
                    ? 'border-violet-500/50 bg-violet-500/10'
                    : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
                    isChecked
                      ? 'bg-violet-500 border-violet-500'
                      : 'border-zinc-600 bg-transparent'
                  )}
                >
                  {isChecked && <Check size={13} className="text-white" />}
                </div>
                <span className={cn('text-sm', isChecked ? 'text-zinc-200' : 'text-zinc-400')}>
                  {tab.label}
                </span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggleTab(tab.id)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      </Section>

      {/* Save button & message */}
      {message && (
        <div
          className={`text-sm px-3 py-2 rounded-lg ${
            message.type === 'success'
              ? 'bg-emerald-400/10 text-emerald-400'
              : 'bg-red-400/10 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save Defaults
      </button>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-50">{title}</h3>
        <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}
