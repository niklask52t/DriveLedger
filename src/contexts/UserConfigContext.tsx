import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api } from '../api';
import { useI18n } from './I18nContext';
import { useTheme } from './ThemeContext';
import type { UserConfig } from '../types';

const defaultConfig: UserConfig = {
  language: 'en',
  theme: 'dark',
  useSystemTheme: false,
  unitSystem: 'metric',
  fuelEconomyUnit: 'l_per_100km',
  useUkMpg: false,
  preferredGasUnit: 'liters',
  visibleTabs: [
    'dashboard', 'vehicles', 'costs', 'fuel', 'repairs', 'inspections',
    'taxes', 'loans', 'savings', 'supplies', 'equipment', 'reminders',
    'planner', 'purchase-planner', 'services',
  ],
  tabOrder: [],
  defaultTab: 'dashboard',
  enableCsvImports: true,
  enableMarkdownNotes: true,
  showCalendar: false,
  hideZeroCosts: false,
  currency: 'EUR',
  dateFormat: 'DD.MM.YYYY',
  columnPreferences: {},
  vehicleIdentifier: 'name',
  enableAutoFillOdometer: true,
  useDescending: false,
  enableAutoReminderRefresh: true,
  showSearch: true,
};

interface UserConfigContextValue {
  config: UserConfig;
  updateConfig: (partial: Partial<UserConfig>) => Promise<void>;
  loaded: boolean;
  loadConfig: () => Promise<void>;
}

const UserConfigContext = createContext<UserConfigContextValue>({
  config: defaultConfig,
  updateConfig: async () => {},
  loaded: false,
  loadConfig: async () => {},
});

export function UserConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<UserConfig>(defaultConfig);
  const [loaded, setLoaded] = useState(false);
  const { setLang } = useI18n();
  const { setTheme, setUseSystemTheme } = useTheme();

  const applyConfig = useCallback((cfg: UserConfig) => {
    setConfig(cfg);
    setLang(cfg.language);
    setTheme(cfg.theme as 'dark' | 'light');
    setUseSystemTheme(cfg.useSystemTheme);
  }, [setLang, setTheme, setUseSystemTheme]);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await api.getUserConfig();
      applyConfig(cfg);
    } catch {
      // use defaults
    } finally {
      setLoaded(true);
    }
  }, [applyConfig]);

  const updateConfig = useCallback(async (partial: Partial<UserConfig>) => {
    try {
      const updated = await api.updateUserConfig(partial);
      applyConfig(updated);
    } catch {
      // ignore
    }
  }, [applyConfig]);

  return (
    <UserConfigContext.Provider value={{ config, updateConfig, loaded, loadConfig }}>
      {children}
    </UserConfigContext.Provider>
  );
}

export function useUserConfig() {
  return useContext(UserConfigContext);
}
