import { useState } from 'react';
import { Plus, Pencil, Trash2, Pin, PinOff, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../Modal';
import TagInput from '../TagInput';
import { api } from '../../api';
import { formatDate } from '../../utils';
import type { AppState, VehicleNote } from '../../types';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

interface Props {
  vehicleId: string;
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  title: '',
  content: '',
  isPinned: false,
  tags: [] as string[],
};

export default function VehicleNotesTab({ vehicleId, state, setState }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const notes = state.vehicleNotes
    .filter((n) => n.vehicleId === vehicleId)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  const openAdd = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (n: VehicleNote) => {
    setForm({
      title: n.title,
      content: n.content,
      isPinned: n.isPinned,
      tags: n.tags || [],
    });
    setEditingId(n.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const updated = await api.updateVehicleNote(editingId, { ...form, vehicleId });
        setState({ ...state, vehicleNotes: state.vehicleNotes.map((n) => (n.id === editingId ? updated : n)) });
      } else {
        const created = await api.createVehicleNote({ ...form, vehicleId });
        setState({ ...state, vehicleNotes: [...state.vehicleNotes, created] });
      }
      setShowModal(false);
      setEditingId(null);
    } catch (e) {
      console.error('Failed to save note', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteVehicleNote(id);
      setState({ ...state, vehicleNotes: state.vehicleNotes.filter((n) => n.id !== id) });
    } catch (e) {
      console.error('Failed to delete note', e);
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      const updated = await api.toggleNotePin(id);
      setState({ ...state, vehicleNotes: state.vehicleNotes.map((n) => (n.id === id ? updated : n)) });
    } catch (e) {
      console.error('Failed to toggle pin', e);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-400">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
          {notes.filter((n) => n.isPinned).length > 0 && ` (${notes.filter((n) => n.isPinned).length} pinned)`}
        </p>
        <button
          onClick={openAdd}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">No notes yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => {
            const isExpanded = expandedId === n.id;
            const preview = n.content.length > 120 ? n.content.slice(0, 120) + '...' : n.content;

            return (
              <div
                key={n.id}
                className={`bg-zinc-900 border rounded-xl overflow-hidden transition-colors ${n.isPinned ? 'border-violet-500/30' : 'border-zinc-800'}`}
              >
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {n.isPinned && <Pin size={12} className="text-violet-400 shrink-0" />}
                        <h3 className="text-sm font-medium text-zinc-50 truncate">{n.title}</h3>
                      </div>
                      <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                        {isExpanded ? n.content : preview}
                      </p>
                      {n.content.length > 120 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : n.id)}
                          className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-flex items-center gap-1 transition-colors"
                        >
                          {isExpanded ? (
                            <>Show less <ChevronUp size={12} /></>
                          ) : (
                            <>Show more <ChevronDown size={12} /></>
                          )}
                        </button>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-zinc-600">{formatDate(n.createdAt)}</span>
                        {(n.tags || []).map((t, i) => (
                          <span key={i} className="bg-zinc-800 rounded-md px-2 py-0.5 text-xs text-zinc-300">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleTogglePin(n.id)}
                        className="text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                        title={n.isPinned ? 'Unpin' : 'Pin'}
                      >
                        {n.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>
                      <button
                        onClick={() => openEdit(n)}
                        className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      {deleteConfirm === n.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { handleDelete(n.id); setDeleteConfirm(null); }}
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
                          onClick={() => setDeleteConfirm(n.id)}
                          className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Edit Note' : 'Add Note'}
        footer={
          <>
            <button
              onClick={() => { setShowModal(false); setEditingId(null); }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
            >
              {editingId ? 'Update' : 'Add'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Note title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Content</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[200px] resize-none"
              placeholder="Write your note..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/30"
              checked={form.isPinned}
              onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
            />
            <span className="text-sm text-zinc-300">Pin this note</span>
          </label>
          <div>
            <label className={labelClass}>Tags</label>
            <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
