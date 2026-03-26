import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Modal from '../Modal';
import TagInput from '../TagInput';
import { api } from '../../api';
import { formatCurrency, formatDate, formatNumber } from '../../utils';
import type { AppState, ServiceRecord, ServiceCategory } from '../../types';

const inputClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50';

const selectClass =
  'w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none';

const labelClass = 'block text-sm font-medium text-zinc-400 mb-2';

const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

const categoryOptions: { value: ServiceCategory; label: string }[] = [
  { value: 'oil', label: 'Oil' },
  { value: 'brakes', label: 'Brakes' },
  { value: 'filters', label: 'Filters' },
  { value: 'tires', label: 'Tires' },
  { value: 'fluids', label: 'Fluids' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'body', label: 'Body' },
  { value: 'other', label: 'Other' },
];

const categoryColors: Record<ServiceCategory, string> = {
  oil: 'bg-amber-500/20 text-amber-400',
  brakes: 'bg-red-500/20 text-red-400',
  filters: 'bg-blue-500/20 text-blue-400',
  tires: 'bg-zinc-500/20 text-zinc-300',
  fluids: 'bg-cyan-500/20 text-cyan-400',
  electrical: 'bg-yellow-500/20 text-yellow-400',
  body: 'bg-purple-500/20 text-purple-400',
  other: 'bg-zinc-600/20 text-zinc-400',
};

interface Props {
  vehicleId: string;
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  date: '',
  description: '',
  category: 'other' as ServiceCategory,
  mileage: 0,
  cost: 0,
  notes: '',
  tags: [] as string[],
};

export default function VehicleServicesTab({ vehicleId, state, setState }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const records = state.serviceRecords
    .filter((r) => r.vehicleId === vehicleId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalCost = records.reduce((s, r) => s + r.cost, 0);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (r: ServiceRecord) => {
    setForm({
      date: r.date,
      description: r.description,
      category: r.category,
      mileage: r.mileage,
      cost: r.cost,
      notes: r.notes,
      tags: r.tags || [],
    });
    setEditingId(r.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const updated = await api.updateService(editingId, { ...form, vehicleId });
        setState({ ...state, serviceRecords: state.serviceRecords.map((r) => (r.id === editingId ? updated : r)) });
      } else {
        const created = await api.createService({ ...form, vehicleId });
        setState({ ...state, serviceRecords: [...state.serviceRecords, created] });
      }
      setShowModal(false);
      setEditingId(null);
    } catch (e) {
      console.error('Failed to save service', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteService(id);
      setState({ ...state, serviceRecords: state.serviceRecords.filter((r) => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete service', e);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-400">
          {records.length} service{records.length !== 1 ? 's' : ''} &middot; Total: {formatCurrency(totalCost)}
        </p>
        <button
          onClick={openAdd}
          className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-500 text-sm">No services recorded yet.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Date</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Description</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Category</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Mileage</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Cost</th>
                  <th className="px-4 py-3.5 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">Tags</th>
                  <th className="px-4 py-3.5 text-right text-xs text-zinc-500 uppercase tracking-wider font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-zinc-50">{formatDate(r.date)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50 max-w-[200px] truncate">{r.description}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${categoryColors[r.category] || categoryColors.other}`}>
                        {categoryOptions.find((o) => o.value === r.category)?.label || r.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400 text-right">
                      {r.mileage ? `${formatNumber(r.mileage)} km` : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50 text-right">{formatCurrency(r.cost)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(r.tags || []).map((t, i) => (
                          <span key={i} className="bg-zinc-800 rounded-md px-2 py-0.5 text-xs text-zinc-300">{t}</span>
                        ))}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Edit Service' : 'Add Service'}
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
            <label className={labelClass}>Description</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Oil change"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={selectClass}
                style={{ backgroundImage: selectChevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}
              >
                {categoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Mileage (km)</label>
              <input
                type="number"
                className={inputClass}
                placeholder="0"
                value={form.mileage || ''}
                onChange={(e) => setForm({ ...form, mileage: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelClass}>Cost (EUR)</label>
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
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 min-h-[100px] resize-none"
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Tags</label>
            <TagInput tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
