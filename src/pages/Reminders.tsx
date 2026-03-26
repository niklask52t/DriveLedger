import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, Clock, CheckCircle2, AlertTriangle, CalendarClock,
  Trash2, Pencil, BellRing, RotateCcw, Filter,
} from 'lucide-react';
import { api } from '../api';
import { cn } from '../lib/utils';
import { formatDate } from '../utils';
import Modal from '../components/Modal';
import type { AppState, Reminder } from '../types';

interface Props {
  state: AppState;
  emailEnabled: boolean;
  onRefreshDue: () => void;
}

const REMINDER_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'cost_due', label: 'Cost Due' },
  { value: 'loan_payment', label: 'Loan Payment' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'savings_goal', label: 'Savings Goal' },
  { value: 'custom', label: 'Custom' },
] as const;

const RECURRING_OPTIONS = [
  { value: '', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

function getTypeLabel(type: string): string {
  const found = REMINDER_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'cost_due': return <Clock size={16} />;
    case 'loan_payment': return <CalendarClock size={16} />;
    case 'inspection': return <CheckCircle2 size={16} />;
    case 'insurance': return <AlertTriangle size={16} />;
    case 'savings_goal': return <Bell size={16} />;
    default: return <BellRing size={16} />;
  }
}

const emptyForm: Partial<Reminder> = {
  title: '',
  description: '',
  type: 'custom',
  entityType: '',
  entityId: '',
  remindAt: '',
  recurring: '',
  emailNotify: false,
  active: true,
};

export default function Reminders({ state, emailEnabled, onRefreshDue }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Reminder>>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [all, due] = await Promise.all([api.getReminders(), api.getDueReminders()]);
      setReminders(all);
      setDueReminders(due);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (r: Reminder) => {
    setEditingId(r.id);
    setForm({
      title: r.title,
      description: r.description,
      type: r.type,
      entityType: r.entityType,
      entityId: r.entityId,
      remindAt: r.remindAt ? r.remindAt.slice(0, 16) : '',
      recurring: r.recurring,
      emailNotify: r.emailNotify,
      active: r.active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await api.updateReminder(editingId, form);
      } else {
        await api.createReminder(form);
      }
      setModalOpen(false);
      await load();
      onRefreshDue();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteReminder(id);
    await load();
    onRefreshDue();
  };

  const handleSnooze = async (id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    await api.snoozeReminder(id, tomorrow.toISOString());
    await load();
    onRefreshDue();
  };

  const handleMarkDone = async (id: string) => {
    await api.updateReminder(id, { active: false });
    await load();
    onRefreshDue();
  };

  const quickAddInspection = async () => {
    const remindAt = new Date();
    remindAt.setMonth(remindAt.getMonth() + 12);
    remindAt.setHours(9, 0, 0, 0);
    await api.createReminder({
      title: 'Vehicle Inspection Due',
      description: 'Schedule TUV/inspection appointment',
      type: 'inspection',
      remindAt: remindAt.toISOString(),
      recurring: 'yearly',
      emailNotify: emailEnabled,
      active: true,
    });
    await load();
    onRefreshDue();
  };

  const filtered = reminders.filter((r) => !typeFilter || r.type === typeFilter);
  const activeCount = reminders.filter((r) => r.active).length;
  const dueCount = dueReminders.length;
  const recurringCount = reminders.filter((r) => r.recurring).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Reminders</h1>
          <p className="text-sm text-zinc-500 mt-1">Stay on top of upcoming payments and tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={quickAddInspection}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm flex items-center gap-2"
          >
            <CalendarClock size={16} />
            Quick: Inspection
          </button>
          <button
            onClick={openAdd}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} />
            Add Reminder
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Active', value: activeCount, icon: Bell, color: 'text-violet-400' },
          { label: 'Due Now', value: dueCount, icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Recurring', value: recurringCount, icon: RotateCcw, color: 'text-sky-400' },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">{s.label}</p>
                <p className="text-2xl font-bold text-zinc-50 mt-1">{s.value}</p>
              </div>
              <div className={cn('p-3 rounded-lg bg-zinc-800', s.color)}>
                <s.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Due Now Section */}
      {dueReminders.length > 0 && (
        <div className="bg-amber-400/5 border border-amber-400/15 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-50">Due Now</h2>
            <span className="ml-2 text-xs bg-amber-400/15 text-amber-400 px-2 py-0.5 rounded-full">
              {dueReminders.length}
            </span>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {dueReminders.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-amber-400">{getTypeIcon(r.type)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-50 truncate">{r.title}</p>
                      <p className="text-xs text-zinc-500">{getTypeLabel(r.type)} &middot; {formatDate(r.remindAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleSnooze(r.id)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-8 px-3 text-xs flex items-center gap-1.5"
                    >
                      <Clock size={14} />
                      Snooze
                    </button>
                    <button
                      onClick={() => handleMarkDone(r.id)}
                      className="bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 rounded-lg h-8 px-3 text-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      Done
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* All Reminders Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-50">All Reminders</h2>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-zinc-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 appearance-none"
            >
              {REMINDER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-950/50 text-left">
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Reminder</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Recurring</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">
                    No reminders found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-zinc-50">{r.title}</p>
                        {r.description && (
                          <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs">{r.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                        {getTypeIcon(r.type)}
                        {getTypeLabel(r.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{formatDate(r.remindAt)}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {r.recurring ? (
                        <span className="inline-flex items-center gap-1 text-sky-400 text-xs">
                          <RotateCcw size={12} />
                          {r.recurring.charAt(0).toUpperCase() + r.recurring.slice(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">One-time</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          r.active
                            ? 'bg-emerald-400/10 text-emerald-400'
                            : 'bg-zinc-800 text-zinc-500'
                        )}
                      >
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Reminder' : 'Add Reminder'}
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title || !form.remindAt}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
            <input
              type="text"
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Reminder title"
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details"
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Type</label>
              <select
                value={form.type || 'custom'}
                onChange={(e) => setForm({ ...form, type: e.target.value as Reminder['type'] })}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 appearance-none"
              >
                {REMINDER_TYPES.filter((t) => t.value).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Recurring</label>
              <select
                value={form.recurring || ''}
                onChange={(e) => setForm({ ...form, recurring: e.target.value as Reminder['recurring'] })}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 appearance-none"
              >
                {RECURRING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Remind At</label>
            <input
              type="datetime-local"
              value={form.remindAt || ''}
              onChange={(e) => setForm({ ...form, remindAt: e.target.value })}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>

          {emailEnabled && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.emailNotify || false}
                onChange={(e) => setForm({ ...form, emailNotify: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
              />
              <span className="text-sm text-zinc-400">Send email notification</span>
            </label>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active !== false}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
            />
            <span className="text-sm text-zinc-400">Active</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
