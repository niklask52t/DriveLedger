import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowUpDown, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import { formatCurrency, formatDate } from '../utils';
import { api } from '../api';
import type { AppState, TaxRecord } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  vehicleId: '',
  date: '',
  description: '',
  cost: 0,
  isRecurring: false,
  recurringInterval: '',
  dueDate: '',
  notes: '',
  tags: '',
};

type SortKey = 'date' | 'description' | 'cost' | 'dueDate';

export default function Taxes({ state, setState }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const isOverdue = (record: TaxRecord) => record.dueDate && record.dueDate < today;

  const sorted = useMemo(() => {
    const arr = [...state.taxRecords];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'description': cmp = a.description.localeCompare(b.description); break;
        case 'cost': cmp = a.cost - b.cost; break;
        case 'dueDate': cmp = (a.dueDate || '').localeCompare(b.dueDate || ''); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [state.taxRecords, sortKey, sortAsc]);

  const totalTaxPaid = state.taxRecords.reduce((s, r) => s + r.cost, 0);
  const recurringCount = state.taxRecords.filter(r => r.isRecurring).length;
  const overdueCount = state.taxRecords.filter(r => isOverdue(r)).length;

  const getVehicleName = (id: string) => state.vehicles.find(v => v.id === id)?.name || '-';

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'description'); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, vehicleId: state.vehicles[0]?.id || '', date: today });
    setModalOpen(true);
  };

  const openEdit = (record: TaxRecord) => {
    setEditing(record);
    setForm({
      vehicleId: record.vehicleId,
      date: record.date,
      description: record.description,
      cost: record.cost,
      isRecurring: record.isRecurring,
      recurringInterval: record.recurringInterval,
      dueDate: record.dueDate,
      notes: record.notes,
      tags: (record.tags || []).join(', '),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.vehicleId || !form.description.trim()) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      vehicleId: form.vehicleId,
      date: form.date,
      description: form.description,
      cost: form.cost,
      isRecurring: form.isRecurring,
      recurringInterval: form.isRecurring ? form.recurringInterval : '',
      dueDate: form.dueDate,
      notes: form.notes,
      tags,
    };
    try {
      if (editing) {
        const updated = await api.updateTaxRecord(editing.id, payload);
        setState({ ...state, taxRecords: state.taxRecords.map(r => r.id === editing.id ? updated : r) });
      } else {
        const created = await api.createTaxRecord(payload);
        setState({ ...state, taxRecords: [...state.taxRecords, created] });
      }
      setModalOpen(false);
    } catch (e) {
      console.error('Failed to save tax record', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTaxRecord(id);
      setState({ ...state, taxRecords: state.taxRecords.filter(r => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete tax record', e);
    }
  };

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const inputClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider cursor-pointer select-none"
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={cn(sortKey === col ? 'text-violet-400' : 'text-zinc-600')} />
      </span>
    </th>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Track vehicle taxes, fees, and recurring payments.</p>
        <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
          <Plus size={16} />
          Add Tax
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Tax Paid', value: formatCurrency(totalTaxPaid), color: 'text-red-400' },
          { label: 'Recurring', value: String(recurringCount), color: 'text-violet-400' },
          { label: 'Overdue', value: String(overdueCount), color: overdueCount > 0 ? 'text-red-400' : 'text-emerald-400' },
        ].map(s => (
          <div key={s.label}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950/50">
              <tr>
                <SortHeader label="Date" col="date" />
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">Vehicle</th>
                <SortHeader label="Description" col="description" />
                <SortHeader label="Cost" col="cost" />
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Recurring?</th>
                <SortHeader label="Due Date" col="dueDate" />
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Tags</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No tax records found. Add your first tax record to start tracking.
                  </td>
                </tr>
              ) : (
                sorted.map(record => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      'border-b border-zinc-800/50 transition-colors',
                      isOverdue(record) ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-zinc-800/30'
                    )}
                  >
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{formatDate(record.date)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{getVehicleName(record.vehicleId)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">
                      <div className="flex items-center gap-2">
                        {isOverdue(record) && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                        {record.description}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-red-400 font-medium">{formatCurrency(record.cost)}</td>
                    <td className="px-4 py-3.5 text-sm text-center">
                      {record.isRecurring ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 text-xs capitalize">
                          {record.recurringInterval || 'Yes'}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">
                      {record.dueDate ? (
                        <span className={cn(isOverdue(record) && 'text-red-400 font-medium')}>
                          {formatDate(record.dueDate)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {(record.tags || []).map(tag => (
                          <span key={tag} className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(record)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(record.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Tax Record' : 'Add Tax Record'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? 'Save Changes' : 'Add Tax Record'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Vehicle</label>
              <select
                value={form.vehicleId}
                onChange={e => setForm({ ...form, vehicleId: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">Select vehicle</option>
                {state.vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Annual vehicle tax"
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Cost</label>
              <input
                type="number"
                step="0.01"
                value={form.cost || ''}
                onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={e => setForm({ ...form, isRecurring: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500/50"
            />
            <span className="text-sm text-zinc-400">Recurring payment</span>
          </div>

          {form.isRecurring && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Recurring Interval</label>
              <select
                value={form.recurringInterval}
                onChange={e => setForm({ ...form, recurringInterval: e.target.value })}
                className={selectClasses}
                style={{ background: chevronBg }}
              >
                <option value="">Select interval</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. kfz-steuer, 2024"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              className="w-full min-h-[80px] h-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
