import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell, BellRing, Clock, Calendar, Mail, MailX, Plus,
  Trash2, Pencil, AlertTriangle, Loader2, Filter, Check, X
} from 'lucide-react';
import { api } from '../api';
import { formatDate } from '../utils';
import Modal from '../components/Modal';
import type { AppState, Reminder } from '../types';

interface RemindersProps {
  state: AppState;
  emailEnabled: boolean;
  onRefreshDue: () => void;
}

const inputClass = 'w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none';

const REMINDER_TYPES: { value: Reminder['type']; label: string }[] = [
  { value: 'cost_due', label: 'Cost Due' },
  { value: 'loan_payment', label: 'Loan Payment' },
  { value: 'inspection', label: 'Inspection (TUeV)' },
  { value: 'insurance', label: 'Insurance Renewal' },
  { value: 'savings_goal', label: 'Savings Goal' },
  { value: 'custom', label: 'Custom' },
];

const RECURRING_OPTIONS: { value: Reminder['recurring']; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const TYPE_COLORS: Record<Reminder['type'], string> = {
  cost_due: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  loan_payment: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  inspection: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  insurance: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  savings_goal: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  custom: 'bg-dark-600/50 text-dark-300 border-dark-500/30',
};

function getTypeLabel(type: Reminder['type']): string {
  return REMINDER_TYPES.find(t => t.value === type)?.label ?? type;
}

function isOverdue(remindAt: string): boolean {
  return new Date(remindAt) <= new Date();
}

interface ReminderForm {
  title: string;
  description: string;
  type: Reminder['type'];
  entityType: string;
  entityId: string;
  remindAt: string;
  recurring: Reminder['recurring'];
  emailNotify: boolean;
}

const emptyForm: ReminderForm = {
  title: '',
  description: '',
  type: 'custom',
  entityType: '',
  entityId: '',
  remindAt: new Date().toISOString().split('T')[0],
  recurring: '',
  emailNotify: false,
};

export default function Reminders({ state, emailEnabled, onRefreshDue }: RemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [form, setForm] = useState<ReminderForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [snoozeId, setSnoozeId] = useState<string | null>(null);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [all, due] = await Promise.all([
        api.getReminders(),
        api.getDueReminders(),
      ]);
      setReminders(all);
      setDueReminders(due);
    } catch {
      setError('Failed to load reminders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Filtered reminders for the all-reminders table
  const filteredReminders = useMemo(() => {
    let list = reminders.filter(r => r.active);
    if (filterType) {
      list = list.filter(r => r.type === filterType);
    }
    return [...list].sort((a, b) => a.remindAt.localeCompare(b.remindAt));
  }, [reminders, filterType]);

  const activeCount = reminders.filter(r => r.active).length;
  const dueTodayCount = dueReminders.length;

  // Entity options based on type
  const entityOptions = useMemo(() => {
    switch (form.type) {
      case 'inspection':
      case 'insurance':
      case 'cost_due':
        return state.vehicles.map(v => ({ id: v.id, label: `${v.brand} ${v.model} (${v.licensePlate})` }));
      case 'loan_payment':
        return state.loans.map(l => {
          const vehicle = state.vehicles.find(v => v.id === l.vehicleId);
          return { id: l.id, label: `${l.name}${vehicle ? ` - ${vehicle.name}` : ''}` };
        });
      case 'savings_goal':
        return state.savingsGoals.map(sg => ({ id: sg.id, label: sg.name }));
      default:
        return [];
    }
  }, [form.type, state]);

  const entityTypeForReminderType = (type: Reminder['type']): string => {
    switch (type) {
      case 'inspection':
      case 'insurance':
      case 'cost_due':
        return 'vehicle';
      case 'loan_payment':
        return 'loan';
      case 'savings_goal':
        return 'savings_goal';
      default:
        return '';
    }
  };

  const openCreateModal = (prefillType?: Reminder['type']) => {
    setEditingReminder(null);
    const type = prefillType ?? 'custom';
    setForm({
      ...emptyForm,
      type,
      entityType: entityTypeForReminderType(type),
    });
    setShowModal(true);
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setForm({
      title: reminder.title,
      description: reminder.description,
      type: reminder.type,
      entityType: reminder.entityType,
      entityId: reminder.entityId,
      remindAt: reminder.remindAt.split('T')[0],
      recurring: reminder.recurring,
      emailNotify: reminder.emailNotify,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const data: Partial<Reminder> = {
        title: form.title,
        description: form.description,
        type: form.type,
        entityType: form.entityType || entityTypeForReminderType(form.type),
        entityId: form.entityId,
        remindAt: form.remindAt,
        recurring: form.recurring,
        emailNotify: emailEnabled ? form.emailNotify : false,
      };
      if (editingReminder) {
        await api.updateReminder(editingReminder.id, data);
      } else {
        await api.createReminder(data);
      }
      setShowModal(false);
      await loadAll();
      onRefreshDue();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteReminder(id);
      await loadAll();
      onRefreshDue();
    } catch {
      // ignore
    }
    setDeleteConfirm(null);
  };

  const handleSnooze = async (id: string, days?: number) => {
    let newDate: string;
    if (days) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      newDate = d.toISOString().split('T')[0];
    } else if (snoozeDate) {
      newDate = snoozeDate;
    } else {
      return;
    }
    try {
      await api.snoozeReminder(id, newDate);
      setSnoozeId(null);
      setSnoozeDate('');
      await loadAll();
      onRefreshDue();
    } catch {
      // ignore
    }
  };

  const getEntityName = (reminder: Reminder): string => {
    if (!reminder.entityId) return '-';
    switch (reminder.entityType) {
      case 'vehicle': {
        const v = state.vehicles.find(v => v.id === reminder.entityId);
        return v ? `${v.brand} ${v.model}` : '-';
      }
      case 'loan': {
        const l = state.loans.find(l => l.id === reminder.entityId);
        return l ? l.name : '-';
      }
      case 'savings_goal': {
        const sg = state.savingsGoals.find(sg => sg.id === reminder.entityId);
        return sg ? sg.name : '-';
      }
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
          <AlertTriangle size={18} className="text-danger shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-500/10">
              <Bell size={20} className="text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-50">{activeCount}</p>
              <p className="text-xs text-dark-400">Active Reminders</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
              <BellRing size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dark-50">{dueTodayCount}</p>
              <p className="text-xs text-dark-400">Due Now</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${emailEnabled ? 'bg-emerald-500/10' : 'bg-dark-700'}`}>
              {emailEnabled ? <Mail size={20} className="text-emerald-400" /> : <MailX size={20} className="text-dark-500" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-dark-50">{emailEnabled ? 'Enabled' : 'Disabled'}</p>
              <p className="text-xs text-dark-400">Email Notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Add & Actions ── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg px-4 py-2.5 transition-colors cursor-pointer"
        >
          <Plus size={18} />
          Add Reminder
        </button>
        <button
          onClick={() => openCreateModal('inspection')}
          className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer"
        >
          <Clock size={16} />
          Remind me about TUeV
        </button>
        <button
          onClick={() => openCreateModal('loan_payment')}
          className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer"
        >
          <Calendar size={16} />
          Loan payment reminder
        </button>
      </div>

      {/* ── Due Now Section ── */}
      {dueReminders.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-300 mb-4">
            <AlertTriangle size={20} />
            Due Now
          </h2>
          <div className="space-y-3">
            {dueReminders.map(reminder => (
              <div
                key={reminder.id}
                className="flex items-start gap-4 bg-dark-800/80 border border-amber-500/15 rounded-lg p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-dark-50 truncate">{reminder.title}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${TYPE_COLORS[reminder.type]}`}>
                      {getTypeLabel(reminder.type)}
                    </span>
                  </div>
                  {reminder.description && (
                    <p className="text-sm text-dark-400 mb-1">{reminder.description}</p>
                  )}
                  <p className="text-xs text-dark-500">
                    Due: {formatDate(reminder.remindAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {snoozeId === reminder.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSnooze(reminder.id, 1)}
                        className="text-xs bg-dark-700 hover:bg-dark-600 text-dark-200 rounded px-2 py-1 transition-colors cursor-pointer"
                      >
                        +1d
                      </button>
                      <button
                        onClick={() => handleSnooze(reminder.id, 7)}
                        className="text-xs bg-dark-700 hover:bg-dark-600 text-dark-200 rounded px-2 py-1 transition-colors cursor-pointer"
                      >
                        +7d
                      </button>
                      <input
                        type="date"
                        value={snoozeDate}
                        onChange={(e) => setSnoozeDate(e.target.value)}
                        className="bg-dark-700 border border-dark-600 rounded px-2 py-1 text-xs text-dark-200 outline-none"
                      />
                      <button
                        onClick={() => handleSnooze(reminder.id)}
                        disabled={!snoozeDate}
                        className="text-xs bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-1 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Set
                      </button>
                      <button
                        onClick={() => { setSnoozeId(null); setSnoozeDate(''); }}
                        className="text-dark-400 hover:text-dark-200 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setSnoozeId(reminder.id)}
                        className="flex items-center gap-1 text-xs bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                        title="Snooze"
                      >
                        <Clock size={14} />
                        Snooze
                      </button>
                      <button
                        onClick={() => handleDelete(reminder.id)}
                        className="flex items-center gap-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                        title="Mark Done"
                      >
                        <Check size={14} />
                        Done
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Reminders Section ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-50">All Reminders</h2>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-dark-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-dark-200 outline-none cursor-pointer"
            >
              <option value="">All Types</option>
              {REMINDER_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredReminders.length === 0 ? (
          <div className="text-center py-12 text-dark-500">
            <Bell size={40} className="mx-auto mb-3 opacity-40" />
            <p>No reminders found.</p>
          </div>
        ) : (
          <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-700 text-dark-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Title</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Related To</th>
                    <th className="text-left px-4 py-3 font-medium">Due Date</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Recurring</th>
                    <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50">
                  {filteredReminders.map(reminder => {
                    const overdue = isOverdue(reminder.remindAt) && !reminder.sent;
                    return (
                      <tr key={reminder.id} className={`hover:bg-dark-700/30 transition-colors ${overdue ? 'bg-amber-500/5' : ''}`}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-dark-100">{reminder.title}</span>
                          {reminder.description && (
                            <p className="text-xs text-dark-500 mt-0.5 truncate max-w-[200px]">{reminder.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${TYPE_COLORS[reminder.type]}`}>
                            {getTypeLabel(reminder.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-dark-300 hidden md:table-cell">{getEntityName(reminder)}</td>
                        <td className="px-4 py-3">
                          <span className={overdue ? 'text-amber-400 font-medium' : 'text-dark-300'}>
                            {formatDate(reminder.remindAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-dark-400 capitalize hidden sm:table-cell">
                          {reminder.recurring || '-'}
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          {reminder.emailNotify ? (
                            <Mail size={16} className="inline text-emerald-400" />
                          ) : (
                            <MailX size={16} className="inline text-dark-600" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(reminder)}
                              className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-dark-700 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                            {deleteConfirm === reminder.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(reminder.id)}
                                  className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                  title="Confirm delete"
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-700 transition-colors cursor-pointer"
                                  title="Cancel"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(reminder.id)}
                                className="p-1.5 rounded-lg text-dark-400 hover:text-danger hover:bg-dark-700 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingReminder ? 'Edit Reminder' : 'Add Reminder'}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {editingReminder ? 'Save Changes' : 'Create Reminder'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Reminder title"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description or notes"
              rows={2}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value as Reminder['type'];
                  setForm({
                    ...form,
                    type,
                    entityType: entityTypeForReminderType(type),
                    entityId: '',
                  });
                }}
                className={inputClass}
              >
                {REMINDER_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {entityOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Related Entity</label>
                <select
                  value={form.entityId}
                  onChange={(e) => setForm({ ...form, entityId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">-- Select --</option>
                  {entityOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Due Date</label>
              <input
                type="date"
                value={form.remindAt}
                onChange={(e) => setForm({ ...form, remindAt: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Recurring</label>
              <select
                value={form.recurring}
                onChange={(e) => setForm({ ...form, recurring: e.target.value as Reminder['recurring'] })}
                className={inputClass}
              >
                {RECURRING_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="relative">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.emailNotify}
                  onChange={(e) => setForm({ ...form, emailNotify: e.target.checked })}
                  disabled={!emailEnabled}
                  className="w-4 h-4 rounded border-dark-600 bg-dark-900 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer disabled:opacity-40"
                />
                <span className={`text-sm ${emailEnabled ? 'text-dark-200' : 'text-dark-500'}`}>
                  Email Notification
                </span>
              </label>
            </div>
            {!emailEnabled && (
              <span className="text-xs text-dark-500 italic" title="Email is not configured on this server">
                (Email not configured)
              </span>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
