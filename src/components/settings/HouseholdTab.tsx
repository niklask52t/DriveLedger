import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Users, Loader2, Home, UserPlus, Edit2, Check, X } from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import type { Household, HouseholdMember } from '../../types';

export default function HouseholdTab() {
  const { user } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create household
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Selected household for management
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Add member
  const [addEmail, setAddEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  // Edit household name
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [memberDeleteConfirm, setMemberDeleteConfirm] = useState<string | null>(null);

  const loadHouseholds = useCallback(async () => {
    try {
      const data = await api.getHouseholds();
      setHouseholds(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load households';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHouseholds();
  }, [loadHouseholds]);

  const loadMembers = useCallback(async (householdId: string) => {
    setLoadingMembers(true);
    try {
      const data = await api.getHouseholdMembers(householdId);
      setMembers(data);
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadMembers(selectedId);
    } else {
      setMembers([]);
    }
  }, [selectedId, loadMembers]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.createHousehold(newName.trim());
      setNewName('');
      setShowCreate(false);
      await loadHouseholds();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create household';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await api.deleteHousehold(id);
      if (selectedId === id) setSelectedId(null);
      setDeleteConfirm(null);
      await loadHouseholds();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete household';
      setError(msg);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    setError(null);
    try {
      await api.updateHousehold(id, editName.trim());
      setEditingId(null);
      await loadHouseholds();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to rename household';
      setError(msg);
    }
  };

  const handleAddMember = async () => {
    if (!selectedId || !addEmail.trim()) return;
    setAddingMember(true);
    setError(null);
    try {
      await api.addHouseholdMember(selectedId, addEmail.trim(), ['view']);
      setAddEmail('');
      await loadMembers(selectedId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add member';
      setError(msg);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedId) return;
    setError(null);
    try {
      await api.removeHouseholdMember(selectedId, memberId);
      setMemberDeleteConfirm(null);
      await loadMembers(selectedId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member';
      setError(msg);
    }
  };

  const isHead = (household: Household) => household.headUserId === user?.id;
  const selectedHousehold = households.find(h => h.id === selectedId);

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

      {/* Create Household */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-300">Households</h3>
            <p className="text-xs text-zinc-500 mt-1">Manage your households and members</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            New Household
          </button>
        </div>

        {showCreate && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Household name"
                className="flex-1 h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-10 px-3 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Household List */}
      {households.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
          <Home size={32} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-500 text-sm">No households yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {households.map(h => (
            <div
              key={h.id}
              className={`bg-zinc-900 border rounded-xl p-5 cursor-pointer transition-colors ${
                selectedId === h.id ? 'border-violet-500/50' : 'border-zinc-800 hover:border-zinc-700'
              }`}
              onClick={() => setSelectedId(selectedId === h.id ? null : h.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Home size={16} className="text-violet-400" />
                  </div>
                  {editingId === h.id ? (
                    <div className="flex items-center gap-2 min-w-0" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-8 bg-zinc-950 border border-zinc-700 rounded px-2 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(h.id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                      />
                      <button onClick={() => handleRename(h.id)} className="text-emerald-400 hover:text-emerald-300 p-1"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="text-zinc-400 hover:text-zinc-200 p-1"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-50 truncate">{h.name}</p>
                      <p className="text-xs text-zinc-500">
                        {isHead(h) ? 'You are the head' : 'Member'}
                      </p>
                    </div>
                  )}
                </div>
                {isHead(h) && editingId !== h.id && (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingId(h.id); setEditName(h.name); }}
                      className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-8 w-8 flex items-center justify-center transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    {deleteConfirm === h.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="bg-red-400/10 text-red-400 hover:bg-red-400/20 rounded-lg h-8 px-2 text-xs transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-8 px-2 text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(h.id)}
                        className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-8 w-8 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members Management */}
      {selectedId && selectedHousehold && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-violet-400" />
              <h3 className="text-sm font-medium text-zinc-50">Members of {selectedHousehold.name}</h3>
            </div>
          </div>

          {/* Add member form (head only) */}
          {isHead(selectedHousehold) && (
            <div className="flex items-center gap-3 mb-5">
              <input
                type="email"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                placeholder="Add member by email"
                className="flex-1 h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
                onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); }}
              />
              <button
                onClick={handleAddMember}
                disabled={addingMember || !addEmail.trim()}
                className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-4 text-sm font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {addingMember ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Add
              </button>
            </div>
          )}

          {loadingMembers ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-zinc-500" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-4">No members added yet</p>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                      <span className="text-xs text-zinc-300 font-medium">
                        {m.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{m.username}</p>
                      <p className="text-xs text-zinc-500">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                      {m.permissions.join(', ')}
                    </span>
                    {isHead(selectedHousehold) && (
                      <>
                        {memberDeleteConfirm === m.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              className="bg-red-400/10 text-red-400 hover:bg-red-400/20 rounded-lg h-8 px-2 text-xs transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setMemberDeleteConfirm(null)}
                              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-8 px-2 text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setMemberDeleteConfirm(m.id)}
                            className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-8 w-8 flex items-center justify-center transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
