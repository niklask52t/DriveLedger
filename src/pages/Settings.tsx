import { useState } from 'react';
import { User, Key, Shield, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import ProfileTab from '../components/settings/ProfileTab';
import ApiTokensTab from '../components/settings/ApiTokensTab';
import AdminTab from '../components/settings/AdminTab';
import DataTab from '../components/settings/DataTab';

type TabId = 'profile' | 'api-tokens' | 'admin' | 'data';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof User;
  adminOnly?: boolean;
}

const TABS: Tab[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'api-tokens', label: 'API Tokens', icon: Key },
  { id: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
  { id: 'data', label: 'Data', icon: Database },
];

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const isAdmin = user?.isAdmin ?? false;
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  // Reset to profile if on admin tab and no longer admin
  if (activeTab === 'admin' && !isAdmin) {
    setActiveTab('profile');
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your account and application settings</p>
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
            {tab.label}
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
        {activeTab === 'api-tokens' && (
          <ApiTokensTab />
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
        <p className="text-xs text-zinc-600">DriveLedger v2.0.0</p>
      </div>
    </div>
  );
}
