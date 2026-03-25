import { useState } from 'react';
import { User as UserIcon, Key, Shield, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ProfileTab from '../components/settings/ProfileTab';
import ApiTokensTab from '../components/settings/ApiTokensTab';
import AdminTab from '../components/settings/AdminTab';
import DataTab from '../components/settings/DataTab';

const tabs = [
  { id: 'profile', label: 'Profile', icon: <UserIcon size={18} /> },
  { id: 'tokens', label: 'API Tokens', icon: <Key size={18} /> },
  { id: 'admin', label: 'Admin', icon: <Shield size={18} /> },
  { id: 'data', label: 'Data', icon: <Database size={18} /> },
] as const;

type Tab = typeof tabs[number]['id'];

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const visibleTabs = tabs.filter((t) => t.id !== 'admin' || user?.isAdmin);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-dark-900 rounded-xl p-1 border border-dark-800">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'profile' && <ProfileTab user={user} refreshUser={refreshUser} />}
      {activeTab === 'tokens' && <ApiTokensTab />}
      {activeTab === 'admin' && user?.isAdmin && <AdminTab />}
      {activeTab === 'data' && <DataTab logout={logout} />}
    </div>
  );
}
