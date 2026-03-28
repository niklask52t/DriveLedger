import { useState } from 'react';
import { User, Key, Shield, Database, SlidersHorizontal, ListPlus, Home, Languages, Code } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import ProfileTab from '../components/settings/ProfileTab';
import ApiTokensTab from '../components/settings/ApiTokensTab';
import AdminTab from '../components/settings/AdminTab';
import DataTab from '../components/settings/DataTab';
import AppearanceTab from '../components/settings/AppearanceTab';
import ExtraFieldsTab from '../components/settings/ExtraFieldsTab';
import HouseholdTab from '../components/settings/HouseholdTab';
import TranslationEditorTab from '../components/settings/TranslationEditorTab';
import CustomWidgetEditorTab from '../components/settings/CustomWidgetEditorTab';

type TabId = 'profile' | 'preferences' | 'api-tokens' | 'extra-fields' | 'household' | 'translations' | 'custom-widgets' | 'admin' | 'data';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof User;
  adminOnly?: boolean;
}

const TABS: (Tab & { i18nKey: string })[] = [
  { id: 'profile', label: 'Profile', icon: User, i18nKey: 'settings.profile' },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal, i18nKey: 'settings.preferences' },
  { id: 'api-tokens', label: 'API Tokens', icon: Key, i18nKey: 'settings.api_tokens' },
  { id: 'extra-fields', label: 'Extra Fields', icon: ListPlus, i18nKey: 'settings.extra_fields' },
  { id: 'household', label: 'Household', icon: Home, i18nKey: 'settings.household' },
  { id: 'translations', label: 'Translations', icon: Languages, adminOnly: true, i18nKey: 'settings.translations' },
  { id: 'custom-widgets', label: 'Custom Widgets', icon: Code, adminOnly: true, i18nKey: 'settings.custom_widgets' },
  { id: 'admin', label: 'Admin', icon: Shield, adminOnly: true, i18nKey: 'settings.admin' },
  { id: 'data', label: 'Data', icon: Database, i18nKey: 'settings.data' },
];

export default function Settings() {
  const { t } = useI18n();
  const { user, refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const isAdmin = user?.isAdmin ?? false;
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  // Reset to profile if on admin-only tab and no longer admin
  if ((activeTab === 'admin' || activeTab === 'translations' || activeTab === 'custom-widgets') && !isAdmin) {
    setActiveTab('profile');
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">{t('settings.title')}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-zinc-800 flex gap-1 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative',
              activeTab === tab.id
                ? 'text-violet-400'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <tab.icon size={16} />
            {t(tab.i18nKey)}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && (
          <ProfileTab user={user} refreshUser={refreshUser} logout={logout} />
        )}
        {activeTab === 'preferences' && (
          <AppearanceTab />
        )}
        {activeTab === 'api-tokens' && (
          <ApiTokensTab />
        )}
        {activeTab === 'extra-fields' && (
          <ExtraFieldsTab />
        )}
        {activeTab === 'household' && (
          <HouseholdTab />
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
        {activeTab === 'data' && (
          <DataTab />
        )}
      </div>

      {/* Version footer */}
      <div className="pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-600">{t('app.version')}</p>
      </div>
    </div>
  );
}
