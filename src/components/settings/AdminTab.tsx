import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Copy, Check, AlertCircle, Loader2, X,
} from 'lucide-react';
import { api, ApiError } from '../../api';
import type { RegistrationToken, User } from '../../types';
import { format } from 'date-fns';

export default function AdminTab() {
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
