import { useState, useEffect, type FormEvent } from 'react';
import {
  User as UserIcon, Key, Shield, Database,
  Plus, Trash2, Copy, Check, AlertCircle, Loader2,
  Eye, EyeOff, ToggleLeft, ToggleRight, Download, Upload,
  AlertTriangle, CheckCircle, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError } from '../api';
import type { ApiToken, RegistrationToken, User } from '../types';
import { format } from 'date-fns';

const tabs = [
  { id: 'profile', label: 'Profile', icon: <UserIcon size={18} /> },
  { id: 'tokens', label: 'API Tokens', icon: <Key size={18} /> },
  { id: 'admin', label: 'Admin', icon: <Shield size={18} /> },
  { id: 'data', label: 'Data', icon: <Database size={18} /> },
] as const;

type Tab = typeof tabs[number]['id'];

const inputClass = 'w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors';

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
      {activeTab === 'tokens' && <TokensTab />}
      {activeTab === 'admin' && user?.isAdmin && <AdminTab />}
      {activeTab === 'data' && <DataTab logout={logout} />}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────

function ProfileTab({ user, refreshUser }: { user: User | null; refreshUser: () => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User info card */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-dark-50 mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-dark-400">Username</span>
            <p className="text-dark-100 font-medium">{user?.username || '-'}</p>
          </div>
          <div>
            <span className="text-sm text-dark-400">Email</span>
            <p className="text-dark-100 font-medium">{user?.email || '-'}</p>
          </div>
          <div>
            <span className="text-sm text-dark-400">Role</span>
            <p className="text-dark-100 font-medium">{user?.isAdmin ? 'Administrator' : 'User'}</p>
          </div>
          <div>
            <span className="text-sm text-dark-400">Member since</span>
            <p className="text-dark-100 font-medium">
              {user?.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-dark-50 mb-4">Change Password</h3>

        {error && (
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-4">
            <AlertCircle size={18} className="text-danger shrink-0" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-lg px-4 py-3 mb-4">
            <CheckCircle size={18} className="text-success shrink-0" />
            <p className="text-sm text-success">{success}</p>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={`${inputClass} pr-11`}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200">
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className={`${inputClass} pr-11`}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200">
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg px-5 py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── API Tokens Tab ───────────────────────────────────────

function TokensTab() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<{ token: ApiToken; secret: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchTokens = async () => {
    try {
      const data = await api.getApiTokens();
      setTokens(data);
    } catch {
      setError('Failed to load API tokens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTokens(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const result = await api.createApiToken(newTokenName, ['read', 'write']);
      setCreatedToken(result);
      setShowCreate(false);
      setNewTokenName('');
      await fetchTokens();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create token.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await api.toggleApiToken(id, !active);
      await fetchTokens();
    } catch {
      setError('Failed to toggle token.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteApiToken(id);
      setDeleteConfirm(null);
      await fetchTokens();
    } catch {
      setError('Failed to delete token.');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-dark-400" /></div>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
          <AlertCircle size={18} className="text-danger shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Created token display */}
      {createdToken && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-warning">Save your API token now</h4>
              <p className="text-sm text-dark-400 mt-1">
                This is the only time you will see the full token. Store it somewhere safe.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-dark-400 mb-1 block">Token ID</label>
              <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-2">
                <code className="text-sm text-dark-200 flex-1 font-mono break-all">{createdToken.token.id}</code>
                <button onClick={() => copyToClipboard(createdToken.token.id, 'id')} className="shrink-0 text-dark-400 hover:text-dark-200">
                  {copiedField === 'id' ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">Secret</label>
              <div className="flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-2">
                <code className="text-sm text-dark-200 flex-1 font-mono break-all">{createdToken.secret}</code>
                <button onClick={() => copyToClipboard(createdToken.secret, 'secret')} className="shrink-0 text-dark-400 hover:text-dark-200">
                  {copiedField === 'secret' ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setCreatedToken(null)}
            className="mt-4 text-sm text-dark-400 hover:text-dark-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark-50">API Tokens</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors cursor-pointer"
        >
          <Plus size={16} /> New Token
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Token Name</label>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                required
                placeholder="e.g. Mobile App"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg px-5 py-2.5 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {creating ? <Loader2 size={18} className="animate-spin" /> : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setNewTokenName(''); }}
              className="text-dark-400 hover:text-dark-200 p-2.5 rounded-lg hover:bg-dark-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Token list */}
      <div className="space-y-3">
        {tokens.length === 0 ? (
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-8 text-center">
            <Key size={32} className="text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400">No API tokens yet. Create one to get started.</p>
          </div>
        ) : (
          tokens.map((token) => (
            <div key={token.id} className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-dark-100">{token.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${token.active ? 'bg-success/10 text-success' : 'bg-dark-700 text-dark-400'}`}>
                    {token.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-dark-500">
                  <span>Prefix: <code className="text-dark-400">{token.tokenPrefix}...</code></span>
                  <span>Permissions: {token.permissions.join(', ')}</span>
                  {token.lastUsed && <span>Last used: {format(new Date(token.lastUsed), 'MMM d, yyyy')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggle(token.id, token.active)}
                  className="text-dark-400 hover:text-dark-200 p-1.5 rounded-lg hover:bg-dark-800 transition-colors cursor-pointer"
                  title={token.active ? 'Deactivate' : 'Activate'}
                >
                  {token.active ? <ToggleRight size={20} className="text-success" /> : <ToggleLeft size={20} />}
                </button>
                {deleteConfirm === token.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(token.id)} className="text-danger hover:text-red-400 p-1.5 rounded-lg hover:bg-dark-800 cursor-pointer">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-dark-400 hover:text-dark-200 p-1.5 rounded-lg hover:bg-dark-800 cursor-pointer">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(token.id)}
                    className="text-dark-400 hover:text-danger p-1.5 rounded-lg hover:bg-dark-800 transition-colors cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Admin Tab ────────────────────────────────────────────

function AdminTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [regTokens, setRegTokens] = useState<RegistrationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [u, t] = await Promise.all([api.getUsers(), api.getRegistrationTokens()]);
      setUsers(u);
      setRegTokens(t);
    } catch {
      setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      await api.generateRegistrationToken();
      await fetchData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate token.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      setDeleteConfirm(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete user.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-dark-400" /></div>;

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
          <AlertCircle size={18} className="text-danger shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Registration Tokens */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-50">Registration Tokens</h3>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Generate Token
          </button>
        </div>

        <div className="space-y-2">
          {regTokens.length === 0 ? (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 text-center text-dark-400">
              No registration tokens generated yet.
            </div>
          ) : (
            regTokens.map((rt) => (
              <div key={rt.id} className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm text-dark-200 font-mono truncate">{rt.token}</code>
                    <button
                      onClick={() => copyToClipboard(rt.token)}
                      className="shrink-0 text-dark-400 hover:text-dark-200"
                    >
                      {copiedToken === rt.token ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-dark-500">
                    <span className={rt.used ? 'text-dark-500' : 'text-success'}>
                      {rt.used ? `Used by ${rt.usedBy || 'unknown'}` : 'Available'}
                    </span>
                    <span>Created: {format(new Date(rt.createdAt), 'MMM d, yyyy')}</span>
                    <span>Expires: {format(new Date(rt.expiresAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Users */}
      <div>
        <h3 className="text-lg font-semibold text-dark-50 mb-4">Users</h3>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-dark-100">{u.username}</span>
                  {u.isAdmin && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400">Admin</span>
                  )}
                </div>
                <p className="text-xs text-dark-500 mt-0.5">{u.email} — Joined {format(new Date(u.createdAt), 'MMM d, yyyy')}</p>
              </div>
              {!u.isAdmin && (
                deleteConfirm === u.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleDeleteUser(u.id)} className="text-danger hover:text-red-400 p-1.5 rounded-lg hover:bg-dark-800 cursor-pointer">
                      <Check size={18} />
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-dark-400 hover:text-dark-200 p-1.5 rounded-lg hover:bg-dark-800 cursor-pointer">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(u.id)}
                    className="text-dark-400 hover:text-danger p-1.5 rounded-lg hover:bg-dark-800 transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Data Management Tab ──────────────────────────────────

function DataTab({ logout }: { logout: () => Promise<void> }) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `driveledger-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Data exported successfully.');
    } catch {
      setError('Failed to export data.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setImporting(true);
      setError('');
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await api.importData(data);
        setSuccess('Data imported successfully. Refresh the page to see changes.');
      } catch {
        setError('Failed to import data. Make sure the file is valid JSON.');
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const handleDeleteAccount = async () => {
    if (deleteStep < 2) {
      setDeleteStep(deleteStep + 1);
      return;
    }
    try {
      await api.deleteAccount();
      await logout();
    } catch {
      setError('Failed to delete account.');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
          <AlertCircle size={18} className="text-danger shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-lg px-4 py-3">
          <CheckCircle size={18} className="text-success shrink-0" />
          <p className="text-sm text-success">{success}</p>
        </div>
      )}

      {/* Export */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-dark-50 mb-2">Export Data</h3>
        <p className="text-sm text-dark-400 mb-4">Download all your data as a JSON file.</p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-dark-700 hover:bg-dark-600 text-dark-100 font-medium rounded-lg px-5 py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          Export JSON
        </button>
      </div>

      {/* Import */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-dark-50 mb-2">Import Data</h3>
        <p className="text-sm text-dark-400 mb-4">Import data from a previously exported JSON file. This will merge with your existing data.</p>
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-2 bg-dark-700 hover:bg-dark-600 text-dark-100 font-medium rounded-lg px-5 py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          Import JSON
        </button>
      </div>

      {/* Delete Account */}
      <div className="bg-danger/5 border border-danger/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-danger mb-2">Delete Account</h3>
        <p className="text-sm text-dark-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={handleDeleteAccount}
          className="flex items-center gap-2 bg-danger hover:bg-red-600 text-white font-medium rounded-lg px-5 py-2.5 transition-colors cursor-pointer"
        >
          <AlertTriangle size={18} />
          {deleteStep === 0 && 'Delete Account'}
          {deleteStep === 1 && 'Are you sure?'}
          {deleteStep === 2 && 'Click again to confirm deletion'}
        </button>
        {deleteStep > 0 && (
          <button
            onClick={() => setDeleteStep(0)}
            className="mt-2 text-sm text-dark-400 hover:text-dark-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
