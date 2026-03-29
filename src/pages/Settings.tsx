import { useState } from 'react';
import { Users, Database, Languages, Code, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { APP_VERSION_STRING } from '../lib/version';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import AdminTab from '../components/settings/AdminTab';
import DataTab from '../components/settings/DataTab';
import TranslationEditorTab from '../components/settings/TranslationEditorTab';
import CustomWidgetEditorTab from '../components/settings/CustomWidgetEditorTab';
import AdminDefaultsTab from '../components/settings/AdminDefaultsTab';

type TabId = 'admin-defaults' | 'translations' | 'custom-widgets' | 'admin' | 'data';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof Shield;
  adminOnly?: boolean;
}

const TABS: (Tab & { i18nKey: string })[] = [
  { id: 'admin-defaults', label: 'Defaults', icon: SlidersHorizontal, adminOnly: true, i18nKey: 'settings.admin_defaults' },
  { id: 'admin', label: 'Users', icon: Users, adminOnly: true, i18nKey: 'settings.users' },
  { id: 'translations', label: 'Translations', icon: Languages, adminOnly: true, i18nKey: 'settings.translations' },
  { id: 'custom-widgets', label: 'Custom Widgets', icon: Code, adminOnly: true, i18nKey: 'settings.custom_widgets' },
  { id: 'data', label: 'Data', icon: Database, adminOnly: true, i18nKey: 'settings.data' },
];

export default function Settings() {
  const { t } = useI18n();
  const { user } = useAuth();

  const isAdmin = user?.isAdmin ?? false;
  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);

  // Default to first visible tab
  const defaultTab = visibleTabs.length > 0 ? visibleTabs[0].id : 'data';
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  // Reset to a valid tab if current is no longer visible
  if (!visibleTabs.some((tab) => tab.id === activeTab)) {
    setActiveTab(defaultTab);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">
          {t('settings.admin_settings')}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800 flex flex-wrap gap-1">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors relative rounded-t-lg',
              activeTab === tab.id
                ? 'text-violet-400 bg-violet-500/5'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <tab.icon size={15} />
            {t(tab.i18nKey)}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'admin-defaults' && isAdmin && (
          <AdminDefaultsTab />
        )}
        {activeTab === 'translations' && isAdmin && (
          <TranslationEditorTab />
        )}
        {activeTab === 'custom-widgets' && isAdmin && (
          <CustomWidgetEditorTab />
        )}
        {activeTab === 'admin' && isAdmin && (
          <AdminTab />
        )}
        {activeTab === 'data' && isAdmin && (
          <DataTab />
        )}
      </div>

      {/* Version footer */}
      <div className="pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-600">{APP_VERSION_STRING}</p>
      </div>
    </div>
  );
}
