import { useState, useEffect, type FormEvent } from 'react';
import {
  Key, Plus, Trash2, Copy, Check, AlertCircle, Loader2,
  ToggleLeft, ToggleRight, AlertTriangle, X,
} from 'lucide-react';
import { api, ApiError } from '../../api';
import type { ApiToken } from '../../types';
import { format } from 'date-fns';

const inputClass = 'w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-dark-100 placeholder-dark-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors';

export default function ApiTokensTab() {
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
