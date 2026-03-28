import { useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../Modal';
import TagInput from '../TagInput';
import { api } from '../../api';
import { formatCurrency, formatDate } from '../../utils';
import { useI18n } from '../../contexts/I18nContext';
import type { AppState, TaxRecord } from '../../types';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const selectClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

const intervalOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

interface Props {
  vehicleId: string;
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  date: '',
  description: '',
  cost: 0,
  isRecurring: false,
  recurringInterval: '',
  dueDate: '',
  notes: '',
  tags: [] as string[],
};

function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export default function VehicleTaxesTab({ vehicleId, state, setState }: Props) {
  const { t } = useI18n();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const records = state.taxRecords
    .filter((r) => r.vehicleId === vehicleId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalCost = records.reduce((s, r) => s + r.cost, 0);
  const overdueCount = records.filter((r) => isOverdue(r.dueDate)).length;

  const openAdd = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (r: TaxRecord) => {
    setForm({
      date: r.date,
      description: r.description,
      cost: r.cost,
      isRecurring: r.isRecurring,
      recurringInterval: r.recurringInterval,
      dueDate: r.dueDate,
      notes: r.notes,
      tags: r.tags || [],
    });
    setEditingId(r.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const updated = await api.updateTaxRecord(editingId, { ...form, vehicleId });
        setState({ ...state, taxRecords: state.taxRecords.map((r) => (r.id === editingId ? updated : r)) });
      } else {
        const created = await api.createTaxRecord({ ...form, vehicleId });
        setState({ ...state, taxRecords: [...state.taxRecords, created] });
      }
      setShowModal(false);
      setEditingId(null);
    } catch (e) {
      console.error('Failed to save tax record', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTaxRecord(id);
      setState({ ...state, taxRecords: state.taxRecords.filter((r) => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete tax record', e);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-400">
            {t("vehicle_tab.taxes.count", { count: records.length })} &middot; Total: {formatCurrency(totalCost)}
          </p>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md">
              <AlertTriangle size={12} />
              {t("vehicle_tab.taxes.overdue_count", { count: overdueCount })}
            </span>
          )}
        </div>
        <button
          onClick={openAdd}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Tax
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">{t("vehicle_tab.taxes.no_taxes")}</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.date")}</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.description")}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.cost")}</th>
                  <th className="px-4 py-3.5 text-center text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("vehicle_tab.taxes.recurring")}?</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.due_date")}</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const overdue = isOverdue(r.dueDate);
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-zinc-800/50 transition-colors ${overdue ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-zinc-800/30'}`}
                    >
                      <td className="px-4 py-3.5 text-sm text-zinc-50">{formatDate(r.date)}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 max-w-[250px] truncate">{r.description}</td>
                      <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(r.cost)}</td>
                      <td className="px-4 py-3.5 text-center">
                        {r.isRecurring ? (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md">
                            {intervalOptions.find((o) => o.value === r.recurringInterval)?.label || r.recurringInterval || 'Yes'}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-600">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        <div className="flex items-center gap-2">
                          {overdue && <AlertTriangle size={14} className="text-red-400 shrink-0" />}
                          <span className={overdue ? 'text-red-400 font-medium' : 'text-zinc-400'}>
                            {r.dueDate ? formatDate(r.dueDate) : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          {deleteConfirm === r.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { handleDelete(r.id); setDeleteConfirm(null); }}
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
                              onClick={() => setDeleteConfirm(r.id)}
                              className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center transition-colors"
                            >
                              <Trash2 size={14} />
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

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? t("vehicle_tab.taxes.edit") : t("vehicle_tab.taxes.add")}
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
              {editingId ? t("common.update") : t("common.add")}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className={labelClass}>{t("common.description")}</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Vehicle tax 2025"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("common.date")}</label>
              <input
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>{t("common.cost")} (EUR)</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="0.00"
                value={form.cost || ''}
                onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/30"
                checked={form.isRecurring}
                onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
              />
              <span className="text-sm text-zinc-300">{t("vehicle_tab.taxes.recurring")}</span>
            </label>
          </div>
          {form.isRecurring && (
            <div>
              <label className={labelClass}>{t("taxes.interval")}</label>
              <select
                className={selectClass}
                style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
                value={form.recurringInterval}
                onChange={(e) => setForm({ ...form, recurringInterval: e.target.value })}
              >
                <option value="">Select interval...</option>
                {intervalOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>{t("common.due_date")}</label>
            <input
              type="date"
              className={inputClass}
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>{t("common.notes")}</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[80px] resize-none"
              placeholder={t("common.optional_notes")}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>{t("common.tags")}</label>
            <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
