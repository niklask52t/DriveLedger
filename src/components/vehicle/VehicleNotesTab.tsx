import { useState } from 'react';
import { Plus, Pencil, Trash2, Pin, PinOff, ChevronDown, ChevronUp, Eye, PenLine } from 'lucide-react';
import Modal from '../Modal';
import TagInput from '../TagInput';
import MarkdownRenderer from '../MarkdownRenderer';
import ExtraFields from '../ExtraFields';
import AttachmentManager from '../AttachmentManager';
import { useExtraFields } from '../../hooks/useExtraFields';
import { api } from '../../api';
import { formatDate } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';
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
  extraFields: {} as Record<string, string>,
};

export default function VehicleNotesTab({ vehicleId, state, setState }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const extraFieldDefs = useExtraFields();

  const { t } = useI18n();

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
    setPreviewMode(false);
    setShowModal(true);
  };

  const openEdit = (n: VehicleNote) => {
    setForm({
      title: n.title,
      content: n.content,
      isPinned: n.isPinned,
      tags: n.tags || [],
      extraFields: (n as any).extraFields || {},
    });
    setEditingId(n.id);
    setPreviewMode(false);
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

  const handleBulkPin = async (pinned: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      const updatedNotes = await api.bulkPinNotes(Array.from(selectedIds), pinned);
      const updatedMap = new Map(updatedNotes.map((n) => [n.id, n]));
      setState({
        ...state,
        vehicleNotes: state.vehicleNotes.map((n) => updatedMap.get(n.id) || n),
      });
      setSelectedIds(new Set());
    } catch (e) {
      console.error('Failed to bulk pin/unpin', e);
    }
  };

  const toggleSelectNote = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-400">
          {t("vehicle_tab.notes.count", { count: notes.length })}
          {notes.filter((n) => n.isPinned).length > 0 && ` (${t("vehicle_tab.notes.pinned", { count: notes.filter((n) => n.isPinned).length })})`}
        </p>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-zinc-500">{selectedIds.size} selected</span>
              <button
                onClick={() => handleBulkPin(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-1.5 transition-colors"
              >
                <Pin size={14} />
                Pin
              </button>
              <button
                onClick={() => handleBulkPin(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm inline-flex items-center gap-1.5 transition-colors"
              >
                <PinOff size={14} />
                Unpin
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
              >
                Clear
              </button>
            </>
          )}
          <button
            onClick={openAdd}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            {t("vehicle_tab.notes.add")}
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">{t("vehicle_tab.notes.no_notes")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => {
            const isExpanded = expandedId === n.id;
            const hasLongContent = n.content.length > 120;

            return (
              <div
                key={n.id}
                className={`bg-zinc-900 border rounded-xl overflow-hidden transition-colors ${n.isPinned ? 'border-l-2 border-l-violet-500 border-violet-500/30' : 'border-zinc-800'}`}
              >
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(n.id)}
                          onChange={() => toggleSelectNote(n.id)}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/30 shrink-0"
                        />
                        {n.isPinned && <Pin size={12} className="text-violet-400 shrink-0" />}
                        <h3 className="text-sm font-medium text-zinc-50 truncate" title={n.title}>{n.title}</h3>
                      </div>
                      {isExpanded ? (
                        <MarkdownRenderer content={n.content} className="text-sm text-zinc-300" />
                      ) : (
                        <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                          {hasLongContent ? n.content.slice(0, 120) + '...' : n.content}
                        </p>
                      )}
                      {hasLongContent && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : n.id)}
                          className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-flex items-center gap-1 transition-colors"
                        >
                          {isExpanded ? (
                            <>{t("vehicle_tab.notes.show_less")} <ChevronUp size={12} /></>
                          ) : (
                            <>{t("vehicle_tab.notes.show_more")} <ChevronDown size={12} /></>
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
                        title={n.isPinned ? t('notes.unpin') : t('notes.pin')}
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
                            {t("common.confirm")}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-xs transition-colors"
                          >
                            {t("common.cancel")}
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
        title={editingId ? t('vehicle_tab.notes.edit') : t('vehicle_tab.notes.add')}
        footer={
          <>
            <button
              onClick={() => { setShowModal(false); setEditingId(null); }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSave}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium transition-colors"
            >
              {editingId ? t("common.update") : t("common.add")}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className={labelClass}>{t("common.title")}</label>
            <input
              type="text"
              className={inputClass}
              placeholder={t("vehicle_tab.notes.note_title")}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-400">{t("vehicle_tab.notes.content")}</label>
              <div className="flex items-center bg-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewMode(false)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    !previewMode ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <PenLine size={12} />
                  {t("common.edit")}
                </button>
                <button
                  onClick={() => setPreviewMode(true)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    previewMode ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Eye size={12} />
                  {t("vehicle_tab.notes.preview")}
                </button>
              </div>
            </div>
            {previewMode ? (
              <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 min-h-[200px]">
                {form.content ? (
                  <MarkdownRenderer content={form.content} className="text-sm text-zinc-300" />
                ) : (
                  <p className="text-sm text-zinc-600">{t("vehicle_tab.notes.nothing_to_preview")}</p>
                )}
              </div>
            ) : (
              <>
                <textarea
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[200px] resize-none"
                  placeholder={t("vehicle_tab.notes.write_note")}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
                <p className="text-xs text-zinc-600 mt-1">
                  Supports <strong className="text-zinc-500">**bold**</strong>, <em className="text-zinc-500">*italic*</em>, <code className="text-zinc-500 bg-zinc-800 px-1 rounded">`code`</code>, <span className="text-zinc-500">[links](url)</span>, <span className="text-zinc-500"># headers</span>
                </p>
              </>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/30"
              checked={form.isPinned}
              onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
            />
            <span className="text-sm text-zinc-300">{t("vehicle_tab.notes.pin_note")}</span>
          </label>
          <div>
            <label className={labelClass}>{t("common.tags")}</label>
            <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
          </div>
          <ExtraFields
            recordType="notes"
            values={form.extraFields}
            onChange={(extraFields) => setForm({ ...form, extraFields })}
            definitions={extraFieldDefs}
          />

          {editingId && (
            <AttachmentManager recordType="notes" recordId={editingId} />
          )}
        </div>
      </Modal>
    </div>
  );
}
