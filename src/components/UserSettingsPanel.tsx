import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, SlidersHorizontal, Key } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import ProfileTab from './settings/ProfileTab';
import AppearanceTab from './settings/AppearanceTab';
import ApiTokensTab from './settings/ApiTokensTab';

type UserTabId = 'profile' | 'preferences' | 'api-tokens';

interface UserSettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const USER_TABS: { id: UserTabId; i18nKey: string; icon: typeof User }[] = [
  { id: 'profile', i18nKey: 'settings.profile', icon: User },
  { id: 'preferences', i18nKey: 'settings.preferences', icon: SlidersHorizontal },
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
            className="fixed inset-y-0 left-0 lg:left-60 w-full max-w-2xl bg-zinc-950 border-r border-zinc-800 z-50 flex flex-col shadow-2xl"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
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
              {activeTab === 'api-tokens' && (
                <ApiTokensTab />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
