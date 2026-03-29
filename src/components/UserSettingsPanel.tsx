import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, SlidersHorizontal, Key, ListPlus, Home, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import ProfileTab from './settings/ProfileTab';
import AppearanceTab from './settings/AppearanceTab';
import ApiTokensTab from './settings/ApiTokensTab';
import ExtraFieldsTab from './settings/ExtraFieldsTab';
import HouseholdTab from './settings/HouseholdTab';
import UserDataTab from './settings/UserDataTab';

type UserTabId = 'profile' | 'preferences' | 'extra-fields' | 'household' | 'data' | 'api-tokens';

interface UserSettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const USER_TABS: { id: UserTabId; i18nKey: string; icon: typeof User }[] = [
  { id: 'profile', i18nKey: 'settings.profile', icon: User },
  { id: 'preferences', i18nKey: 'settings.preferences', icon: SlidersHorizontal },
  { id: 'extra-fields', i18nKey: 'settings.extra_fields', icon: ListPlus },
  { id: 'household', i18nKey: 'settings.household', icon: Home },
  { id: 'data', i18nKey: 'settings.data', icon: Database },
  { id: 'api-tokens', i18nKey: 'settings.api_tokens', icon: Key },
];

export default function UserSettingsPanel({ open, onClose }: UserSettingsPanelProps) {
  const { t } = useI18n();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<UserTabId>('profile');

  if (!user) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'tween', duration: 0.2 }}
          >
          <div className="w-full max-w-4xl h-full max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
              <h2 className="text-lg font-semibold text-zinc-50">{t('settings.user_settings')}</h2>
              <button
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-zinc-800 px-6 flex gap-1 shrink-0">
              {USER_TABS.map((tab) => (
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
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'profile' && (
                <ProfileTab user={user} refreshUser={refreshUser} />
              )}
              {activeTab === 'preferences' && (
                <AppearanceTab />
              )}
              {activeTab === 'extra-fields' && (
                <ExtraFieldsTab />
              )}
              {activeTab === 'household' && (
                <HouseholdTab />
              )}
              {activeTab === 'data' && (
                <UserDataTab />
              )}
              {activeTab === 'api-tokens' && (
                <ApiTokensTab />
              )}
            </div>
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
