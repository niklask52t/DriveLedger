import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Copy, Check, Users, Ticket, Loader2, RotateCcw } from 'lucide-react';
import { api } from '../../api';
import { formatDate } from '../../utils';
import type { User, RegistrationToken } from '../../types';

export default function AdminTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [regTokens, setRegTokens] = useState<RegistrationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<{ userId: string; token: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [usersData, tokensData] = await Promise.all([
        api.getUsers(),
        api.getRegistrationTokens(),
      ]);
      setUsers(usersData);
      setRegTokens(tokensData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load admin data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateToken = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.generateRegistrationToken();
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate token.';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      setDeleteConfirm(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user.';
      setError(msg);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const result = await api.adminResetPassword(userId);
      setResetLink({ userId, token: result.token });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password.';
      setError(msg);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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

      {/* Password Reset Link */}
      {resetLink && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-emerald-400 mb-2">Password Reset Token</h3>
          <p className="text-xs text-zinc-400 mb-3">Share this token with the user so they can reset their password.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-50 font-mono break-all">
              {resetLink.token}
            </code>
            <button
              onClick={() => handleCopy(resetLink.token, 'reset')}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-2 transition-colors shrink-0"
            >
              {copied === 'reset' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied === 'reset' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setResetLink(null)}
            className="mt-3 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Registration Tokens */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">Registration Tokens</h3>
            <p className="text-xs text-zinc-500 mt-1">Generate tokens to allow new user registrations.</p>
          </div>
          <button
            onClick={handleGenerateToken}
            disabled={generating}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Generate Token
          </button>
        </div>

        {regTokens.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <Ticket size={32} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm">No registration tokens.</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Token</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Status</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Created</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Expires</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regTokens.map((rt) => (
                  <tr key={rt.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-mono text-zinc-50">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[160px]">{rt.token}</span>
                        <button
                          onClick={() => handleCopy(rt.token, rt.id)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                        >
                          {copied === rt.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {rt.used ? (
                        <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                          Used{rt.usedBy ? ` by ${rt.usedBy}` : ''}
                        </span>
                      ) : (
                        <span className="text-xs bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded-full">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{formatDate(rt.createdAt)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{formatDate(rt.expiresAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleCopy(rt.token, rt.id)}
                        className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                      >
                        {copied === rt.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* User Management */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-zinc-300">User Management</h3>
          <p className="text-xs text-zinc-500 mt-1">View and manage registered users.</p>
        </div>

        {users.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <Users size={32} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm">No users found.</p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Username</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Email</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Role</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Verified</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Joined</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-zinc-50">{u.username}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{u.email}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          u.isAdmin
                            ? 'bg-violet-500/10 text-violet-400'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {u.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {u.emailVerified ? (
                        <span className="text-emerald-400 text-xs">Yes</span>
                      ) : (
                        <span className="text-amber-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleResetPassword(u.id)}
                          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center gap-1 transition-colors"
                          title="Reset password"
                        >
                          <RotateCcw size={14} />
                        </button>
                        {deleteConfirm === u.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteUser(u.id)}
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
                            onClick={() => setDeleteConfirm(u.id)}
                            className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
