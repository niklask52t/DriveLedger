import { useMemo } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserConfig } from '../../contexts/UserConfigContext';
import { cn } from '../../lib/utils';

type ThemeOption = 'light' | 'dark' | 'system';

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

export default function AppearanceTab() {
  const { theme, resolvedTheme, useSystemTheme, setTheme, setUseSystemTheme } = useTheme();
  const { config, updateConfig } = useUserConfig();

  const currentTheme: ThemeOption = useSystemTheme ? 'system' : theme;

  const handleThemeSelect = (option: ThemeOption) => {
    if (option === 'system') {
      setUseSystemTheme(true);
      updateConfig({ useSystemTheme: true });
    } else {
      setUseSystemTheme(false);
      setTheme(option);
      updateConfig({ theme: option, useSystemTheme: false });
    }
  };

  const themeOptions: { id: ThemeOption; label: string; description: string; icon: typeof Sun }[] = [
    { id: 'dark', label: 'Dark', description: 'Dark background with light text', icon: Moon },
    { id: 'light', label: 'Light', description: 'Light background with dark text', icon: Sun },
    { id: 'system', label: 'System', description: 'Follows your operating system preference', icon: Monitor },
  ];

  const handleToggleTab = (tabId: string) => {
    const current = config.visibleTabs || [];
    const updated = current.includes(tabId)
      ? current.filter((t) => t !== tabId)
      : [...current, tabId];
    updateConfig({ visibleTabs: updated });
  };

  const handleToggle = (key: 'enableCsvImports' | 'enableMarkdownNotes' | 'showCalendar' | 'hideZeroCosts' | 'hideSoldVehicles' | 'threeDecimalFuel' | 'enableAutoFillOdometer' | 'useDescending' | 'enableAutoReminderRefresh' | 'showSearch') => {
    updateConfig({ [key]: !config[key] });
  };

  // Locale format preview
  const localePreview = useMemo(() => {
    const sampleDate = new Date(2026, 2, 15, 14, 30); // March 15, 2026
    const sampleNumber = 12345.67;

    const currencyMap: Record<string, string> = {
      EUR: 'de-DE', USD: 'en-US', GBP: 'en-GB', CHF: 'de-CH',
    };
    const locale = currencyMap[config.currency] || 'en-US';

    let formattedDate: string;
    switch (config.dateFormat) {
      case 'DD.MM.YYYY':
        formattedDate = `${String(sampleDate.getDate()).padStart(2, '0')}.${String(sampleDate.getMonth() + 1).padStart(2, '0')}.${sampleDate.getFullYear()}`;
        break;
      case 'MM/DD/YYYY':
        formattedDate = `${String(sampleDate.getMonth() + 1).padStart(2, '0')}/${String(sampleDate.getDate()).padStart(2, '0')}/${sampleDate.getFullYear()}`;
        break;
      case 'YYYY-MM-DD':
        formattedDate = `${sampleDate.getFullYear()}-${String(sampleDate.getMonth() + 1).padStart(2, '0')}-${String(sampleDate.getDate()).padStart(2, '0')}`;
        break;
      default:
        formattedDate = sampleDate.toLocaleDateString(locale);
    }

    const formattedCurrency = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: config.currency,
    }).format(sampleNumber);

    const formattedNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(sampleNumber);

    return { formattedDate, formattedCurrency, formattedNumber };
  }, [config.currency, config.dateFormat]);

  return (
    <div className="space-y-10 max-w-2xl">
      {/* ── Language ── */}
      <Section title="Language" description="Select the display language for the interface.">
        <select
          value={config.language}
          onChange={(e) => updateConfig({ language: e.target.value })}
          className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
        >
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
      </Section>

      {/* ── Theme ── */}
      <Section title="Theme" description="Choose how DriveLedger looks to you.">
        <div className="grid gap-3">
          {themeOptions.map((option) => {
            const isActive = currentTheme === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handleThemeSelect(option.id)}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border text-left transition-colors',
                  isActive
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    isActive ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-400'
                  )}
                >
                  <option.icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', isActive ? 'text-violet-400' : 'text-zinc-200')}>
                    {option.label}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{option.description}</p>
                </div>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
        {useSystemTheme && (
          <p className="text-xs text-zinc-500 mt-3">
            Currently using <span className="text-zinc-400 font-medium">{resolvedTheme}</span> mode based on your system preference.
          </p>
        )}
      </Section>

      {/* ── Unit System ── */}
      <Section title="Unit System" description="Choose between metric and imperial units.">
        <div className="flex gap-3">
          {(['metric', 'imperial'] as const).map((unit) => (
            <button
              key={unit}
              onClick={() => updateConfig({ unitSystem: unit })}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                config.unitSystem === unit
                  ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50'
              )}
            >
              {unit === 'metric' ? 'Metric (km, liters)' : 'Imperial (miles, gallons)'}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Fuel Economy Unit ── */}
      <Section title="Fuel Economy Unit" description="Select the unit used for fuel consumption display.">
        <select
          value={config.fuelEconomyUnit}
          onChange={(e) => updateConfig({ fuelEconomyUnit: e.target.value })}
          className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
        >
          {FUEL_ECONOMY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Section>

      {/* ── Currency ── */}
      <Section title="Currency" description="Select the currency used across the app.">
        <select
          value={config.currency}
          onChange={(e) => updateConfig({ currency: e.target.value })}
          className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
        >
          {CURRENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Section>

      {/* ── Date Format ── */}
      <Section title="Date Format" description="Choose how dates are displayed.">
        <select
          value={config.dateFormat}
          onChange={(e) => updateConfig({ dateFormat: e.target.value })}
          className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
        >
          {DATE_FORMAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Section>

      {/* ── Locale Preview ── */}
      <Section title="Format Preview" description="See how dates, numbers, and currency look with your current settings.">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Date</span>
            <span className="text-sm text-zinc-200 font-mono">{localePreview.formattedDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Currency</span>
            <span className="text-sm text-zinc-200 font-mono">{localePreview.formattedCurrency}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Number</span>
            <span className="text-sm text-zinc-200 font-mono">{localePreview.formattedNumber}</span>
          </div>
        </div>
      </Section>

      {/* ── Visible Tabs ── */}
      <Section title="Visible Tabs" description="Choose which tabs are shown in the navigation.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TAB_OPTIONS.map((tab) => {
            const isChecked = (config.visibleTabs || []).includes(tab.id);
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

      {/* ── Vehicle Identifier ── */}
      <Section title="Vehicle Identifier" description="Choose which field is used to identify vehicles in dropdowns and cards.">
        <select
          value={config.vehicleIdentifier || 'name'}
          onChange={(e) => updateConfig({ vehicleIdentifier: e.target.value })}
          className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
        >
          <option value="name">Name</option>
          <option value="license_plate">License Plate</option>
          <option value="custom_field:brand">Brand</option>
          <option value="custom_field:model">Model</option>
          <option value="custom_field:variant">Variant</option>
        </select>
      </Section>

      {/* ── Feature Toggles ── */}
      <Section title="Features" description="Enable or disable optional features.">
        <div className="space-y-3">
          <ToggleRow
            label="Enable CSV Import/Export"
            description="Allow importing and exporting data as CSV files."
            checked={config.enableCsvImports}
            onChange={() => handleToggle('enableCsvImports')}
          />
          <ToggleRow
            label="Enable Markdown in Notes"
            description="Render Markdown formatting in vehicle notes."
            checked={config.enableMarkdownNotes}
            onChange={() => handleToggle('enableMarkdownNotes')}
          />
          <ToggleRow
            label="Show Reminder Calendar"
            description="Display a calendar view for reminders."
            checked={config.showCalendar}
            onChange={() => handleToggle('showCalendar')}
          />
          <ToggleRow
            label="Hide Zero Costs"
            description="Hide cost entries with a zero amount."
            checked={config.hideZeroCosts}
            onChange={() => handleToggle('hideZeroCosts')}
          />
          <ToggleRow
            label="Hide Sold Vehicles"
            description="Hide vehicles with a sold date from the vehicles list."
            checked={config.hideSoldVehicles || false}
            onChange={() => handleToggle('hideSoldVehicles')}
          />
          <ToggleRow
            label="Three Decimal Fuel Precision"
            description="Display fuel costs and consumption with 3 decimal places."
            checked={config.threeDecimalFuel || false}
            onChange={() => handleToggle('threeDecimalFuel')}
          />
          <ToggleRow
            label="Auto-fill Odometer from Last Entry"
            description="Pre-fill the mileage field with the vehicle's current mileage when adding new records."
            checked={config.enableAutoFillOdometer !== false}
            onChange={() => handleToggle('enableAutoFillOdometer')}
          />
          <ToggleRow
            label="Default Sort: Descending"
            description="Use descending as the default sort direction in table views."
            checked={config.useDescending || false}
            onChange={() => handleToggle('useDescending')}
          />
          <ToggleRow
            label="Auto-Refresh Reminders"
            description="Automatically advance past-due recurring reminders to their next occurrence."
            checked={config.enableAutoReminderRefresh !== false}
            onChange={() => handleToggle('enableAutoReminderRefresh')}
          />
          <ToggleRow
            label="Show Search Bar"
            description="Display the global search bar in the header."
            checked={config.showSearch !== false}
            onChange={() => handleToggle('showSearch')}
          />
        </div>
      </Section>
    </div>
  );
}

/* ── Helper components ── */

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

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'flex items-center justify-between w-full px-4 py-3 rounded-lg border text-left transition-colors',
        checked
          ? 'border-violet-500/30 bg-violet-500/5'
          : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
      )}
    >
      <div className="min-w-0 mr-4">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <div
        className={cn(
          'relative w-10 h-6 rounded-full shrink-0 transition-colors',
          checked ? 'bg-violet-500' : 'bg-zinc-700'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          )}
        />
      </div>
    </button>
  );
}
