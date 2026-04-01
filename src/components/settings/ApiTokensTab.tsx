import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Copy, Check, Key, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../../api';
import { formatDate } from '../../utils';
import type { ApiToken } from '../../types';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

const PERMISSION_OPTIONS = [
  { value: 'vehicles:read', label: 'Read Vehicles' },
  { value: 'vehicles:write', label: 'Write Vehicles' },
  { value: 'costs:read', label: 'Read Costs' },
  { value: 'costs:write', label: 'Write Costs' },
  { value: 'loans:read', label: 'Read Loans' },
  { value: 'loans:write', label: 'Write Loans' },
  { value: 'repairs:read', label: 'Read Repairs' },
  { value: 'repairs:write', label: 'Write Repairs' },
  { value: 'savings:read', label: 'Read Savings' },
  { value: 'savings:write', label: 'Write Savings' },
];

export default function ApiTokensTab() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTokens = useCallback(async () => {
    try {
      const data = await api.getApiTokens();
      setTokens(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load tokens.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleCreate = async () => {
    if (!tokenName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await api.createApiToken(tokenName.trim(), selectedPermissions);
      setNewSecret(result.secret);
      setTokenName('');
      setSelectedPermissions([]);
      setShowCreate(false);
      await loadTokens();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create token.';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (token: ApiToken) => {
    try {
      await api.toggleApiToken(token.id, !token.active);
      await loadTokens();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle token.';
      setError(msg);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteApiToken(id);
      setDeleteConfirm(null);
      await loadTokens();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete token.';
      setError(msg);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-400/10 text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>
      )}

      {/* New secret display */}
      {newSecret && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-emerald-400 mb-2">Token Created</h3>
          <p className="text-xs text-zinc-400 mb-3">
            Copy this token now. You will not be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-50 font-mono break-all">
              {newSecret}
            </code>
            <button
              onClick={() => handleCopy(newSecret)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors shrink-0"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setNewSecret(null)}
            className="mt-3 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-300">API Tokens</h3>
          <p className="text-xs text-zinc-500 mt-1">Manage tokens for API access.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Create Token
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Token Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Mobile App"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Permissions</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSION_OPTIONS.map((perm) => (
                  <label
                    key={perm.value}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(perm.value)}
                      onChange={() => togglePermission(perm.value)}
                      className="rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500/50"
                    />
                    <span className="text-sm text-zinc-300">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={creating || !tokenName.trim()}
                className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {creating && <Loader2 size={16} className="animate-spin" />}
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setTokenName('');
                  setSelectedPermissions([]);
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token List */}
      {tokens.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <Key size={32} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-500 text-sm">No API tokens yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <div key={token.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-zinc-50">{token.name}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        token.active
                          ? 'bg-emerald-400/10 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {token.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 font-mono">{token.tokenPrefix}...</p>
                  {token.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {token.permissions.map((p) => (
                        <span key={p} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                    <span>Created {formatDate(token.createdAt)}</span>
                    {token.lastUsed && <span>Last used {formatDate(token.lastUsed)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(token)}
                    className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                    title={token.active ? 'Deactivate' : 'Activate'}
                  >
                    {token.active ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} />}
                  </button>
                  {deleteConfirm === token.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(token.id)}
                        className="bg-red-400/10 text-red-400 hover:bg-red-400/20 rounded-lg h-9 px-3 text-xs transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(token.id)}
                      className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
