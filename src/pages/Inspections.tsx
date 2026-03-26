import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import { formatCurrency, formatDate, formatNumber } from '../utils';
import { api } from '../api';
import type { AppState, Inspection, InspectionItem, InspectionResult } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyItem: InspectionItem = { name: '', result: 'pass', notes: '' };

const emptyForm = {
  vehicleId: '',
  date: '',
  title: '',
  mileage: 0,
  cost: 0,
  notes: '',
  items: [{ ...emptyItem }] as InspectionItem[],
};

function computeOverallResult(items: InspectionItem[]): string {
  if (items.length === 0) return 'pass';
  return items.some(i => i.result === 'fail') ? 'fail' : 'pass';
}

export default function Inspections({ state, setState }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Inspection | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterVehicle, setFilterVehicle] = useState('');

  const filtered = useMemo(() => {
    let items = [...state.inspections];
    if (filterVehicle) items = items.filter(r => r.vehicleId === filterVehicle);
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [state.inspections, filterVehicle]);

  const totalInspections = filtered.length;
  const passCount = filtered.filter(i => i.overallResult === 'pass').length;
  const passRate = totalInspections > 0 ? Math.round((passCount / totalInspections) * 100) : 0;
  const lastInspection = filtered.length > 0 ? filtered[0].date : null;

  const getVehicleName = (id: string) => state.vehicles.find(v => v.id === id)?.name || '-';

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      vehicleId: state.vehicles[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      items: [{ ...emptyItem }],
    });
    setModalOpen(true);
  };

  const openEdit = (inspection: Inspection) => {
    setEditing(inspection);
    setForm({
      vehicleId: inspection.vehicleId,
      date: inspection.date,
      title: inspection.title,
      mileage: inspection.mileage,
      cost: inspection.cost,
      notes: inspection.notes,
      items: inspection.items.length > 0 ? inspection.items.map(i => ({ ...i })) : [{ ...emptyItem }],
    });
    setModalOpen(true);
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index: number, field: keyof InspectionItem, value: string) => {
    const updated = form.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setForm({ ...form, items: updated });
  };

  const handleSave = async () => {
    if (!form.vehicleId || !form.title.trim()) return;
    const validItems = form.items.filter(i => i.name.trim());
    const overallResult = computeOverallResult(validItems);
    const payload = {
      vehicleId: form.vehicleId,
      date: form.date,
      title: form.title,
      mileage: form.mileage,
      cost: form.cost,
      notes: form.notes,
      items: validItems,
      overallResult,
    };
    try {
      if (editing) {
        const updated = await api.updateInspection(editing.id, payload);
        setState({ ...state, inspections: state.inspections.map(r => r.id === editing.id ? updated : r) });
      } else {
        const created = await api.createInspection(payload);
        setState({ ...state, inspections: [...state.inspections, created] });
      }
      setModalOpen(false);
    } catch (e) {
      console.error('Failed to save inspection', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteInspection(id);
      setState({ ...state, inspections: state.inspections.filter(r => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete inspection', e);
    }
  };

  const selectClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 outline-none focus:border-violet-500/50 appearance-none";
  const inputClasses = "w-full h-10 bg-zinc-950 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-violet-500/50";
  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 10px center`;

  const ResultBadge = ({ result }: { result: string }) => {
    if (result === 'pass') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium"><CheckCircle2 size={12} /> Pass</span>;
    if (result === 'fail') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium"><XCircle size={12} /> Fail</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-400 text-xs font-medium"><MinusCircle size={12} /> N/A</span>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Track vehicle inspections and their results.</p>
        <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
          <Plus size={16} />
          Add Inspection
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Inspections', value: String(totalInspections), color: 'text-violet-400' },
          { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? 'text-emerald-400' : 'text-amber-400' },
          { label: 'Last Inspection', value: lastInspection ? formatDate(lastInspection) : '-', color: 'text-sky-400' },
        ].map(s => (
          <div key={s.label}>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-400 mb-2">Vehicle</label>
            <select
              value={filterVehicle}
              onChange={e => setFilterVehicle(e.target.value)}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">All Vehicles</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950/50">
              <tr>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">Date</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">Vehicle</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">Title</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">Result</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Cost</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No inspections found. Add your first inspection to start tracking.
                  </td>
                </tr>
              ) : (
                filtered.map(inspection => (
                  <motion.tr
                    key={inspection.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{formatDate(inspection.date)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{getVehicleName(inspection.vehicleId)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">{inspection.title}</td>
                    <td className="px-4 py-3.5 text-sm"><ResultBadge result={inspection.overallResult} /></td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400 text-center">{inspection.items?.length || 0}</td>
                    <td className="px-4 py-3.5 text-sm text-red-400 font-medium text-center">{formatCurrency(inspection.cost)}</td>
                    <td className="px-4 py-3.5 text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(inspection)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(inspection.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
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
        title={editing ? 'Edit Inspection' : 'Add Inspection'}
        size="2xl"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? 'Save Changes' : 'Add Inspection'}
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
            <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Annual TUV Inspection"
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Mileage (km)</label>
              <input
                type="number"
                value={form.mileage || ''}
                onChange={e => setForm({ ...form, mileage: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={inputClasses}
              />
            </div>
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
          </div>

          {/* Inspection Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-zinc-400">Inspection Items</label>
              <button
                onClick={addItem}
                className="text-xs text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateItem(idx, 'name', e.target.value)}
                      placeholder="Item name"
                      className={inputClasses}
                    />
                  </div>
                  <div className="w-28">
                    <select
                      value={item.result}
                      onChange={e => updateItem(idx, 'result', e.target.value)}
                      className={selectClasses}
                      style={{ background: chevronBg }}
                    >
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                      <option value="na">N/A</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.notes}
                      onChange={e => updateItem(idx, 'notes', e.target.value)}
                      placeholder="Notes"
                      className={inputClasses}
                    />
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-zinc-500 hover:text-red-400 h-10 px-2 inline-flex items-center"
                    disabled={form.items.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            {/* Auto-calculated result preview */}
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
              Overall result: <ResultBadge result={computeOverallResult(form.items.filter(i => i.name.trim()))} />
            </div>
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
