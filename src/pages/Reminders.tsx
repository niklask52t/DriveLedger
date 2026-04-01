import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, Clock, CheckCircle2, AlertTriangle, CalendarClock,
  Trash2, Pencil, BellRing, RotateCcw, Filter, Gauge, CalendarDays, X,
} from 'lucide-react';
import { api } from '../api';
import { cn } from '../lib/utils';
import { formatDate } from '../utils';
import Modal from '../components/Modal';
import ReminderCalendar from '../components/ReminderCalendar';
import { useUserConfig } from '../contexts/UserConfigContext';
import { useI18n } from '../contexts/I18nContext';
import { useUnits } from '../hooks/useUnits';
import type { AppState, Reminder, Vehicle } from '../types';

interface Props {
  state: AppState;
  emailEnabled: boolean;
  onRefreshDue: () => void;
}

const REMINDER_TYPES = [
  { value: '', i18nKey: 'common.all_types' },
  { value: 'cost_due', i18nKey: 'reminder_type.cost_due' },
  { value: 'loan_payment', i18nKey: 'reminder_type.loan_payment' },
  { value: 'inspection', i18nKey: 'reminder_type.inspection' },
  { value: 'insurance', i18nKey: 'reminder_type.insurance' },
  { value: 'savings_goal', i18nKey: 'reminder_type.savings_goal' },
  { value: 'custom', i18nKey: 'reminder_type.custom' },
] as const;

const RECURRING_OPTIONS = [
  { value: '', i18nKey: 'reminders.one_time' },
  { value: 'daily', i18nKey: 'recurring.daily' },
  { value: 'weekly', i18nKey: 'recurring.weekly' },
  { value: 'monthly', i18nKey: 'recurring.monthly' },
  { value: 'yearly', i18nKey: 'recurring.yearly' },
] as const;

const METRIC_OPTIONS = [
  { value: 'date', i18nKey: 'reminders.metric_date', icon: CalendarDays },
  { value: 'odometer', i18nKey: 'reminders.metric_odometer', icon: Gauge },
  { value: 'both', i18nKey: 'reminders.metric_both', icon: Bell },
] as const;

function getTypeLabelKey(type: string): string {
  const found = REMINDER_TYPES.find((t) => t.value === type);
  return found ? found.i18nKey : type;
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

function getMetricLabelKey(metric?: string): string {
  switch (metric) {
    case 'odometer': return 'reminders.metric_odometer';
    case 'both': return 'reminders.metric_both';
    default: return 'reminders.metric_date';
  }
}

function getMetricIcon(metric?: string) {
  switch (metric) {
    case 'odometer': return <Gauge size={14} />;
    case 'both': return <Bell size={14} />;
    default: return <CalendarDays size={14} />;
  }
}

/** Returns an urgency color class based on how close to the due date the reminder is */
function getUrgencyBadge(r: Reminder, vehicles: Vehicle[], distanceUnit: string): { className: string; label: string } | null {
  const now = new Date();
  const metric = r.metric || 'date';
  const ct = r.customThresholds;
  const veryUrgentDays = ct?.veryUrgentDays ?? 3;
  const urgentDays = ct?.urgentDays ?? 7;
  const veryUrgentDistance = ct?.veryUrgentDistance ?? 500;
  const urgentDistance = ct?.urgentDistance ?? 1000;

  // Check date urgency
  if ((metric === 'date' || metric === 'both') && r.remindAt) {
    const dueDate = new Date(r.remindAt);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { className: 'bg-red-400/10 text-red-400', label: 'Overdue' };
    if (diffDays <= veryUrgentDays) return { className: 'bg-amber-400/10 text-amber-400', label: `${diffDays}d left` };
    if (diffDays <= urgentDays) return { className: 'bg-yellow-400/10 text-yellow-400', label: `${diffDays}d left` };
  }

  // Check mileage urgency
  if ((metric === 'odometer' || metric === 'both') && r.targetMileage && r.vehicleId) {
    const vehicle = vehicles.find(v => v.id === r.vehicleId);
    if (vehicle) {
      const remaining = r.targetMileage - vehicle.currentMileage;
      if (remaining <= 0) return { className: 'bg-red-400/10 text-red-400', label: 'Mileage reached' };
      if (remaining <= veryUrgentDistance) return { className: 'bg-amber-400/10 text-amber-400', label: `${remaining.toLocaleString()} ${distanceUnit} left` };
      if (remaining <= urgentDistance) return { className: 'bg-yellow-400/10 text-yellow-400', label: `${remaining.toLocaleString()} ${distanceUnit} left` };
    }
  }

  return null;
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
  metric: 'date',
  targetMileage: undefined,
  mileageInterval: undefined,
  vehicleId: undefined,
  fixedInterval: false,
  customThresholds: null,
};

export default function Reminders({ state, emailEnabled, onRefreshDue }: Props) {
  const { t } = useI18n();
  const { fmtDistance, distanceUnit } = useUnits();
  const { config } = useUserConfig();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Reminder>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const vehicles: Vehicle[] = state.vehicles;

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
      metric: r.metric || 'date',
      targetMileage: r.targetMileage ?? undefined,
      mileageInterval: r.mileageInterval ?? undefined,
      vehicleId: r.vehicleId ?? undefined,
      fixedInterval: r.fixedInterval ?? false,
      customThresholds: r.customThresholds ?? null,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      // Map camelCase to snake_case for backend
      if (payload.remindAt !== undefined) { payload.remind_at = payload.remindAt; delete payload.remindAt; }
      if (payload.emailNotify !== undefined) { payload.email_notify = payload.emailNotify; delete payload.emailNotify; }
      if (payload.entityType !== undefined) { payload.entity_type = payload.entityType; delete payload.entityType; }
      if (payload.entityId !== undefined) { payload.entity_id = payload.entityId; delete payload.entityId; }
      if (payload.targetMileage !== undefined) { payload.target_mileage = payload.targetMileage; delete payload.targetMileage; }
      if (payload.mileageInterval !== undefined) { payload.mileage_interval = payload.mileageInterval; delete payload.mileageInterval; }
      if (payload.vehicleId !== undefined) { payload.vehicle_id = payload.vehicleId; delete payload.vehicleId; }
      if (payload.fixedInterval !== undefined) { payload.fixed_interval = payload.fixedInterval; delete payload.fixedInterval; }
      if (payload.customThresholds !== undefined) { payload.custom_thresholds = payload.customThresholds ? JSON.stringify(payload.customThresholds) : null; delete payload.customThresholds; }

      if (editingId) {
        await api.updateReminder(editingId, payload);
      } else {
        await api.createReminder(payload);
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
    await api.completeReminder(id);
    await load();
    onRefreshDue();
  };

  const quickAddInspection = async () => {
    const remindDate = new Date();
    remindDate.setMonth(remindDate.getMonth() + 12);
    remindDate.setHours(9, 0, 0, 0);
    await api.createReminder({
      title: t('reminder.vehicle_inspection_due'),
      description: t('reminder.schedule_tuev'),
      type: 'inspection',
      remind_at: remindDate.toISOString(),
      recurring: 'yearly',
      email_notify: emailEnabled,
      active: true,
    } as any);
    await load();
    onRefreshDue();
  };

  // Apply filters
  let filtered = reminders.filter((r) => !typeFilter || r.type === typeFilter);

  // Apply calendar date filter
  if (selectedDate) {
    filtered = filtered.filter((r) => r.remindAt?.startsWith(selectedDate));
  }

  const activeCount = reminders.filter((r) => r.active).length;
  const dueCount = dueReminders.length;
  const recurringCount = reminders.filter((r) => r.recurring).length;

  const formMetric = form.metric || 'date';
  const showDateField = formMetric === 'date' || formMetric === 'both';
  const showMileageFields = formMetric === 'odometer' || formMetric === 'both';
  const showMileageInterval = showMileageFields && form.recurring;

  // Determine if save button should be disabled
  const isSaveDisabled = saving || !form.title || (
    showDateField && !form.remindAt
  ) || (
    showMileageFields && (!form.targetMileage || !form.vehicleId)
  );

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
          <h1 className="text-2xl font-bold text-zinc-50">{t('reminders.title')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('reminders.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={quickAddInspection}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm flex items-center gap-2"
          >
            <CalendarClock size={16} />
            {t('reminders.quick_inspection')}
          </button>
          <button
            onClick={openAdd}
            className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} />
            {t('reminders.add')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: t('common.active'), value: activeCount, icon: Bell, color: 'text-violet-400' },
          { label: t('reminders.due_now'), value: dueCount, icon: AlertTriangle, color: 'text-amber-400' },
          { label: t('reminders.recurring'), value: recurringCount, icon: RotateCcw, color: 'text-sky-400' },
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
            <h2 className="text-lg font-semibold text-zinc-50">{t('reminders.due_now')}</h2>
            <span className="ml-2 text-xs bg-amber-400/15 text-amber-400 px-2 py-0.5 rounded-full">
              {dueReminders.length}
            </span>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {dueReminders.map((r) => {
                const metric = r.metric || 'date';
                return (
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
                        <p className="text-sm font-medium text-zinc-50 truncate" title={r.title}>{r.title}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>{t(getTypeLabelKey(r.type))}</span>
                          <span>&middot;</span>
                          <span className="inline-flex items-center gap-1">
                            {getMetricIcon(metric)}
                            {t(getMetricLabelKey(metric))}
                          </span>
                          {(metric === 'date' || metric === 'both') && r.remindAt && (
                            <>
                              <span>&middot;</span>
                              <span>{formatDate(r.remindAt)}</span>
                            </>
                          )}
                          {(metric === 'odometer' || metric === 'both') && r.targetMileage && (
                            <>
                              <span>&middot;</span>
                              <span>{fmtDistance(r.targetMileage)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSnooze(r.id)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-8 px-3 text-xs flex items-center gap-1.5"
                      >
                        <Clock size={14} />
                        {t('reminders.snooze')}
                      </button>
                      <button
                        onClick={() => handleMarkDone(r.id)}
                        className="bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 rounded-lg h-8 px-3 text-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        {t('reminders.done')}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Calendar + All Reminders - 2-column layout when calendar is enabled */}
      <div className={cn(config.showCalendar && 'grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6')}>
        {/* Calendar */}
        {config.showCalendar && (
          <div className="space-y-3">
            <ReminderCalendar
              reminders={reminders}
              onSelectDate={(d) => setSelectedDate(prev => prev === d ? null : d)}
              selectedDate={selectedDate}
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-9 px-4 text-sm transition-colors"
              >
                <X size={14} />
                {t('reminders.show_all')}
              </button>
            )}
          </div>
        )}

        {/* All Reminders Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-zinc-50">
                {selectedDate ? t('reminders.reminders_for', { date: selectedDate }) : t('reminders.all_reminders')}
              </h2>
              {selectedDate && (
                <span className="text-xs bg-violet-400/15 text-violet-400 px-2 py-0.5 rounded-full">
                  {filtered.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-zinc-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 appearance-none"
              >
                {REMINDER_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{t(rt.i18nKey)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-950/50 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('reminders.reminder')}</th>
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('common.type')}</th>
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('reminders.trigger')}</th>
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('reminders.due')}</th>
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('reminders.recurring')}</th>
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{t('common.status')}</th>
                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-zinc-500">
                      {selectedDate ? t('reminders.no_reminders_date') : t('reminders.no_reminders')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const metric = r.metric || 'date';
                    const urgency = getUrgencyBadge(r, vehicles, distanceUnit);
                    const vehicle = r.vehicleId ? vehicles.find(v => v.id === r.vehicleId) : null;

                    return (
                      <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-zinc-50">{r.title}</p>
                            {r.description && (
                              <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs" title={r.description}>{r.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                            {getTypeIcon(r.type)}
                            {t(getTypeLabelKey(r.type))}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                            {getMetricIcon(metric)}
                            {t(getMetricLabelKey(metric))}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {(metric === 'date' || metric === 'both') && r.remindAt && (
                              <p className="text-sm text-zinc-400">{formatDate(r.remindAt)}</p>
                            )}
                            {(metric === 'odometer' || metric === 'both') && r.targetMileage && (
                              <p className="text-sm text-zinc-400 flex items-center gap-1">
                                <Gauge size={12} />
                                {fmtDistance(r.targetMileage)}
                                {vehicle && (
                                  <span className="text-zinc-600 text-xs ml-1">
                                    ({vehicle.name})
                                  </span>
                                )}
                              </p>
                            )}
                            {urgency && (
                              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', urgency.className)}>
                                {urgency.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-400">
                          {r.recurring ? (
                            <span className="inline-flex items-center gap-1 text-sky-400 text-xs">
                              <RotateCcw size={12} />
                              {r.recurring.charAt(0).toUpperCase() + r.recurring.slice(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">{t('reminders.one_time')}</span>
                          )}
                          {r.mileageInterval && (
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              +{r.mileageInterval.toLocaleString()} {distanceUnit}
                            </p>
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
                            {r.active ? t('common.active') : t('common.inactive')}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t('reminders.edit') : t('reminders.add')}
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? t('common.saving') : editingId ? t('common.update') : t('common.create')}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.title')}</label>
            <input
              type="text"
              value={form.title || ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('reminders.reminder_title')}
              className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.description')}</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('common.optional_details')}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.type')}</label>
              <select
                value={form.type || 'custom'}
                onChange={(e) => setForm({ ...form, type: e.target.value as Reminder['type'] })}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 appearance-none"
              >
                {REMINDER_TYPES.filter((rt) => rt.value).map((rt) => (
                  <option key={rt.value} value={rt.value}>{t(rt.i18nKey)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('reminders.recurring')}</label>
              <select
                value={form.recurring || ''}
                onChange={(e) => setForm({ ...form, recurring: e.target.value as Reminder['recurring'] })}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 appearance-none"
              >
                {RECURRING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{t(o.i18nKey)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Trigger / Metric Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('reminders.metric')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {METRIC_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, metric: opt.value as Reminder['metric'] })}
                  className={cn(
                    'flex items-center justify-center gap-2 h-10 rounded-lg text-xs font-medium transition-colors border',
                    formMetric === opt.value
                      ? 'bg-violet-500/15 border-violet-500/50 text-violet-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  )}
                >
                  <opt.icon size={14} />
                  {t(opt.i18nKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Date field */}
          {showDateField && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('reminders.remind_at')}</label>
              <input
                type="datetime-local"
                value={form.remindAt || ''}
                onChange={(e) => setForm({ ...form, remindAt: e.target.value })}
                className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
              />
            </div>
          )}

          {/* Mileage fields */}
          {showMileageFields && (
            <div className="space-y-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('common.vehicle')}</label>
                <select
                  value={form.vehicleId || ''}
                  onChange={(e) => setForm({ ...form, vehicleId: e.target.value || undefined })}
                  className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 appearance-none"
                >
                  <option value="">{t('reminders.select_vehicle')}</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name || `${v.brand} ${v.model}`} ({v.currentMileage?.toLocaleString()} {distanceUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">{t('reminders.target_mileage')}</label>
                <input
                  type="number"
                  value={form.targetMileage ?? ''}
                  onChange={(e) => setForm({ ...form, targetMileage: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g. 150000"
                  className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
                />
                {form.vehicleId && (() => {
                  const v = vehicles.find(veh => veh.id === form.vehicleId);
                  if (v) {
                    return (
                      <p className="text-xs text-zinc-600 mt-1">
                        Current: {v.currentMileage?.toLocaleString()} {distanceUnit}
                        {form.targetMileage ? ` / Remaining: ${(form.targetMileage - v.currentMileage).toLocaleString()} ${distanceUnit}` : ''}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Mileage interval for recurring */}
              {showMileageInterval && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">{t('reminders.mileage_interval')}</label>
                  <input
                    type="number"
                    value={form.mileageInterval ?? ''}
                    onChange={(e) => setForm({ ...form, mileageInterval: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder={`e.g. 15000 (repeat every X ${distanceUnit})`}
                    className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50"
                  />
                  <p className="text-xs text-zinc-600 mt-1">
                    {t('reminders.mileage_interval_hint')}
                  </p>
                </div>
              )}
            </div>
          )}

          {emailEnabled && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.emailNotify || false}
                onChange={(e) => setForm({ ...form, emailNotify: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
              />
              <span className="text-sm text-zinc-400">{t('reminders.email_notify')}</span>
            </label>
          )}

          {form.recurring && form.recurring !== '' && (
            <div className="flex items-start gap-3 cursor-pointer p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg">
              <input
                type="checkbox"
                checked={form.fixedInterval || false}
                onChange={(e) => setForm({ ...form, fixedInterval: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
                id="fixedInterval"
              />
              <label htmlFor="fixedInterval" className="cursor-pointer">
                <span className="text-sm text-zinc-300 font-medium">{t('reminders.fixed_interval') || 'Fixed Interval'}</span>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {t('reminders.fixed_interval_hint') || 'Prevents schedule drift when completing early. Next due date advances from the original due date + interval, not from today.'}
                </p>
              </label>
            </div>
          )}

          {/* Custom Urgency Thresholds */}
          <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.customThresholds}
                onChange={(e) => {
                  if (e.target.checked) {
                    setForm({ ...form, customThresholds: { urgentDays: 30, veryUrgentDays: 7, urgentDistance: 1000, veryUrgentDistance: 500 } });
                  } else {
                    setForm({ ...form, customThresholds: null });
                  }
                }}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
              />
              <div>
                <span className="text-sm text-zinc-300 font-medium">Custom Urgency Thresholds</span>
                <p className="text-xs text-zinc-500 mt-0.5">Override default urgency thresholds for this reminder.</p>
              </div>
            </label>

            {form.customThresholds && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Urgent (days)</label>
                  <input
                    type="number"
                    value={form.customThresholds.urgentDays ?? 30}
                    onChange={(e) => setForm({ ...form, customThresholds: { ...form.customThresholds!, urgentDays: Number(e.target.value) } })}
                    className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Very Urgent (days)</label>
                  <input
                    type="number"
                    value={form.customThresholds.veryUrgentDays ?? 7}
                    onChange={(e) => setForm({ ...form, customThresholds: { ...form.customThresholds!, veryUrgentDays: Number(e.target.value) } })}
                    className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Urgent ({distanceUnit})</label>
                  <input
                    type="number"
                    value={form.customThresholds.urgentDistance ?? 1000}
                    onChange={(e) => setForm({ ...form, customThresholds: { ...form.customThresholds!, urgentDistance: Number(e.target.value) } })}
                    className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Very Urgent ({distanceUnit})</label>
                  <input
                    type="number"
                    value={form.customThresholds.veryUrgentDistance ?? 500}
                    onChange={(e) => setForm({ ...form, customThresholds: { ...form.customThresholds!, veryUrgentDistance: Number(e.target.value) } })}
                    className="w-full h-9 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active !== false}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
            />
            <span className="text-sm text-zinc-400">{t('common.active')}</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
