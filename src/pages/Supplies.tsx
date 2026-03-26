import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, ArrowUpDown, Package, AlertCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils';
import { api } from '../api';
import type { AppState, Supply } from '../types';

interface Props {
  state: AppState;
  setState: (s: AppState) => void;
}

const emptyForm = {
  vehicleId: '' as string | null,
  name: '',
  partNumber: '',
  quantity: 0,
  unitCost: 0,
  description: '',
  notes: '',
  tags: '',
};

type SortKey = 'name' | 'partNumber' | 'quantity' | 'unitCost';
type FilterMode = 'all' | 'shop' | 'vehicle';

export default function Supplies({ state, setState }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supply | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let items = [...state.supplies];
    if (filterMode === 'shop') items = items.filter(s => !s.vehicleId);
    if (filterMode === 'vehicle') items = items.filter(s => !!s.vehicleId);
    return items;
  }, [state.supplies, filterMode]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'partNumber': cmp = (a.partNumber || '').localeCompare(b.partNumber || ''); break;
        case 'quantity': cmp = a.quantity - b.quantity; break;
        case 'unitCost': cmp = a.unitCost - b.unitCost; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortAsc]);

  const totalItems = filtered.length;
  const totalValue = filtered.reduce((s, r) => s + r.quantity * r.unitCost, 0);
  const lowStockCount = filtered.filter(r => r.quantity <= 2).length;

  const getVehicleName = (id: string | null) => {
    if (!id) return 'Shop';
    return state.vehicles.find(v => v.id === id)?.name || '-';
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (supply: Supply) => {
    setEditing(supply);
    setForm({
      vehicleId: supply.vehicleId,
      name: supply.name,
      partNumber: supply.partNumber,
      quantity: supply.quantity,
      unitCost: supply.unitCost,
      description: supply.description,
      notes: supply.notes,
      tags: (supply.tags || []).join(', '),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      vehicleId: form.vehicleId || null,
      name: form.name,
      partNumber: form.partNumber,
      quantity: form.quantity,
      unitCost: form.unitCost,
      description: form.description,
      notes: form.notes,
      tags,
    };
    try {
      if (editing) {
        const updated = await api.updateSupply(editing.id, payload);
        setState({ ...state, supplies: state.supplies.map(r => r.id === editing.id ? updated : r) });
      } else {
        const created = await api.createSupply(payload);
        setState({ ...state, supplies: [...state.supplies, created] });
      }
      setModalOpen(false);
    } catch (e) {
      console.error('Failed to save supply', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSupply(id);
      setState({ ...state, supplies: state.supplies.filter(r => r.id !== id) });
    } catch (e) {
      console.error('Failed to delete supply', e);
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
        <p className="text-sm text-zinc-400">Manage parts, supplies, and inventory for your vehicles and shop.</p>
        <button onClick={openAdd} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium inline-flex items-center gap-2">
          <Plus size={16} />
          Add Supply
        </button>
      </div>

      {/* Toggle + Stats */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Toggle */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 inline-flex self-start">
          {(['all', 'shop', 'vehicle'] as FilterMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={cn(
                'rounded-lg h-9 px-4 text-sm transition-colors',
                filterMode === mode ? 'bg-violet-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {mode === 'all' ? 'All' : mode === 'shop' ? 'Shop Supplies' : 'Vehicle-specific'}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-8 items-center">
          {[
            { label: 'Total Items', value: String(totalItems), color: 'text-violet-400' },
            { label: 'Total Value', value: formatCurrency(totalValue), color: 'text-sky-400' },
            { label: 'Low Stock', value: String(lowStockCount), color: lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={cn('text-2xl font-semibold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-950/50">
              <tr>
                <SortHeader label="Name" col="name" />
                <SortHeader label="Part Number" col="partNumber" />
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-left">Vehicle</th>
                <SortHeader label="Quantity" col="quantity" />
                <SortHeader label="Unit Cost" col="unitCost" />
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Total Value</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Tags</th>
                <th className="px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No supplies found. Add your first supply to start tracking inventory.
                  </td>
                </tr>
              ) : (
                sorted.map(supply => (
                  <motion.tr
                    key={supply.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-sm text-zinc-50 font-medium">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-zinc-500 flex-shrink-0" />
                        {supply.name}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400 font-mono">{supply.partNumber || '-'}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{getVehicleName(supply.vehicleId)}</td>
                    <td className="px-4 py-3.5 text-sm text-center">
                      <span className={cn(
                        'font-medium',
                        supply.quantity <= 2 ? 'text-amber-400' : 'text-zinc-50'
                      )}>
                        {supply.quantity <= 2 && <AlertCircle size={12} className="inline mr-1" />}
                        {supply.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400 text-center">{formatCurrency(supply.unitCost)}</td>
                    <td className="px-4 py-3.5 text-sm text-sky-400 font-medium text-center">{formatCurrency(supply.quantity * supply.unitCost)}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {(supply.tags || []).map(tag => (
                          <span key={tag} className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(supply)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(supply.id)} className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg h-9 px-3 text-sm inline-flex items-center">
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
        title={editing ? 'Edit Supply' : 'Add Supply'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg h-10 px-4 text-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="bg-violet-500 hover:bg-violet-400 text-white rounded-lg h-10 px-5 text-sm font-medium">
              {editing ? 'Save Changes' : 'Add Supply'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Oil filter"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Part Number</label>
              <input
                type="text"
                value={form.partNumber}
                onChange={e => setForm({ ...form, partNumber: e.target.value })}
                placeholder="e.g. OC 456"
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Vehicle (optional - leave empty for shop supply)</label>
            <select
              value={form.vehicleId || ''}
              onChange={e => setForm({ ...form, vehicleId: e.target.value || null })}
              className={selectClasses}
              style={{ background: chevronBg }}
            >
              <option value="">None (Shop Supply)</option>
              {state.vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Quantity</label>
              <input
                type="number"
                value={form.quantity || ''}
                onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Unit Cost</label>
              <input
                type="number"
                step="0.01"
                value={form.unitCost || ''}
                onChange={e => setForm({ ...form, unitCost: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
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
              placeholder="Brief description"
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. oil, filter, maintenance"
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
